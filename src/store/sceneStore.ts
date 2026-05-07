import { create } from 'zustand'

interface SceneState {
  isDevView: boolean
  setIsDevView: (value: boolean) => void
  isSwiping: boolean
  setIsSwiping: (value: boolean) => void
  glCanvas: HTMLCanvasElement | null
  setGlCanvas: (canvas: HTMLCanvasElement | null) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  isDevView: false,
  setIsDevView: (value) => set({ isDevView: value }),
  isSwiping: false,
  setIsSwiping: (value) => set({ isSwiping: value }),
  glCanvas: null,
  setGlCanvas: (canvas) => set({ glCanvas: canvas }),
}))
