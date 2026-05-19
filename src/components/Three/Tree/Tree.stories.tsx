import { useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import type { Meta } from '@storybook/react'
import Canvas from '@/components/Three/Canvas'
import VHS from '@/components/Three/Effects/VHS'
import Environment from '@/components/Three/Environment'
import { EffectComposer, N8AO } from '@react-three/postprocessing'
import { Forest, Tree } from '@/components/Three/Tree'

const postProcessProps = {
  intensity: 1,
  noiseStrength: 0.1,
  scanlineIntensity: 0.9,
  chromaShift: 0.3,
  ghostStrength: 0.2,
  trackingError: 0.2,
  barrelDistortion: 0,
  handheldStrength: 0,
  tapeSpeed: 1,
}

// ─── LOD Distance rings — debug overlay ───────────────────────────────────────

function LODRings({ d1 = 40 }) {
  return (
    <group position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[d1 - 0.1, d1 + 0.1, 64]} />
        <meshBasicMaterial color="#ff6644" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

// ─── LOD label badge ─────────────────────────────────────────────────────────

function LODBadge({ activeLOD }) {
  const labels = {
    0: 'LOD 0 — Full geometry',
    1: 'LOD 1 — Impostor billboard',
  }
  const colors = { 0: '#3dff8f', 1: '#ff6644' }

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10,21,16,0.85)',
        border: `1px solid ${colors[activeLOD]}`,
        borderRadius: 4,
        padding: '6px 16px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13,
        color: colors[activeLOD],
        letterSpacing: '0.04em',
        pointerEvents: 'none',
        backdropFilter: 'blur(8px)',
      }}
    >
      {labels[activeLOD]}
    </div>
  )
}

// ─── Camera distance readout ─────────────────────────────────────────────────

