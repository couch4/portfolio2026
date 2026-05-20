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

const CanvasRegistrar = () => {
  const gl = useThree((s) => s.gl)
  const setGlCanvas = useSceneStore((s) => s.setGlCanvas)
  useEffect(() => {
    setGlCanvas(gl.domElement)
    return () => setGlCanvas(null)
  }, [gl, setGlCanvas])
  return null
}

const ThreeCanvas = ({
  children,
  gl = 'webgl',
  stats = false,
  effects = false,
  eventSource,
  eventPrefix,
  ...props
}: {
  children: React.ReactNode
  gl?: 'webgl' | 'webgpu'
  stats?: boolean
  effects?: boolean
  eventSource?: React.RefObject<HTMLElement>
  eventPrefix?: 'offset' | 'client' | 'page' | 'layer' | 'screen'
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
      eventSource={eventSource}
      eventPrefix={eventPrefix}
      {...props}
    >
      <CanvasRegistrar />
      {children}
      {effects && <Effects />}
      {/* <DprMonitor /> */}
      <Stats isStats={stats} isWebGPU={isWebGPU} />
    </Canvas>
  )
}

export default ThreeCanvas
