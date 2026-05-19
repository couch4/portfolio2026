'use client'

import Canvas from './Canvas'
import { Suspense, useRef } from 'react'
import Scene from './Scene'
import './Three.css'
import Camera from './Camera'
import { useSceneStore } from '@/store/sceneStore'

export const Three = () => {
  const sceneContent = useSceneStore((s) => s.sceneContent)
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} className="three-container">
      <Canvas gl="webgl" stats effects eventSource={containerRef} eventPrefix="client">
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
        {sceneContent}
        <Camera />
      </Canvas>
    </div>
  )
}
