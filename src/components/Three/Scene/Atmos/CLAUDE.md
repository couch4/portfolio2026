# Atmosphere — Claude Code Context

## Overview

The atmosphere system covers: physically-based sky (Bruneton model), volumetric clouds,
god ray occlusion mesh, and IBL environment probe updates. Heavy computation lives in
`Worker 3` (see `src/components/Three/Workers/CLAUDE.md`). The scene components only consume pre-baked
textures and update uniforms.

---

## Bruneton sky model

Reference: "Precomputed Atmospheric Scattering" — Bruneton & Neyret 2008.

### LUT textures (baked once in Worker 3 at startup)

| Texture | Size | Format | Contents |
|---|---|---|---|
| `transmittanceLUT` | 256×64 | RGBA16F | Transmittance T(x, v) |
| `scatteringLUT`    | 32×32×32 packed as 512×128 atlas | RGBA16F | Rayleigh + Mie combined |
| `irradianceLUT`    | 64×16 | RGBA16F | Ground irradiance |

These are created once, transferred from Worker 3 via `postMessage` (ArrayBuffer transfer),
then uploaded to GPU as `DataTexture`. They do not change unless time-of-day changes
significantly (>1 hour step) — in that case Worker 3 rebakes and sends new buffers.

### Runtime sky shader (GPU only)

The sky dome is a large sphere rendered with depth write disabled.
The shader performs a single-sample lookup into the LUT textures — no per-frame CPU cost.

```glsl
// src/components/Three/Shaders/glsl/sky.frag (key logic)
uniform sampler2D uTransmittanceLUT;
uniform sampler2D uScatteringLUT;   // packed 3D atlas
uniform vec3      uSunDirection;    // from skyParams SAB
uniform float     uSunIntensity;
uniform float     uAtmosphereDensity;

// Sample transmittance LUT for sun colour at horizon
vec3 sunTransmittance = texture2D(uTransmittanceLUT, uvForView(rayDir, uSunDirection)).rgb;

// Sample scattering LUT for sky colour
vec3 skyColour = sampleScatteringLUT(uScatteringLUT, rayDir, uSunDirection);
```

---

## Volumetric clouds (high/ultra tier)

Clouds are raymarched in a fragment shader over a full-screen quad in a pre-pass,
outputting to a half-resolution render target. The result is composited into the main
scene before postprocessing.

### Cloud SDF (from Worker 3)

Worker 3 precomputes cloud density on a 64×64×32 3D texture (updated ~4× per second).
This drives the raymarcher's empty-space skipping — the raymarch samples the SDF first
and skips empty regions.

```typescript
// Cloud uniforms set from skyParams + dedicated cloud texture
{
  uCloudDensityTex: DataTexture3D,   // from Worker 3
  uCloudCoverage:   Float,           // skyParams[7]
  uCloudBase:       Float,           // 1800m
  uCloudTop:        Float,           // 4200m
  uWindOffset:      Vector2,         // animated by uTime * windSpeed
  uSunDir:          Vector3,
  uSunColor:        Vector3,
}
```

### Raymarch settings by tier

| Tier | Steps | Shadow steps | Resolution |
|---|---|---|---|
| Ultra | 128 | 6 | 0.5× |
| High  | 64  | 4 | 0.5× |
| Medium | — | — | Billboard sprite |
| Low   | — | — | Skybox baked |

### Upscaling

The half-res cloud render target is upscaled with a temporal reprojection filter
before compositing. Reprojection matrix from previous frame is kept in a uniform.
This prevents the "cloud crawl" aliasing visible in naive bilinear upscale.

---

## IBL environment probe

Used for PBR material reflections on the terrain, rocks, and water.

- A `PMREMGenerator` probe is rendered at startup from the sky dome
- Probe is re-rendered when time-of-day changes significantly (triggered by Worker 3 message)
- Re-render is scheduled over multiple frames to avoid a single-frame spike:
  each face of the cubemap renders on a separate frame

```typescript
// src/components/Three/Scene/Atmos/useIBLProbe.ts
export function useIBLProbe() {
  const { gl, scene } = useThree()
  const pmrem = useMemo(() => new THREE.PMREMGenerator(gl), [gl])

  // Render one cubemap face per frame across 6 frames
  const updateProbe = useCallback(() => {
    scheduleMultiFrameRender(pmrem, scene, 6)
  }, [pmrem, scene])

  // Worker 3 triggers probe updates on significant time-of-day change
  useWorkerMessage('atmosphere', 'TIME_CHANGED_SIGNIFICANTLY', updateProbe)
}
```

---

## God ray occlusion mesh

A simplified, non-textured version of the scene (terrain silhouette + tree impostor
billboards) is rendered to a separate depth/stencil buffer for the god ray pass.
This occlusion mesh is NOT the full tree `InstancedMesh` — it is a LOD-0 impostor
specifically for god ray occlusion, updated lazily (every 4th frame).

---

## Files

```
src/components/Three/Scene/Atmos/
  SkyDome.tsx              # Full-sphere sky mesh, Bruneton shader
  VolumetricClouds.tsx     # Half-res raymarch pass + compositing
  GodRayOccluder.tsx       # Simplified scene for god ray depth pass
  useIBLProbe.ts           # PMREMGenerator, multi-frame update scheduling
  useAtmosphereUniforms.ts # Reads skyParams SAB → sets all sky/cloud uniforms
  CLAUDE.md                # This file
```

---

## Rules

- Never raymarch clouds at full resolution — always half-res with temporal upscale
- LUT textures are immutable after baking — do not write to them post-upload
- Sun direction must be updated every frame from SAB (Worker 3 writes it) —
  do not cache or lerp it on the main thread, Worker 3 handles smoothing
- God ray occlusion mesh update: every 4th frame maximum, not every frame
- IBL probe re-render: spread over 6 frames minimum, never on a single frame
