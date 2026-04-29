import { useRef } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useFrame } from '@react-three/fiber'
import Canvas from '@/components/Three/Canvas'
import { EffectComposer } from '@react-three/postprocessing'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useControls } from 'leva'
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
// Minimal test scene — no leva deps, no extra useFrame store subscriptions
// ---------------------------------------------------------------------------

function SpinningBoxes() {
  const groupRef = useRef<THREE.Group>(null!)
  useFrame((_, delta) => {
    groupRef.current.rotation.y += delta * 0.3
  })
  return (
    <group ref={groupRef}>
      <mesh position={[-1.5, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#4a9eff" roughness={0.4} />
      </mesh>
      <mesh position={[1.5, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ff6b4a" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial color="#4aff8c" roughness={0.3} metalness={0.5} />
      </mesh>
    </group>
  )
}

function TestScene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 3]} intensity={1.2} castShadow />
      <pointLight position={[-4, 2, -4]} intensity={0.6} color="#8080ff" />
      <SpinningBoxes />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#333" roughness={0.9} />
      </mesh>
    </>
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
        <TestScene />
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

// useControls lives here — sibling renders Canvas, so leva's context is
// never in Canvas's ancestor chain and its-fine won't bridge it.
function VHSDemo({ globals }: { globals?: { stats?: string } }) {
  const params = useControls('VHS', {
    intensity: { value: 1.0, min: 0, max: 1, step: 0.01, label: 'Intensity' },
    noiseStrength: { value: 0.55, min: 0, max: 1, step: 0.01, label: 'Noise' },
    scanlineIntensity: { value: 0.65, min: 0, max: 1, step: 0.01, label: 'Scanlines' },
    chromaShift: { value: 0.6, min: 0, max: 1, step: 0.01, label: 'Chroma bleed' },
    ghostStrength: { value: 0.4, min: 0, max: 1, step: 0.01, label: 'Tape ghost' },
    trackingError: { value: 0.5, min: 0, max: 1, step: 0.01, label: 'Tracking error' },
    barrelDistortion: { value: 0.6, min: 0, max: 1, step: 0.01, label: 'Barrel distortion' },
    handheldStrength: { value: 0.8, min: 0, max: 2, step: 0.01, label: 'Handheld sway' },
    tapeSpeed: { value: 1.0, min: 0.1, max: 3, step: 0.1, label: 'Tape speed' },
  })
  return <VHSCanvas {...params} globals={globals} />
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

/** Default preset — full VHS look with interactive leva controls. */
export const Default: Story = {
  render: (_args, context) => <VHSDemo globals={context.globals} />,
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

/** Subtle — grain and scanlines only, no glitches */
export const Subtle: Story = {
  args: {
    intensity: 0.7,
    noiseStrength: 0.3,
    scanlineIntensity: 0.5,
    chromaShift: 0.2,
    ghostStrength: 0.1,
    trackingError: 0.0,
    barrelDistortion: 0.25,
    handheldStrength: 0.3,
    tapeSpeed: 1.0,
  },
}

/** Found footage — extreme degradation, strong tracking errors */
export const FoundFootage: Story = {
  args: {
    intensity: 1.0,
    noiseStrength: 0.9,
    scanlineIntensity: 0.8,
    chromaShift: 0.9,
    ghostStrength: 0.7,
    trackingError: 0.95,
    barrelDistortion: 0.9,
    handheldStrength: 1.8,
    tapeSpeed: 1.4,
  },
}
