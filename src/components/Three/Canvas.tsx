'use client'

import { useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Html, PerformanceMonitor, StatsGl } from '@react-three/drei'
import './Three.css'

const glWebGL = {
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance' as const,
  localClippingEnabled: true,
}

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
  ...props
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
      performance={{ min: 0.5 }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gl={(gl === 'webgpu' ? glWebGPU : glWebGL) as any}
      {...props}
    >
      {children}
      {stats && <StatsGl trackGPU className="stats" />}
      <Html fullscreen className="renderer-label">
        <div>{`Renderer: ${gl === 'webgpu' ? 'WebGPU' : 'WebGL2'}`}</div>
      </Html>
      <DprMonitor />
    </Canvas>
  )
}

export default ThreeCanvas

// One-shot adaptive DPR. We only adjust pixel ratio once after performance is
// assessed — repeatedly toggling DPR mid-session triggers r3f resize events
// that desync animations tied to viewport (e.g. carousel slideWidth) and
// rebuilds portal FBOs, causing visible jumps.
//
// We use r3f's `setDpr` (not `gl.setPixelRatio` directly) so `viewport.dpr`
// updates in r3f state — components like portals can subscribe and re-key
// their FBOs to match the new pixel ratio.
const DprMonitor = () => {
  const setDpr = useThree((s) => s.setDpr)
  const applied = useRef(false)
  return (
    <PerformanceMonitor
      iterations={5}
      onIncline={() => {
        if (applied.current) return
        applied.current = true
        setDpr(Math.min(2, window.devicePixelRatio))
      }}
      onDecline={() => {
        if (applied.current) return
        applied.current = true
        setDpr(1)
      }}
    />
  )
}