function DistanceReadout({ onDistance }) {
  const { camera } = useThree()
  useFrame(() => {
    const d = camera.position.length()
    onDistance(Math.round(d * 10) / 10)
  })
  return null
}

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: '3D/Main Scene/Tree Genrator',
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story, context) => {
      const { renderer, stats = false, orbit = false } = context.globals
      const { postProcess = false, ssao = false } = context.args

      return (
        <Canvas gl={renderer} stats={stats}>
          <Environment preset="warehouse" />
          <directionalLight
            position={[80, 120, 40]}
            intensity={5}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-near={1}
            shadow-camera-far={400}
            shadow-camera-left={-120}
            shadow-camera-right={120}
            shadow-camera-top={120}
            shadow-camera-bottom={-120}
            shadow-bias={-0.001}
            color="#ffeee2"
          />
          <fog attach="fog" args={['#06080e', 0, 400]} />
          <Story />
          {orbit && <OrbitControls />}
          {(postProcess || ssao) && (
            <EffectComposer>
              {ssao && (
                <N8AO
                  aoRadius={8}
                  intensity={6}
                  distanceFalloff={1}
                  aoSamples={32}
                  denoiseSamples={8}
                  // halfRes
                  quality="performance"
                />
              )}
              {postProcess && <VHS {...postProcessProps} />}
            </EffectComposer>
          )}
        </Canvas>
      )
    },
  ],
  argTypes: {
    // Trunk
    trunkHeight: {
      control: { type: 'range', min: 3, max: 20, step: 0.5 },
      table: { category: 'Trunk' },
    },
    trunkSegments: {
      control: { type: 'range', min: 2, max: 12, step: 1 },
      table: { category: 'Trunk' },
    },
    trunkRadiusBase: {
      control: { type: 'range', min: 0.05, max: 0.6, step: 0.01 },
      table: { category: 'Trunk' },
    },
    trunkRadiusTip: {
      control: { type: 'range', min: 0.01, max: 0.2, step: 0.01 },
      table: { category: 'Trunk' },
    },
    trunkTaper: {
      control: { type: 'range', min: 0.5, max: 3.0, step: 0.1 },
      table: { category: 'Trunk' },
      description: 'Taper curve — higher = stays thick longer then narrows sharply',
    },
    // Branches
    rungCount: {
      control: { type: 'range', min: 2, max: 20, step: 1 },
      table: { category: 'Branches' },
      description: 'Number of branch whorls up the trunk',
    },
    rungSpacing: {
      control: { type: 'range', min: 0.4, max: 2.0, step: 0.05 },
      table: { category: 'Branches' },
      description: '1 = even distribution; <1 = compressed toward top',
    },
    branchesPerRung: {
      control: { type: 'range', min: 2, max: 10, step: 1 },
      table: { category: 'Branches' },
    },
    branchLength: {
      control: { type: 'range', min: 0.5, max: 6.0, step: 0.1 },
      table: { category: 'Branches' },
    },
    branchLengthVariance: {
      control: { type: 'range', min: 0, max: 0.8, step: 0.05 },
      table: { category: 'Branches' },
    },
    branchDroop: {
      control: { type: 'range', min: 0, max: 1.0, step: 0.05 },
      table: { category: 'Branches' },
      description: '0 = horizontal, 1 = steep downward droop',
    },
    branchAngleSpread: {
      control: { type: 'range', min: 0, max: 1.0, step: 0.05 },
      table: { category: 'Branches' },
    },
    foliageScaleBase: {
      control: { type: 'range', min: 0.2, max: 3.0, step: 0.05 },
      table: { category: 'Branches' },
      description: 'Foliage plane scale at the bottom rung',
    },
    foliageScaleTop: {
      control: { type: 'range', min: 0.1, max: 2.0, step: 0.05 },
      table: { category: 'Branches' },
      description: 'Foliage plane scale at the top rung (tweens from base)',
    },
    rungStart: {
      control: { type: 'range', min: 0, max: 0.8, step: 0.01 },
      table: { category: 'Branches' },
      description: 'Trunk height fraction where first rung appears (0=ground, 1=tip)',
    },
    // LOD
    distanceLOD1: {
      control: { type: 'range', min: 5, max: 100, step: 1 },
      table: { category: 'LOD' },
      description: 'Distance at which LOD0 → LOD1 (impostor billboard)',
    },
    // Misc
    seed: {
      control: { type: 'range', min: 1, max: 999, step: 1 },
      table: { category: 'Variation' },
      description: 'Change for a different tree with the same params',
    },
    foliageColorStem: {
      control: 'color',
      table: { category: 'Visuals' },
      description: 'Leaf colour at branch base (stem)',
    },
    foliageColorMid: {
      control: 'color',
      table: { category: 'Visuals' },
      description: 'Leaf colour at mid gradient stop',
    },
    foliageColorTip: {
      control: 'color',
      table: { category: 'Visuals' },
      description: 'Leaf colour at branch tip',
    },
    stemStop: {
      control: { type: 'range', min: 0, max: 0.9, step: 0.01 },
      table: { category: 'Visuals' },
      description: 'Fraction along blade where stem transitions to mid',
    },
    midStop: {
      control: { type: 'range', min: 0.1, max: 1.0, step: 0.01 },
      table: { category: 'Visuals' },
      description: 'Fraction along blade where mid transitions to tip',
    },
    barkColor: { control: 'color', table: { category: 'Visuals' } },
    hueShiftBase: {
      control: { type: 'range', min: -0.5, max: 0.5, step: 0.01 },
      table: { category: 'Visuals' },
      description: 'Centre of per-tree hue shift (0=green, -0.1=teal, -0.25=blue)',
    },
    hueShiftRange: {
      control: { type: 'range', min: 0, max: 0.5, step: 0.01 },
      table: { category: 'Visuals' },
      description: 'How far each tree can deviate from hueShiftBase',
    },
    tintSaturation: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      table: { category: 'Visuals' },
      description: 'Saturation of the per-tree hue tint (0=no tint, 1=strong)',
    },
    leafStyle: {
      control: { type: 'range', min: 1, max: 8, step: 1 },
      table: { category: 'Visuals' },
      description: 'Alpha texture variant (1-8) — cycles through leavesPine4_mask_01..08',
    },
    // Wind
    windEnabled: {
      control: 'boolean',
      table: { category: 'Wind' },
      description: 'Enable GPU wind sway on foliage',
    },
    windStrength: {
      control: { type: 'range', min: 0, max: 1.0, step: 0.01 },
      table: { category: 'Wind' },
      description: 'Sway amplitude (world units at tip)',
    },
    windSpeed: {
      control: { type: 'range', min: 0.1, max: 5.0, step: 0.1 },
      table: { category: 'Wind' },
      description: 'Oscillation frequency multiplier',
    },
    windDirAngle: {
      control: { type: 'range', min: 0, max: 360, step: 5 },
      table: { category: 'Wind' },
      description: 'Wind direction in degrees (0 = +X axis)',
    },
    // Post
    ssao: {
      control: 'boolean',
      description: 'N8AO ambient occlusion (half-res, performance quality)',
      table: { category: 'Post Processing' },
    },
    postProcess: {
      control: 'boolean',
      description: 'VHS post-processing effects',
      table: { category: 'Post Processing' },
    },
  },
}

