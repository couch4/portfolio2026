/**
 * useCameraSystem
 *
 * Drives a PerspectiveCamera imperatively each frame. Two coexisting systems:
 *
 *   System 1 — Scroll
 *     scrollT (0→1) scrubs a CatmullRomCurve3 through the scene rest poses in order.
 *     Rotation slerps between adjacent scene rotations proportionally.
 *     Designed to be swapped for a GLB mixer.setTime() call later.
 *
 *   System 2 — Free nav
 *     goTo(scene) builds a CatmullRomCurve3:
 *       [currentCamPos, ...authored NAV_ARCS waypoints, destPos]
 *     A Framer Motion spring drives scalar u (0→1) along that curve.
 *     Position = curve.getPoint(u). Rotation slerps with a lag offset so the
 *     camera leads with movement and the view follows — natural banking feel.
 *     Fully interruptible: a new goTo() snapshots current world pose and builds
 *     a fresh arc from there, resetting u to 0.
 *
 * Call this hook inside an R3F component (inside <Canvas>).
 * Pass the returned `cameraRef` to <PerspectiveCamera ref={cameraRef} makeDefault />.
 */

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CatmullRomCurve3, Euler, MathUtils, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import { useSpring } from 'motion/react'
import { useCameraStore } from '@/store/cameraStore'
import { NAV_ARCS, SCENE_ORDER, SCENE_POSES, type SceneKey } from './cameraPositions'

// ---------------------------------------------------------------------------
// Spring config — overdamped, cinematic glide, no bounce
// ---------------------------------------------------------------------------
const NAV_SPRING = { stiffness: 20, damping: 30, restDelta: 0.00001 } as const

// Rotation lags this many units behind position on the arc (0–1 range)
const ROTATION_LAG = 0.08

// Auto-elevated midpoint height offset when no arc is authored for an edge
const AUTO_MID_LIFT = 12

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toV3(p: [number, number, number]): Vector3 {
  return new Vector3(p[0], p[1], p[2])
}

function eulerToQuat(r: [number, number, number]): Quaternion {
  return new Quaternion().setFromEuler(new Euler(r[0], r[1], r[2], 'XYZ'))
}

/** Resolve authored waypoints for an edge, falling back to a lifted midpoint */
function resolveWaypoints(
  fromPos: Vector3,
  toPos: Vector3,
  fromKey: SceneKey,
  toKey: SceneKey,
): Vector3[] {
  const edgeKey = `${fromKey}->${toKey}`
  const authored = NAV_ARCS[edgeKey]

  if (authored && authored.length > 0) {
    return authored.map(toV3)
  }

  // Fallback: single midpoint elevated above the straight line
  const mid = fromPos.clone().lerp(toPos, 0.5)
  mid.y += AUTO_MID_LIFT
  return [mid]
}

/** Build a CatmullRomCurve3 for a nav transition */
function buildNavCurve(
  fromPos: Vector3,
  toPos: Vector3,
  fromKey: SceneKey,
  toKey: SceneKey,
): CatmullRomCurve3 {
  const waypoints = resolveWaypoints(fromPos, toPos, fromKey, toKey)
  return new CatmullRomCurve3(
    [fromPos.clone(), ...waypoints, toPos.clone()],
    false,
    'catmullrom',
    0.5,
  )
}

/** Build a CatmullRomCurve3 for the scroll path through all scenes in order */
function buildScrollPath(): CatmullRomCurve3 {
  const points = SCENE_ORDER.map((key) => toV3(SCENE_POSES[key].position))
  return new CatmullRomCurve3(points, false, 'catmullrom', 0.5)
}

// Scroll path is static — build it once at module level
const SCROLL_PATH = buildScrollPath()

/** Map a scrollT (0→1) to a world position on the scroll path */
function scrollPathPosition(t: number): Vector3 {
  return SCROLL_PATH.getPoint(MathUtils.clamp(t, 0, 1))
}

/**
 * Interpolate rotation along the scroll path.
 * Finds the two bracketing scenes and slerps between their quaternions.
 */
