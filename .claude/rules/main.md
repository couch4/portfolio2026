# Wayward Portfolio — Claude Code Root Context

## Model-Specific Protocols

- **PLANNING (Opus/Sonnet)**: When in Plan Mode, focus on architectural integrity and edge-case detection. Output plans to `CURRENT_PLAN.md`.
- **EXECUTION (Haiku)**: When implementing, strictly follow `CURRENT_PLAN.md`. Do not deviate without a `/model opus` re-plan.
- **VERIFICATION (Sonnet)**: Use premier reasoning to audit the final code against the plan. Run `npm test` and analyze failures with high-depth thinking.

## Project overview

A React Three Fiber portfolio featuring a Pixar-esque alpine scene with PBR materials,
physics-driven water, volumetric atmosphere, instanced trees, a particle system (fog/smoke/rising),
and full postprocessing. UI lives in 3D space via drei's `<Html transform>` component. A toggle
switches the entire scene to a point cloud render mode.

Target: **40+ FPS** on mid-range discrete GPU (RTX 3060 / M2 Pro class).
Graceful degradation to 30 FPS on integrated graphics via dynamic quality scaling.

---

## Technology stack

| Layer          | Library                                                   |
| -------------- | --------------------------------------------------------- |
| Renderer       | `@react-three/fiber` (WebGPU renderer, WebGL2 fallback)   |
| Helpers        | `@react-three/drei`                                       |
| Postprocessing | `@react-three/postprocessing` + `postprocessing` (pmndrs) |
| Physics        | `@react-three/rapier` (Rapier WASM, runs off main thread) |
| UI animation   | `motion/react`                                            |
| R3F animation  | 'r3f-motion'                                              |
| State          | `zustand`                                                 |
| CSS            | embedded SCSS style tailwind using @apply                 |
| CMS            | Payload 3.0                                               |
| DB             | Turso SQLite                                              |
| AI/LLM/Chat    | Vercel AI SDK                                             |
| task runner    | bun                                                       |

---

## Architecture rules — read before touching any file

### Thread model

The main thread budget is **≤2ms JS per frame**. Everything else must be off-thread or GPU-side.

- **Main thread**: R3F render loop, React reconciler, Framer Motion CSS transforms, buffer uploads
- **Worker 1** (`src/components/three/workers/physics.worker.ts`): Rapier water simulation, FFT wave heightmap,
  particle position integration, fog/smoke advection — writes into `SharedArrayBuffer`
- **Worker 2** (`src/components/three/workers/assets.worker.ts`): DRACO geometry decode, instance matrix
  generation, LOD tier transitions, texture streaming
- **Worker 3** (`src/components/three/workers/atmosphere.worker.ts`): Bruneton sky LUT baking (once at startup),
  cloud SDF slice precomputation, time-of-day curve evaluation, IBL probe updates

Workers communicate via `SharedArrayBuffer` (zero-copy Float32Arrays) for per-frame data.
`postMessage` is for control signals only (pause, quality tier change, dispose).

### GPU pipeline order

1. Shadow pass
2. Opaque geometry (terrain, trees via `InstancedMesh`, rocks)
3. Water (displacement from Worker 1 heightmap texture)
4. Atmosphere / sky (LUT lookup + volumetric cloud raymarch)
5. Particles (GPU instanced, positions from Worker 1)
6. Postprocessing stack (see `src/components/three/effects/`)
7. UI composite (drei `<Html>` — separate compositor layer, never blocks render)

### WebGPU / WebGL fallback strategy

- Detect at startup via `navigator.gpu`
- WebGPU path: WGSL shaders in `src/components/three/shaders/tsl/`, full feature set
- WebGL2 fallback: GLSL shaders in `src/components/three/shaders/glsl/`, simplified clouds (billboard),
  cheaper SSAO variant, no compute shaders
- Use `useDetectGPU` hook from `detect-gpu` to tier hardware and set initial quality preset

### Quality tiers

Defined in `src/store/qualityStore.ts`. Set at startup, adjustable at runtime.

