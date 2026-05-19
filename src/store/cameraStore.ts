import { create } from 'zustand'
import type { SceneKey } from '@/components/Three/Camera/cameraPositions'

type CameraMode = 'scroll' | 'nav'

interface CameraState {
  /** Which system is currently driving the camera */
  mode: CameraMode
  setMode: (mode: CameraMode) => void

  /** Active scene (rest destination or last settled scene) */
  activeScene: SceneKey
  setActiveScene: (scene: SceneKey) => void

  /**
   * Called by nav UI — tells the camera system to spring to a scene.
   * The hook reads this and builds the arc internally.
   */
  navTarget: SceneKey | null
  goTo: (scene: SceneKey) => void
  clearNavTarget: () => void

  /**
   * Normalised scroll position (0–1) along the main path.
   * Set this from your scroll handler; the camera reads it when mode === 'scroll'.
   */
  scrollT: number
  setScrollT: (t: number) => void
}

export const useCameraStore = create<CameraState>((set) => ({
  mode: 'nav',
  setMode: (mode) => set({ mode }),

  activeScene: 'home',
  setActiveScene: (scene) => set({ activeScene: scene }),

  navTarget: null,
  goTo: (scene) => set({ navTarget: scene, mode: 'nav' }),
  clearNavTarget: () => set({ navTarget: null }),

  scrollT: 0,
  setScrollT: (t) => set({ scrollT: t, mode: 'scroll' }),
}))
