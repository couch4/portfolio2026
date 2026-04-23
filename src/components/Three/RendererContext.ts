import { createContext, useContext } from 'react'

export type RendererBackend = 'webgpu' | 'webgl'

export const RendererContext = createContext<RendererBackend>('webgl')

export const useRenderer = (): RendererBackend => useContext(RendererContext)