export default meta

// ─── Default args ─────────────────────────────────────────────────────────────

const defaults = {
  trunkHeight: 12,
  trunkSegments: 6,
  trunkRadiusBase: 0.18,
  trunkRadiusTip: 0.05,
  trunkTaper: 1.4,
  rungCount: 10,
  rungSpacing: 0.85,
  branchesPerRung: 9,
  branchLength: 3.1,
  branchLengthVariance: 0.1,
  branchDroop: 0.75,
  branchAngleSpread: 0.2,
  foliageScaleBase: 1.85,
  rungStart: 0.2,
  distanceLOD1: 40,
  foliageScaleTop: 0.1,
  seed: 42,
  foliageColorStem: '#0d3b09',
  foliageColorMid: '#477329',
  foliageColorTip: '#6d8c34',
  stemStop: 0.77,
  midStop: 1,
  barkColor: '#5c3d1e',
  hueShiftBase: -0.08,
  hueShiftRange: 0.15,
  tintSaturation: 1,
  trunkHeightMin: 6,
  trunkHeightMax: 14,
  leafStyle: 1,
  windEnabled: false,
  windStrength: 0.08,
  windSpeed: 1.0,
  windDirAngle: 0,
  ssao: true,
  postProcess: false,
  minSpacing: 4,
}

// ─── Story 1: Single Tree with manual LOD slider ──────────────────────────────

function SingleTreeScene({ windDirAngle = 0, ...treeArgs }) {
  const [dist, setDist] = useState(0)
  const { camera } = useThree()
  const windDirection: [number, number] = [
    Math.cos((windDirAngle * Math.PI) / 180),
    Math.sin((windDirAngle * Math.PI) / 180),
  ]

  useEffect(() => {
    camera.position.set(0, 18, 20)
  }, [camera])

  return (
    <>
      <DistanceReadout onDistance={setDist} />
      <Tree {...treeArgs} windDirection={windDirection} />
      <Ground />
    </>
  )
}

export const SingleTree = {
  name: 'Single Tree',
  args: {
    ...defaults,
    forceLOD: 0,
  },
  argTypes: {
    forceLOD: {
      name: 'LOD level',
      control: { type: 'range', min: 0, max: 1, step: 1 },
      description: '0 = Full geometry · 1 = Impostor billboard',
      table: { category: 'LOD' },
    },
    showRings: {
      control: 'boolean',
      description: 'Show LOD distance rings on ground',
      table: { category: 'LOD' },
    },
  },
  render: (args) => <SingleTreeScene {...args} />,
}

// ─── Story 2: Auto-LOD — orbit to trigger transitions ────────────────────────

function AutoLODScene({ windDirAngle = 0, ...treeArgs }) {
  const [dist, setDist] = useState(0)
  const [activeLOD, setActiveLOD] = useState(0)
  const windDirection: [number, number] = [
    Math.cos((windDirAngle * Math.PI) / 180),
    Math.sin((windDirAngle * Math.PI) / 180),
  ]

  // Derive active LOD from distance for the badge (approximation)
  useEffect(() => {
    if (dist < treeArgs.distanceLOD1) setActiveLOD(0)
    else setActiveLOD(1)
  }, [dist, treeArgs.distanceLOD1])

  return (
    <>
      <DistanceReadout onDistance={setDist} />
      <Tree {...treeArgs} forceLOD={null} windDirection={windDirection} />
      <LODRings d1={treeArgs.distanceLOD1} />

      <Html fullscreen>
        <LODBadge activeLOD={activeLOD} />
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            color: '#4a8a60',
            background: 'rgba(10,21,16,0.7)',
            padding: '6px 10px',
            borderRadius: 3,
            border: '1px solid #1e3528',
          }}
        >
          <span style={{ color: '#ff6644' }}>●</span> LOD0→1 at {treeArgs.distanceLOD1}m
          &nbsp;|&nbsp; now: {dist}m
        </div>
      </Html>
    </>
  )
}

