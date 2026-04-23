'use client'

import Canvas from './Canvas'
import { Suspense } from 'react'
import Scene from './Scene'
import './Three.css'
import Camera from './Camera'

export const Three = () => {
  return (
    <Canvas>
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
      <Camera />
    </Canvas>
  )
}
