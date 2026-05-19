import { Suspense } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Canvas from '@/components/Three/Canvas'
import Scene from '@/components/Three/Scene'
import Environment from '@/components/Three/Environment'
import { EffectComposer } from '@react-three/postprocessing'
import { PerspectiveCamera } from '@react-three/drei'
import VHS from '@/components/Three/Effects/VHS'
import { useRenderer } from '@/components/Three/RendererContext'

// ---------------------------------------------------------------------------
// Status overlays
// ---------------------------------------------------------------------------

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: 14,
  background: 'rgba(0,0,0,0.6)',
}

function WebGPUUnavailable() {
  return (
    <div style={overlayStyle}>WebGPU not available — switch back to WebGL2 in the toolbar.</div>
  )
}

function WebGPUEffectUnsupported() {
  return (
    <div
      style={{
        ...overlayStyle,
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        padding: 12,
        background: 'transparent',
      }}
    >
      <span style={{ background: 'rgba(0,0,0,0.55)', padding: '4px 8px', borderRadius: 4 }}>
        VHS effect requires WebGL2 — postprocessing is not supported on WebGPU.
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// VHS canvas — props only, no leva. Keeps leva's context out of Canvas's
// fiber ancestor chain so its-fine's useContextBridge never bridges it.
// ---------------------------------------------------------------------------

interface VHSStoryProps {
  intensity: number
  noiseStrength: number
  scanlineIntensity: number
  chromaShift: number
  ghostStrength: number
  trackingError: number
  barrelDistortion: number
  handheldStrength: number
  tapeSpeed: number
  globals?: { stats?: string }
}

function VHSCanvas({ globals, ...vhsProps }: VHSStoryProps) {
  const backend = useRenderer()

  if (backend === 'webgpu' && !navigator.gpu) return <WebGPUUnavailable />

  return (
    <>
      <Canvas gl={backend} stats={globals?.stats === 'true'}>
        <PerspectiveCamera makeDefault position={[0, 1, 5]} fov={55} />
        <Environment />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
        {backend !== 'webgpu' && (
          <EffectComposer>
            <VHS {...vhsProps} />
          </EffectComposer>
        )}
      </Canvas>
      {backend === 'webgpu' && <WebGPUEffectUnsupported />}
    </>
  )
}

// ---------------------------------------------------------------------------
// Storybook meta
// ---------------------------------------------------------------------------

const wrapper = (children: React.ReactNode) => (
  <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000' }}>
    {children}
  </div>
)

const meta = {
  title: 'Postprocessing/VHS',
  component: VHSCanvas,
  decorators: [(Story) => wrapper(<Story />)],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    intensity: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    noiseStrength: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    scanlineIntensity: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    chromaShift: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    ghostStrength: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    trackingError: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    barrelDistortion: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    handheldStrength: { control: { type: 'range', min: 0, max: 2, step: 0.01 } },
    tapeSpeed: { control: { type: 'range', min: 0.1, max: 3, step: 0.1 } },
  },
} satisfies Meta<typeof VHSCanvas>

export default meta
type Story = StoryObj<typeof meta>

/** Default preset — full VHS look, tuned via the Storybook controls panel. */
export const Default: Story = {
  args: {
    intensity: 1.0,
    noiseStrength: 0.55,
    scanlineIntensity: 0.65,
    chromaShift: 0.6,
    ghostStrength: 0.4,
    trackingError: 0.5,
    barrelDistortion: 0.6,
    handheldStrength: 0.8,
    tapeSpeed: 1.0,
  },
}