export const AutoLOD = {
  name: 'Auto LOD (orbit to switch)',
  args: defaults,
  render: (args) => {
    const { camera } = useThree()

    useEffect(() => {
      camera.position.set(0, 18, 20)
    }, [camera])

    return <AutoLODScene {...args} />
  },
}

// ─── Story 4: LOD Comparison — three trees, forced LODs ──────────────────────

export const LODComparison = {
  name: 'LOD Comparison',
  args: defaults,
  render: (args) => {
    const { camera } = useThree()

    useEffect(() => {
      camera.position.set(0, 10, 30)
    }, [camera])

    return (
      <>
        {/* Labels */}
        <Html position={[-4, args.trunkHeight + 1, 0]} center>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              color: '#3dff8f',
              whiteSpace: 'nowrap',
            }}
          >
            LOD 0 — Full
          </div>
        </Html>
        <Html position={[4, args.trunkHeight + 1, 0]} center>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              color: '#ff6644',
              whiteSpace: 'nowrap',
            }}
          >
            LOD 1 — Impostor
          </div>
        </Html>

        <group position={[-4, 0, 0]}>
          <Tree {...args} forceLOD={0} foliageColorStem="#0a3d1a" foliageColorTip="#3dff8f" />
        </group>
        <group position={[4, 0, 0]}>
          <Tree {...args} forceLOD={1} foliageColorStem="#4a0a00" foliageColorTip="#cc4422" />
        </group>
      </>
    )
  },
}

// ─── Story 5: Stress test ─────────────────────────────────────────────────────

export const ForestTest = {
  name: 'Forest',
  args: {
    ...defaults,
    treeCount: 2000,
    spread: 250,
    trunkHeight: 10,
    rungCount: 17,
    rungSpacing: 0.6,
    branchesPerRung: 5,
    branchLength: 2.2,
    branchLengthVariance: 0.1,
    branchDroop: 0.65,
    branchAngleSpread: 0.2,
    foliageScaleTop: 0.1,
    foliageScaleBase: 1.85,
    rungStart: 0.3,
    minSpacing: 4,
  },
  argTypes: {
    treeCount: {
      control: { type: 'range', min: 10, max: 5000, step: 10 },
      table: { category: 'Forest' },
    },
    spread: {
      control: { type: 'range', min: 20, max: 2000, step: 10 },
      table: { category: 'Forest' },
    },
    minSpacing: {
      control: { type: 'range', min: 1, max: 10, step: 0.01 },
      table: { category: 'Forest' },
    },
    postProcess: {
      control: { type: 'boolean' },
    },
  },
  render: ({
    treeCount,
    spread,
    leafStyle = 1,
    foliageColorStem,
    foliageColorMid,
    foliageColorTip,
    stemStop,
    midStop,
    barkColor,
    postProcess,
    windEnabled,
    windStrength,
    windSpeed,
    windDirAngle = 0,
    minSpacing,
    ...treeArgs
  }: any) => {
    const { camera } = useThree()

    useEffect(() => {
      camera.position.set(0, 30, 100)
    }, [camera])

    return (
      <>
        <Forest
          treeCount={treeCount}
          spread={spread}
          leafStyle={leafStyle}
          foliageColorStem={foliageColorStem}
          foliageColorMid={foliageColorMid}
          foliageColorTip={foliageColorTip}
          stemStop={stemStop}
          midStop={midStop}
          barkColor={barkColor}
          sharedParams={treeArgs}
          windEnabled={windEnabled}
          windStrength={windStrength}
          windSpeed={windSpeed}
          windDirection={[
            Math.cos((windDirAngle * Math.PI) / 180),
            Math.sin((windDirAngle * Math.PI) / 180),
          ]}
          minSpacing={minSpacing}
        />
        <Ground />
      </>
    )
  },
}

const Ground = () => {
  return (
    <mesh rotation-x={-Math.PI * 0.5} receiveShadow>
      <planeGeometry args={[1000, 1000]} />
      <meshStandardMaterial color="#16300d" roughness={1} />
    </mesh>
  )
}