function scrollPathRotation(t: number): Quaternion {
  const clamped = MathUtils.clamp(t, 0, 1)
  const count = SCENE_ORDER.length

  for (let i = 0; i < count - 1; i++) {
    const aKey = SCENE_ORDER[i]
    const bKey = SCENE_ORDER[i + 1]
    const ta = SCENE_POSES[aKey].scrollT
    const tb = SCENE_POSES[bKey].scrollT

    if (clamped >= ta && clamped <= tb) {
      const alpha = tb === ta ? 0 : (clamped - ta) / (tb - ta)
      const qa = eulerToQuat(SCENE_POSES[aKey].rotation)
      const qb = eulerToQuat(SCENE_POSES[bKey].rotation)
      return qa.slerp(qb, alpha)
    }
  }

  // Past the last scene
  return eulerToQuat(SCENE_POSES[SCENE_ORDER[count - 1]].rotation)
}

// How long after the last scroll event before we snap to nearest scene (ms)
const SCROLL_END_DEBOUNCE_MS = 600

/** Find the scene whose scrollT is closest to the given value */
function nearestScene(t: number): SceneKey {
  return SCENE_ORDER.reduce((best, key) => {
    return Math.abs(SCENE_POSES[key].scrollT - t) < Math.abs(SCENE_POSES[best].scrollT - t)
      ? key
      : best
  }, SCENE_ORDER[0])
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCameraSystem() {
  const { camera } = useThree()
  const perspCamera = camera as PerspectiveCamera

  // Live spring for free-nav arc parameter
  const uSpring = useSpring(0, NAV_SPRING)

  // Mutable refs — avoid re-renders, mutated inside useFrame
  const navCurveRef = useRef<CatmullRomCurve3 | null>(null)
  const navFromKeyRef = useRef<SceneKey>('home')
  const navToKeyRef = useRef<SceneKey>('home')
  const navFromRotRef = useRef<Quaternion>(new Quaternion())
  const navToRotRef = useRef<Quaternion>(new Quaternion())
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const store = useCameraStore()

  // ------------------------------------------------------------------
  // Scroll-end snap: subscribe to scrollT changes, debounce, goTo nearest
  // ------------------------------------------------------------------
  useEffect(() => {
    let prevScrollT = useCameraStore.getState().scrollT

    return useCameraStore.subscribe((state) => {
      if (state.scrollT === prevScrollT) return
      prevScrollT = state.scrollT

      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current)
      scrollEndTimerRef.current = setTimeout(() => {
        const { mode, goTo } = useCameraStore.getState()
        if (mode !== 'scroll') return
        goTo(nearestScene(prevScrollT))
      }, SCROLL_END_DEBOUNCE_MS)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ------------------------------------------------------------------
  // React to navTarget changes
  // ------------------------------------------------------------------
  useEffect(() => {
    const { navTarget, activeScene, clearNavTarget, setActiveScene } = useCameraStore.getState()
    if (!navTarget || navTarget === activeScene) return

    // Snapshot current world pose as arc start
    const fromPos = perspCamera.position.clone()
    const toPos = toV3(SCENE_POSES[navTarget].position)

    navCurveRef.current = buildNavCurve(fromPos, toPos, activeScene, navTarget)
    navFromKeyRef.current = activeScene
    navToKeyRef.current = navTarget
    navFromRotRef.current = perspCamera.quaternion.clone()
    navToRotRef.current = eulerToQuat(SCENE_POSES[navTarget].rotation)

    // Reset and spring u to 1
    uSpring.jump(0)
    uSpring.set(1)

    setActiveScene(navTarget)
    clearNavTarget()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.navTarget])

  // ------------------------------------------------------------------
  // Per-frame update
  // ------------------------------------------------------------------
  useFrame(() => {
    const { mode, scrollT } = useCameraStore.getState()

    if (mode === 'nav' && navCurveRef.current) {
      const u = uSpring.get()
      const pos = navCurveRef.current.getPoint(MathUtils.clamp(u, 0, 1))
      perspCamera.position.copy(pos)

      // Rotation lags behind position — reads naturally as banking into turns
      const rotU = MathUtils.clamp(u - ROTATION_LAG, 0, 1)
      const smoothRotU = MathUtils.smoothstep(rotU, 0, 1)
      perspCamera.quaternion.slerpQuaternions(
        navFromRotRef.current,
        navToRotRef.current,
        smoothRotU,
      )
    } else if (mode === 'scroll') {
      const pos = scrollPathPosition(scrollT)
      perspCamera.position.copy(pos)
      perspCamera.quaternion.copy(scrollPathRotation(scrollT))
    }
  })
}
