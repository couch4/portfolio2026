# Workers — Claude Code Context

## Overview

Three dedicated workers handle all computation that would otherwise block the main thread.
They communicate with the main thread via `SharedArrayBuffer` for per-frame data and
`postMessage` for control signals.

See root `.claude/rules/main.md` for the full thread model.

---

## SharedArrayBuffer layout

A single `SharedArrayBuffer` is partitioned into named regions. The layout is fixed at
startup and must not change at runtime. The main thread and all workers share one buffer.

```
Offset    Size (bytes)   Name              Written by    Read by
──────────────────────────────────────────────────────────────────
0         4              controlFlags      main          all workers
4         4              frameIndex        main          all workers
8         4 * 256 * 256  waterHeightmap    Worker 1      main (GPU upload)
524296    4 * 50000 * 3  particlePositions Worker 1      main (GPU upload)
1124296   4 * 16 * 4     instanceMatrices  Worker 2      main (GPU upload)  [per LOD tier, not per frame]
...       4 * 9          skyParams         Worker 3      main (uniform set)
```

Access in workers:
```typescript
// src/components/Three/Workers/sharedBuffer.ts  (imported by all workers and main)
export const OFFSETS = {
  controlFlags:      0,
  frameIndex:        4,
  waterHeightmap:    8,
  particlePositions: 8 + 4 * 256 * 256,
  skyParams:         8 + 4 * 256 * 256 + 4 * 50000 * 3 + 4 * 16 * 4,
} as const

export const createViews = (sab: SharedArrayBuffer) => ({
  controlFlags:      new Int32Array(sab,  OFFSETS.controlFlags,      1),
  frameIndex:        new Uint32Array(sab, OFFSETS.frameIndex,        1),
  waterHeightmap:    new Float32Array(sab, OFFSETS.waterHeightmap,   256 * 256),
  particlePositions: new Float32Array(sab, OFFSETS.particlePositions, 50000 * 3),
  skyParams:         new Float32Array(sab, OFFSETS.skyParams,         9),
})
```

---

## Control flags (Int32, bitfield)

```typescript
export const FLAGS = {
  PAUSE:          1 << 0,  // workers skip computation this frame
  QUALITY_LOW:    1 << 1,  // workers use simplified paths
  QUALITY_MEDIUM: 1 << 2,
  DISPOSE:        1 << 3,  // workers should clean up and terminate
} as const
```

Set with `Atomics.or` / `Atomics.and` from main thread.
Workers poll with `Atomics.load` at the top of each tick.

---

## postMessage protocol (control signals only)

All messages are typed. Never send per-frame data via postMessage.

```typescript
// src/components/Three/Workers/workerProtocol.ts
type MainToWorker =
  | { type: 'INIT';            sab: SharedArrayBuffer }
  | { type: 'QUALITY_CHANGE';  tier: 'ultra' | 'high' | 'medium' | 'low' }
  | { type: 'TIME_OF_DAY';     hours: number }           // Worker 3 only
  | { type: 'LOD_CHANGE';      tier: number }            // Worker 2 only
  | { type: 'DISPOSE' }

type WorkerToMain =
  | { type: 'READY' }
  | { type: 'SKY_LUTS_READY'; lutTextureData: ArrayBuffer }  // Worker 3, once at startup
  | { type: 'ERROR';          message: string }
```

---

## Worker 1 — physics.worker.ts

**Responsibilities:**
- FFT ocean wave simulation → writes `waterHeightmap` Float32Array (256×256)
- Particle system integration (fog, smoke, rising embers) → writes `particlePositions`
- Fog advection field update

**Loop pattern:**
```typescript
// Runs at ~60Hz driven by requestAnimationFrame equivalent
// Uses performance.now() to match main thread frame timing
self.addEventListener('message', ({ data }) => {
  if (data.type === 'INIT') {
    sab = data.sab
    views = createViews(sab)
    startLoop()
  }
})

function tick() {
  const flags = Atomics.load(views.controlFlags, 0)
  if (flags & FLAGS.DISPOSE) return self.close()
  if (flags & FLAGS.PAUSE)   return requestAnimationFrame(tick)

  updateWaterFFT()          // writes views.waterHeightmap
  integrateParticles()      // writes views.particlePositions

  requestAnimationFrame(tick)
}
```

**Water FFT implementation note:**
Use a 2D FFT over a 256×256 grid. Phillips spectrum for wave generation.
Quality tier `low/medium`: use Gerstner waves instead (cheaper, no FFT).

---

## Worker 2 — assets.worker.ts

**Responsibilities:**
- DRACO geometry decode (tree models, rocks)
- Instance matrix generation for `InstancedMesh` (trees, grass, rocks)
- LOD tier transitions — recalculates instance matrices when camera distance changes
- Texture streaming (progressive mip loading)

