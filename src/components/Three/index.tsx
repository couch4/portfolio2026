'use client'

import Canvas from './Canvas'
import { Suspense } from 'react'
import Scene from './Scene'
import './Three.css'
import Camera from './Camera'
import { useSceneStore } from '@/store/sceneStore'

export const Three = () => {
  const sceneContent = useSceneStore((s) => s.sceneContent)

  return (
    <Canvas gl="webgl" stats effects>
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
      {sceneContent}
      <Camera />
    </Canvas>
  )
}
