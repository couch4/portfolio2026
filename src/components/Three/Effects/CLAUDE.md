# Effects (Postprocessing) — Claude Code Context

## Stack overview

Uses `@react-three/postprocessing` (React wrapper) over `postprocessing` (pmndrs).
All effects run in a single `<EffectComposer>` in a single pass where possible.
Effect order matters — see pipeline below.

---

## Effect pipeline (in render order)

```
1. SSAO / GTAO          — ambient occlusion, tier-gated
2. SSR                  — screen-space reflections (water surface), high+ only
3. God rays             — sun shaft occlusion, high+ only
4. Bloom                — MipMap bloom (pmndrs BloomEffect), all tiers
5. Chromatic aberration — subtle, always-on (very low intensity baseline)
6. Vignette             — always-on
7. Tonemapping          — ACESFilmic, always-on
8. TAA / SMAA           — temporal AA (WebGPU) or SMAA (WebGL fallback)
```

Order rationale:
- AO before bloom: so AO darkening doesn't get amplified by bloom
- SSR before bloom: reflections should contribute to bloom on water
- Tonemapping after bloom: prevents bloom clipping in HDR
- AA always last: anti-aliases the final tonemapped output

---

## Component structure

```tsx
// src/components/Three/Effects/PostStack.tsx
import { EffectComposer, Bloom, Vignette, ChromaticAberration,
         ToneMapping, SMAA, SSAO } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { useQualityStore } from '@/store/qualityStore'
import { GodRaysEffect } from './GodRaysEffect'
import { GTAOEffect }    from './GTAOEffect'
import { SSREffect }     from './SSREffect'

export function PostStack() {
  const tier = useQualityStore(s => s.tier)

  return (
    <EffectComposer multisampling={0} frameBufferType={HalfFloatType}>
      {/* AO — tier gated */}
      {tier === 'ultra' || tier === 'high'
        ? <GTAOEffect />
        : tier === 'medium' ? <SSAO intensity={0.4} /> : null
      }

      {/* SSR — water reflections, high+ only */}
      {(tier === 'ultra' || tier === 'high') && <SSREffect />}

      {/* God rays — high+ only */}
      {(tier === 'ultra' || tier === 'high') && <GodRaysEffect />}

      {/* Always-on */}
      <Bloom
        luminanceThreshold={0.9}
        luminanceSmoothing={0.025}
        mipmapBlur
        intensity={0.4}
      />
      <ChromaticAberration offset={[0.0003, 0.0003]} />
      <Vignette eskil={false} offset={0.1} darkness={0.5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />

      {/* AA — TAA on WebGPU, SMAA on WebGL */}
      <SMAA />
    </EffectComposer>
  )
}
```

---

## Bloom configuration

Use `mipmapBlur` — this is the pmndrs MipMap bloom, significantly cheaper than
the legacy Gaussian blur approach and more physically accurate.

```tsx
<Bloom
  luminanceThreshold={0.9}   // only pixels above this HDR value bloom
  luminanceSmoothing={0.025} // soft knee
  mipmapBlur                 // REQUIRED — use mipmap-based blur
  intensity={0.4}            // keep low for subtle alpine feel
  radius={0.4}               // mip chain radius
/>
```

Do not increase `intensity` above 0.6 — the alpine scene should feel crisp,
not like a lens flare demo.

---

## GTAO (Ground Truth Ambient Occlusion)

Custom effect wrapping the GTAO pass from `three-stdlib` or a custom TSL compute shader.

```typescript
// src/components/Three/Effects/GTAOEffect.ts
// Uniforms:
//   uRadius:    0.5   — AO sample radius in world units
//   uBias:      0.025 — prevents self-occlusion
//   uIntensity: 0.7
//   uSamples:   32    — ultra: 32, high: 16
```

GTAO is expensive. Gate it strictly:
- Ultra: 32 samples
- High:  16 samples
- Medium: use pmndrs `<SSAO>` with 8 samples instead
- Low: disabled entirely

---

## SSR (Screen-Space Reflections)

Applied to the water plane only via a stencil mask.
The water mesh writes stencil value `1`. The SSR effect reads only stencil `1`.

```typescript
// src/components/Three/Effects/SSREffect.ts
// Key settings:
//   maxDistance:     5.0   — max reflection ray length
//   thickness:       0.1   — depth tolerance
//   ior:             1.33  — water IOR for Fresnel
//   blend:           0.9   — mix with water base colour
```

SSR has a hard dependency on a depth buffer. Ensure `<EffectComposer depthBuffer>` is set.

---

## God rays

Sun occlusion mask rendered from scene depth, then raymarch toward sun disc.

```typescript
// src/components/Three/Effects/GodRaysEffect.ts
// The sun position uniform is read from skyParams (Worker 3 SAB output)
// Updated every frame via useFrame — cheap uniform set, no CPU march
//
// uSunPosition: vec2 (screen-space sun position, projected each frame)
// uDensity:     0.96
// uDecay:       0.94
// uWeight:      0.4
// uExposure:    0.2
// uSamples:     80   — ultra, 40 for high
```

God rays are disabled when the sun is below the horizon or behind the camera.
Check dot(sunDir, cameraForward) before enabling the pass each frame.

---

## Dynamic resolution scaling

Implemented in `src/components/Three/Effects/useDynamicResolution.ts`.

```typescript
const SAMPLE_WINDOW = 3  // consecutive frames over budget before scaling

export function useDynamicResolution() {
  const overBudgetFrames = useRef(0)
  const currentScale     = useRef(1.0)
  const { gl }           = useThree()

  useFrame(({ clock }) => {
    const frameMs = clock.getDelta() * 1000

    if (frameMs > 20) {           // over 20ms = under 50fps
      overBudgetFrames.current++
      if (overBudgetFrames.current >= SAMPLE_WINDOW) {
        currentScale.current = Math.max(0.5, currentScale.current - 0.1)
        gl.setPixelRatio(window.devicePixelRatio * currentScale.current)
        overBudgetFrames.current = 0
      }
    } else if (frameMs < 14) {   // under 14ms = headroom to recover
      overBudgetFrames.current = 0
      currentScale.current = Math.min(1.0, currentScale.current + 0.05)
      gl.setPixelRatio(window.devicePixelRatio * currentScale.current)
    }
  })
}
```

---

## Point cloud mode interaction

When point cloud mode is active (`usePointCloud().active === true`):
- Disable SSR (no surface normals for reflection)
- Disable GTAO (no meaningful occlusion in point clouds)
- Keep Bloom, Vignette, Tonemapping
- Reduce bloom intensity to 0.2 (point cloud bloom is more aggressive)
- Chromatic aberration increase to [0.001, 0.001] (stylistic choice for the mode)

The `PostStack` should subscribe to `usePointCloud` from `src/hooks/usePointCloud.ts`
and adjust accordingly.

---

## Rules

- `multisampling={0}` on `<EffectComposer>` — we handle AA via SMAA/TAA as a pass, not MSAA
- `frameBufferType={HalfFloatType}` — HDR pipeline, required for bloom not to clip
- Never add a new effect without profiling its ms cost with `r3f-perf` first
- Effects that read the depth buffer require `<EffectComposer depthBuffer>` prop
- God rays and SSR have significant fill-rate cost — always tier-gate them