**Instance matrix pattern:**
```typescript
// Called once at startup and on LOD_CHANGE, NOT per frame
function buildTreeInstances(lod: number) {
  const count   = LOD_COUNTS[lod]            // e.g. [2000, 800, 200, 50]
  const matrices = new Float32Array(count * 16)

  for (let i = 0; i < count; i++) {
    const m = new THREE.Matrix4()
    // ... position, rotation, scale from pre-computed placement data
    m.toArray(matrices, i * 16)
  }

  // Write into SAB instance matrix region, then signal main thread
  views.instanceMatrices.set(matrices)
  self.postMessage({ type: 'INSTANCES_READY', count, lod })
}
```

**DRACO decode:**
Use `draco3d` WASM directly in the worker. Do not use `drei`'s `DRACOLoader`
on the main thread — it blocks during decode.

---

## Worker 3 — atmosphere.worker.ts

**Responsibilities:**
- Bruneton sky model LUT baking (transmittance, scattering — runs ONCE at startup)
- Cloud SDF raymarch slice precomputation (updated ~4× per second)
- Time-of-day sun position + color curve evaluation
- IBL environment probe update scheduling

**LUT baking:**
Bake transmittance and single/multiple scattering LUTs on a canvas in the worker.
Transfer the resulting `ImageData` to main thread via `postMessage` with `transfer:`.

```typescript
// One-time at startup, ~200ms
async function bakeSkyLUTs() {
  const transmittance = bakeTransmittanceLUT(256, 64)   // ImageData
  const scattering    = bakeScatteringLUT(32, 32, 32)   // ImageData (3D packed as 2D atlas)

  self.postMessage(
    { type: 'SKY_LUTS_READY', transmittance, scattering },
    [transmittance.data.buffer, scattering.data.buffer]  // transfer, not copy
  )
}
```

**Sky params (per frame, via SAB):**
`views.skyParams` is a Float32Array[9]:
- [0..2] sun direction (vec3)
- [3..5] sun color (vec3, pre-multiplied by intensity)
- [6]    atmospheric density scalar
- [7]    cloud coverage 0-1
- [8]    time of day (0-24)

---

## Main thread bridge — useWorkerBridge.ts

```typescript
// src/hooks/useWorkerBridge.ts
// Initialises all workers, distributes the SAB, handles GPU uploads each frame

export function useWorkerBridge() {
  const sabRef       = useRef<SharedArrayBuffer>()
  const viewsRef     = useRef<ReturnType<typeof createViews>>()
  const workerRefs   = useRef<{ physics: Worker; assets: Worker; atmosphere: Worker }>()

  useEffect(() => {
    const sab   = new SharedArrayBuffer(TOTAL_SAB_SIZE)
    const views = createViews(sab)
    sabRef.current  = sab
    viewsRef.current = views

    const physics    = new Worker(new URL('../Workers/physics.worker.ts',    import.meta.url), { type: 'module' })
    const assets     = new Worker(new URL('../Workers/assets.worker.ts',     import.meta.url), { type: 'module' })
    const atmosphere = new Worker(new URL('../Workers/atmosphere.worker.ts', import.meta.url), { type: 'module' })

    workerRefs.current = { physics, assets, atmosphere }

    // Distribute SAB (must be transferred after creation)
    ;[physics, assets, atmosphere].forEach(w => w.postMessage({ type: 'INIT', sab }))

    return () => {
      Atomics.or(views.controlFlags, 0, FLAGS.DISPOSE)
      setTimeout(() => { physics.terminate(); assets.terminate(); atmosphere.terminate() }, 100)
    }
  }, [])

  // Per-frame: upload SAB data to GPU buffers
  useFrame(() => {
    if (!viewsRef.current) return
    uploadWaterHeightmap(viewsRef.current.waterHeightmap)
    uploadParticlePositions(viewsRef.current.particlePositions)
    updateSkyUniforms(viewsRef.current.skyParams)
  })
}
```

---

## Rules

- Never send geometry, textures, or large objects via `postMessage` except on init/LUT-ready
- Always transfer `ArrayBuffer`s (don't clone): `postMessage(data, [data.buffer])`
- Workers must check `FLAGS.DISPOSE` at the top of every tick and terminate cleanly
- `SharedArrayBuffer` requires `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp` headers — configure in `next.config.ts`
  (not Vite — this is a Next.js project):
  ```ts
  // next.config.ts
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin' },
      { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
    ]}]
  }
  ```
- Do not use `Atomics.wait` on the main thread — it blocks. Use `Atomics.load` polling only.
