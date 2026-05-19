import { create } from 'zustand'
import type { ReactNode } from 'react'

interface SceneState {
  isDevView: boolean
  setIsDevView: (value: boolean) => void
  isSwiping: boolean
  setIsSwiping: (value: boolean) => void
  glCanvas: HTMLCanvasElement | null
  setGlCanvas: (canvas: HTMLCanvasElement | null) => void
  sceneContent: ReactNode
  setSceneContent: (content: ReactNode) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  isDevView: false,
  setIsDevView: (value) => set({ isDevView: value }),
  isSwiping: false,
  setIsSwiping: (value) => set({ isSwiping: value }),
  glCanvas: null,
  setGlCanvas: (canvas) => set({ glCanvas: canvas }),
  sceneContent: null,
  setSceneContent: (content) => set({ sceneContent: content }),
}))
