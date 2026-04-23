# Carousel — Claude Code Context

## What this is

A 3D carousel of UI cards anchored in world space via `drei`'s `<Html transform>`.
On swipe, the active card **appears** to shatter into Voronoi shards. This is achieved
via an impostor swap — the DOM element is never directly shattered.

See root `.claude/rules/main.md` for thread model and general rules.

---

## The impostor swap — core concept

`drei`'s `<Html>` renders a DOM `div` that cannot receive vertex shader effects.
The shard animation works by:

1. Snapshotting the DOM panel with `html2canvas` → canvas texture
2. Hiding the `<Html>` div (opacity 0, pointer-events none — **do not unmount**)
3. Replacing it visually with a `PlaneGeometry` + `ShardMaterial` carrying the snapshot texture
4. Running the shard vertex shader on the plane mesh
5. Fading in the next card's `<Html>` div in parallel
6. Disposing the impostor mesh and snapshot texture after animation completes

The user cannot perceive the swap. Total hidden duration: ~1 frame.

---

## State machine

```
IDLE
  → on pointerdown/touchstart: fire html2canvas speculatively (async, non-blocking)
  → texture uploads while user may still cancel

CAPTURE
  → html2canvas running
  → if swipe abandoned before texture ready: discard texture, stay IDLE

IMPOSTOR_ACTIVE
  → texture ready, swap executed
  → Html div: opacity: 0, pointerEvents: 'none'
  → PlaneGeometry impostor rendered at same world position
  → awaiting velocity threshold

SHATTER
  → uProgress animates 0 → 1 over ~300ms (eased)
  → uSwipeDir set from normalised swipe vector
  → uSeed randomised per transition
  → on complete: dispose impostor geometry + material + texture

NEXT_INCOMING
  → runs in parallel with SHATTER
  → new Html div animates in (Framer motion opacity/transform only)
  → on complete: state → IDLE
```

State lives in `useCarouselStore` (zustand). Never use React `useState` for this —
the transitions cross component boundaries.

---

## Impostor geometry setup

Create geometry **once at mount**, not per transition. Pre-bake Voronoi cell attributes.

```typescript
// src/components/ui/Carousel/useShardGeometry.ts

import { useMemo } from 'react'
import * as THREE from 'three'

const SEGMENTS = 80        // 80×80 plane subdivisions
const CELL_COUNT = 18      // number of Voronoi shards

export function useShardGeometry(width: number, height: number) {
  return useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, height, SEGMENTS, SEGMENTS)
    const vertexCount = geo.attributes.position.count

    // Generate Voronoi seed points (Lloyd-relaxed for even distribution)
    const seeds = lloydRelax(CELL_COUNT, 3) // 3 iterations

    // Assign each vertex to nearest seed
    const cellIds   = new Float32Array(vertexCount)
    const cellCenters = new Float32Array(vertexCount * 3)
    const pos = geo.attributes.position

    for (let i = 0; i < vertexCount; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      let nearest = 0, minDist = Infinity

      for (let s = 0; s < seeds.length; s++) {
        const dx = x - seeds[s].x * width
        const dy = y - seeds[s].y * height
        const d  = dx * dx + dy * dy
        if (d < minDist) { minDist = d; nearest = s }
      }

      cellIds[i] = nearest / CELL_COUNT  // normalise to 0-1
      cellCenters[i * 3]     = seeds[nearest].x * width
      cellCenters[i * 3 + 1] = seeds[nearest].y * height
      cellCenters[i * 3 + 2] = 0
    }

    geo.setAttribute('aCellId',     new THREE.BufferAttribute(cellIds, 1))
    geo.setAttribute('aCellCenter', new THREE.BufferAttribute(cellCenters, 3))

    return geo
  }, [width, height])
}
```

---

## ShardMaterial — uniforms reference

```typescript
// All uniforms that must be set before each transition
{
  uProgress:   { value: 0 },           // Float, 0→1, driven by eased animation
  uSwipeDir:   { value: new THREE.Vector2() }, // Normalised swipe direction
  uSeed:       { value: Math.random() },       // Randomised per transition
  uTime:       { value: 0 },           // Elapsed seconds (from useFrame clock)
  uSnapshot:   { value: null },        // THREE.CanvasTexture from html2canvas
}
```

---

## Vertex shader — key logic

File: `src/components/Three/Shaders/glsl/shard.vert`

