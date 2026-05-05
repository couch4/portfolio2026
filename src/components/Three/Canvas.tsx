'use client'

import { Canvas } from '@react-three/fiber'
import Stats from '@/components/Three/Stats'
import DprMonitor from './DprMonitor'
import './Three.css'

const glWebGL = {
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance' as const,
  localClippingEnabled: true,
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
  ...props
}: {
  children: React.ReactNode
  gl?: 'webgl' | 'webgpu'
  stats?: boolean
}) => {
  const isWebGPU = gl === 'webgpu'

  return (
    <Canvas
      key={gl}
      shadows
      className="three-wrapper"
      // dpr={[0.5, window.devicePixelRatio * (isWebGPU ? 0.8 : 0.6)]}
      performance={{ min: 0.5 }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gl={(isWebGPU ? glWebGPU : glWebGL) as any}
      {...props}
    >
      {children}
      <DprMonitor />
      <Stats isStats={stats} isWebGPU={isWebGPU} />
    </Canvas>
  )
}

export default ThreeCanvas