| Tier     | Target           | Cloud               | AO   | Particles | Shadow   |
| -------- | ---------------- | ------------------- | ---- | --------- | -------- |
| `ultra`  | 60fps discrete   | Volumetric raymarch | GTAO | 50k       | 4096 CSM |
| `high`   | 60fps discrete   | Volumetric raymarch | GTAO | 20k       | 2048 CSM |
| `medium` | 40fps integrated | Billboard + shader  | SSAO | 5k        | 1024     |
| `low`    | 30fps mobile     | Skybox only         | None | 1k        | 512      |

Dynamic resolution scaling: render at 75% then upscale if frame time > 20ms for 3 consecutive frames.

---

## File structure

```
src/
  app/
    (frontend)/             # Next.js public routes (CMS-driven pages, posts, search)
    (payload)/              # Payload admin UI + API routes
  collections/              # Payload CMS collections (Pages, Posts, Media, etc.)
  blocks/                   # Payload block components rendered on frontend
  components/
    three/                  # ← main bulk of the app (R3F scene graph)
      scene/
        terrain/            # Heightmap terrain, tessellation, PBR materials
        water/              # Displacement mesh, SSR, caustics
        trees/              # InstancedMesh, LOD, DRACO decode via Worker 2
        atmosphere/         # Sky LUT, volumetric clouds, god rays, fog
        particles/          # GPU-instanced fog/smoke/rising particles
      shaders/
        glsl/               # WebGL2 vertex + fragment shaders
        tsl/               # WebGPU compute + render shaders
      workers/
        physics.worker.ts
        assets.worker.ts
        atmosphere.worker.ts
      postprocessing/       # Effect pipeline config — see src/postprocessing/CLAUDE.md
    ui/
        carousel/           # 3D carousel — see src/ui/carousel/CLAUDE.md
  store/
    globalStore.ts // global zustand store
    sceneStore.ts // broad threeJS scene related store vals
  hooks/
    useDetectGPU.ts
    useWorkerBridge.ts
    usePointCloud.ts
```

---

## Critical performance rules

1. **Never trigger layout recalculation during animation.** Framer Motion variants must only
   animate `transform` and `opacity`. Never animate `width`, `height`, `padding`, `margin`.

2. **`<Html>` panels must have `transform` prop set.** Without it, drei uses screen-space
   projection which breaks with camera movement and forces layout recalc.

3. **Dispose geometry and textures explicitly.** R3F does not GC GPU resources automatically.
   Use `useEffect` cleanup or `drei`'s `useGLTF.preload` + dispose patterns.

4. **Instance matrices are write-once per LOD tier change**, not per frame.
   Water displacement is the only per-frame GPU buffer write from a worker.

5. **Point cloud mode** swaps `MeshStandardMaterial` → `PointsMaterial` and toggles geometry
   representation. Implement as a context swap in `usePointCloud`, not a remount.
   Keep both material instances alive to avoid recompilation.

6. **Postprocessing passes are additive cost.** Profile with `r3f-perf` before adding each.
   Bloom (MipMap) + TAA + tonemapping are baseline. GTAO and volumetric god rays are
   tier-gated (ultra/high only).

---

## Shader conventions

- Uniforms named `uCamelCase`, attributes named `aCamelCase`, varyings named `vCamelCase`
- `uProgress` (float 0→1) is the canonical animation driver uniform across all transition shaders
- `uTime` is elapsed seconds, passed from R3F's `useFrame` clock
- All shaders must have a GLSL and WGSL variant at matching paths under `src/shaders/`

---

## Do not do these things

- Do not import Three.js directly — use R3F's `useThree` / `extend` pattern
- Do not put physics or heavy computation in `useFrame` on the main thread
- Do not create new `BufferGeometry` instances inside `useFrame`
- Do not use `useState` for per-frame values — use refs
- Do not forget to dispose: geometries, materials, textures, render targets on unmount
- Do not use 'pnpm/npm/yarn' — use 'bun'
- Do not use 'motion/react' for 3D animation. use 'r3f-motion' first and foremost

---

## Sub-context files

Each major subsystem has its own `CLAUDE.md` with deeper detail:

- `src/components/ui/carousel/CLAUDE.md` — carousel state machine, impostor swap, shard vertex shader
- `src/components/three/effects/CLAUDE.md` — effect stack, pass order, tier gating
- `src/components/three/workers/CLAUDE.md` — worker bridge API, SharedArrayBuffer layout, message protocol
- `src/components/three/scene/atmosphere/CLAUDE.md` — Bruneton sky, cloud raymarch, IBL probe