```glsl
uniform float uProgress;
uniform float uSeed;
uniform vec2  uSwipeDir;

attribute float aCellId;
attribute vec3  aCellCenter;

varying vec2 vUv;

void main() {
  vUv = uv;

  // Per-shard stagger using golden ratio distribution
  float delay  = fract(aCellId * 0.61803 + uSeed) * 0.3;
  float tLocal = clamp((uProgress - delay) / (1.0 - delay), 0.0, 1.0);
  float ease   = tLocal * tLocal * (3.0 - 2.0 * tLocal); // smoothstep

  // Translation: swipe direction + radial from cell center
  vec3 offset  = vec3(uSwipeDir * ease * 2.0, 0.0);
  offset.xy   += (position.xy - aCellCenter.xy) * ease * 0.4;

  // Per-shard rotation around cell center
  float angle = ease * (aCellId - 0.5) * 6.28318;
  float c = cos(angle), s = sin(angle);
  vec3 centered = position - aCellCenter;
  vec3 rotated  = vec3(
    centered.x * c - centered.y * s,
    centered.x * s + centered.y * c,
    centered.z
  );

  gl_Position = projectionMatrix * modelViewMatrix *
                vec4(aCellCenter + rotated + offset, 1.0);
}
```

---

## Fragment shader — key logic

File: `src/components/Three/Shaders/glsl/shard.frag`

```glsl
uniform float     uProgress;
uniform vec2      uSwipeDir;
uniform sampler2D uSnapshot;

varying vec2 vUv;

void main() {
  // Chromatic aberration grows with progress
  float aberration = uProgress * 0.012;
  float r = texture2D(uSnapshot, vUv + uSwipeDir * aberration).r;
  float g = texture2D(uSnapshot, vUv).g;
  float b = texture2D(uSnapshot, vUv - uSwipeDir * aberration).b;

  // Fade out in the latter half of the animation
  float alpha = 1.0 - smoothstep(0.55, 1.0, uProgress);

  gl_FragColor = vec4(r, g, b, alpha);
}
```

---

## html2canvas — speculative capture pattern

```typescript
// Fire on pointerdown, before swipe is confirmed
const captureRef = useRef<Promise<HTMLCanvasElement> | null>(null)
const textureRef = useRef<THREE.CanvasTexture | null>(null)

const onPointerDown = () => {
  captureRef.current = html2canvas(htmlPanelRef.current!, {
    backgroundColor: null,
    scale: window.devicePixelRatio,
  }).then(canvas => {
    textureRef.current = new THREE.CanvasTexture(canvas)
    textureRef.current.needsUpdate = true
    return canvas
  })
}

const onSwipeConfirmed = async (dir: THREE.Vector2) => {
  await captureRef.current  // usually already resolved
  // texture is ready — execute swap
  executeImpostorSwap(textureRef.current!, dir)
}

const onSwipeAbandoned = () => {
  textureRef.current?.dispose()
  textureRef.current = null
  captureRef.current = null
}
```

---

## Disposal — mandatory on transition complete

```typescript
const disposeImpostor = () => {
  shardMesh.geometry.dispose()       // keep the pre-baked shard geo alive — only dispose snapshot-specific resources
  shardMaterial.dispose()
  textureRef.current?.dispose()
  textureRef.current = null
  scene.remove(shardMesh)
}
```

Note: the pre-baked `PlaneGeometry` with Voronoi attributes is **reused** across transitions.
Only the `CanvasTexture` (snapshot) is created and disposed per transition.

---

## Framer Motion — incoming card animation

The incoming card uses Framer Motion for its entrance. Variants must only use
`transform` and `opacity` — no layout-triggering properties.

```typescript
const cardVariants = {
  hidden:  { opacity: 0, rotateY: -15, translateZ: -80 },
  visible: { opacity: 1, rotateY: 0,   translateZ: 0,
             transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
}
```

This runs in parallel with the shard exit — `AnimatePresence` handles the overlap.

---

## Files in this directory

```
src/components/ui/Carousel/
  CarouselRoot.tsx        # Zustand store consumer, manages active index
  CarouselCard.tsx        # Single card: drei Html + impostor mesh logic
  ShardMesh.tsx           # The impostor PlaneGeometry + ShardMaterial
  useCarouselStore.ts     # Zustand store: state machine + transition actions
  useShardGeometry.ts     # Memoised Voronoi-attributed PlaneGeometry
  useSwipeDetection.ts    # Pointer/touch velocity tracking, threshold detection
  CLAUDE.md               # This file
```
