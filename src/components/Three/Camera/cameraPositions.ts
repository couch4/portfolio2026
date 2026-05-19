/*
 Two-system camera model:

 System 1 — Scroll path
   A CatmullRomCurve3 through SCENE_POSES in SCENE_ORDER.
   Scrollbar drives a scalar `scrollT` (0→1) along it.
   Eventually replaces with a baked GLB animation scrubbed via mixer.setTime().

 System 2 — Free nav
   Clicking a scene springs a scalar `u` (0→1) along a CatmullRomCurve3
   built from [currentCamPos, ...NAV_ARCS waypoints, destPos].
   Spring starts from wherever the camera actually is — fully interruptible.
   Rotation is slerped separately with a slight lag behind position.

 NAV_ARCS keys are "from->to". If an edge is missing a reverse entry the
 forward waypoints are mirrored automatically at runtime.
 If an edge is entirely missing, a single elevated midpoint is auto-generated.
*/

export type SceneKey = 'home' | 'about' | 'work'

export interface ScenePose {
  /** World-space position [x, y, z] */
  position: [number, number, number]
  /** Euler rotation [x, y, z] in radians */
  rotation: [number, number, number]
  /** Normalised position along the scroll path (0–1) */
  scrollT: number
}

/** Ordered list of scenes along the linear scroll path */
export const SCENE_ORDER: SceneKey[] = ['home', 'about', 'work']

/** Rest pose for each scene */
export const SCENE_POSES: Record<SceneKey, ScenePose> = {
  home: {
    position: [0, -45, 67],
    rotation: [0, 0, 0],
    scrollT: 0,
  },
  about: {
    position: [7, -47, -51],
    rotation: [-0.2, -1.8, 0],
    scrollT: 0.5,
  },
  work: {
    position: [36, -47, -72],
    rotation: [-0.2, 0.4, 0.18],
    scrollT: 1,
  },
}

/**
 * Authored bezier waypoints for the free-nav system.
 * Keys are "from->to". Each waypoint is a world-space [x, y, z].
 * The runtime prepends currentCamPos and appends destPos, then builds
 * a CatmullRomCurve3 through all points.
 *
 * Omit a key and a single auto-elevated midpoint is used.
 * Add a separate reverse key for asymmetric arcs.
 */
export const NAV_ARCS: Record<string, [number, number, number][]> = {
  'home->about': [
    [3, -42, 30],
    [10, -42, 7],
    [-20, -44, -30],
  ],
  'home->work': [
    [6, -40, 17],
    [-8, -44, -37],
    [20, -44, -50],
  ],
  'about->home': [[-10, -45, -45]],
  'about->work': [[30, -46, -65]],
  'work->home': [[0, -45, -67]],
  'work->about': [[30, -46, -65]],
}

export default SCENE_POSES
