'use client'

import { Canvas } from '@react-three/fiber'
import { Html, StatsGl } from '@react-three/drei'
import './Three.css'

const glWebGL = { antialias: true, alpha: true, powerPreference: 'high-performance' as const }

const glWebGPU = async ({ canvas }: { canvas: HTMLCanvasElement }) => {
  const { WebGPURenderer } = await import('three/webgpu')
  const renderer = new WebGPURenderer({ canvas, antialias: true, alpha: true })
  await renderer.init()
  return renderer
}

const ThreeCanvas = ({
  children,
  gl = 'webgl',
  stats = false,
}: {
  children: React.ReactNode
  gl?: 'webgl' | 'webgpu'
  stats?: boolean
}) => {
  return (
    <Canvas
      key={gl}
      shadows
      className="three-wrapper"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gl={(gl === 'webgpu' ? glWebGPU : glWebGL) as any}
    >
      {children}
      {stats && <StatsGl trackGPU className="stats" />}
      <Html fullscreen className="renderer-label">
        <div>{`Renderer: ${gl === 'webgpu' ? 'WebGPU' : 'WebGL2'}`}</div>
      </Html>
    </Canvas>
  )
}

export default ThreeCanvas
