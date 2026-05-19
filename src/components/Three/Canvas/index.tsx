'use client'

import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useThree } from '@react-three/fiber'
import Stats from '@/components/Three/Stats'
import Effects from '@/components/Three/Effects'
// import DprMonitor from './DprMonitor'
import { useSceneStore } from '@/store/sceneStore'
import '../Three.css'

const glWebGL = {
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance' as const,
  localClippingEnabled: true,
  preserveDrawingBuffer: true,
}

const glWebGPU = async ({ canvas }: { canvas: HTMLCanvasElement }) => {
  const { WebGPURenderer } = await import('three/webgpu')
  const renderer = new WebGPURenderer({ canvas, antialias: true })
  await renderer.init()
  return renderer
}

const ThreeCanvas = ({
  children,
  gl = 'webgl',
  stats = false,
  effects = false,
  ...props
}: {
  children: React.ReactNode
  gl?: 'webgl' | 'webgpu'
  stats?: boolean
  effects?: boolean
}) => {
  const isWebGPU = gl === 'webgpu'
  const [winDPR, setWinDPR] = useState(1)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setWinDPR(window.devicePixelRatio)
  }, [])

  return (
    <Canvas
      key={gl}
      shadows
      className="three-wrapper"
      dpr={[0.5, winDPR * (isWebGPU ? 0.8 : 0.6)]}
      performance={{ min: 0.5 }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gl={(isWebGPU ? glWebGPU : glWebGL) as any}
      {...props}
    >
      {children}
      {effects && <Effects />}
      {/* <DprMonitor /> */}
      <Stats isStats={stats} isWebGPU={isWebGPU} />
    </Canvas>
  )
}

export default ThreeCanvas
