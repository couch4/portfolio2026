import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { GrassClumps, GrassGround } from './'
import Canvas from '@/components/Three/Canvas'
import { Environment, OrbitControls } from '@react-three/drei'
import VHS from '@/components/Three/Effects/VHS'
import type { Meta } from '@storybook/react'

const meta: Meta = {
  title: '3D/Main Scene/Grass',
  globals: {
    orbit: true,
    renderer: 'webgl',
  },
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
          {/* {(postProcess || ssao) && (
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
          )} */}
        </Canvas>
      )
    },
  ],
}
export default meta

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

const Ground = () => {
  return (
    <mesh rotation-x={-Math.PI * 0.5} receiveShadow>
      <planeGeometry args={[1000, 1000]} />
      <meshStandardMaterial color="#16300d" roughness={1} />
    </mesh>
  )
}

// ─── Story 6: Grass field — standalone GrassClumps ───────────────────────────

export const GrassField = {
  name: 'Grass Clumps',
  args: {
    fieldCount: 60,
    fieldSpread: 20,
    bladesPerClump: 14,
    clumpRadius: 0.8,
    height: 0.55,
    baseWidth: 0.1,
    tipWidth: 0.0,
    lean: 0.35,
    segments: 5,
    windEnabled: true,
    windStrength: 0.07,
    windSpeed: 1.2,
    windDirAngle: 0,
    colorBase: '#1a3a0a',
    colorTip: '#6dc230',
    lightColor: '#ffe8c0',
    ambientColor: '#1a2f14',
    translucency: 0.55,
    rimStrength: 0.35,
  },
  argTypes: {
    fieldCount: {
      control: { type: 'range', min: 5, max: 200, step: 5 },
      description: 'Number of clump origins in the field',
      table: { category: 'Field' },
    },
    fieldSpread: {
      control: { type: 'range', min: 5, max: 80, step: 5 },
      description: 'Field scatter radius (metres)',
      table: { category: 'Field' },
    },
    bladesPerClump: {
      control: { type: 'range', min: 1, max: 40, step: 1 },
      description: 'Blades per clump origin',
      table: { category: 'Clump' },
    },
    clumpRadius: {
      control: { type: 'range', min: 0.1, max: 2.5, step: 0.05 },
      description: 'Scatter radius per clump (metres)',
      table: { category: 'Clump' },
    },
    height: {
      control: { type: 'range', min: 0.1, max: 2.0, step: 0.05 },
      description: 'Blade height',
      table: { category: 'Shard' },
    },
    baseWidth: {
      control: { type: 'range', min: 0.02, max: 0.4, step: 0.01 },
      description: 'Blade width at root',
      table: { category: 'Shard' },
    },
    tipWidth: {
      control: { type: 'range', min: 0.0, max: 0.2, step: 0.005 },
      description: 'Blade width at tip (0 = sharp)',
      table: { category: 'Shard' },
    },
    lean: {
      control: { type: 'range', min: 0.0, max: 1.2, step: 0.05 },
      description: 'Forward lean baked into Bézier curve',
      table: { category: 'Shard' },
    },
    segments: {
      control: { type: 'range', min: 2, max: 12, step: 1 },
      description: 'Vertical blade segments',
      table: { category: 'Shard' },
    },
    windEnabled: { control: 'boolean', table: { category: 'Wind' } },
    windStrength: {
      control: { type: 'range', min: 0, max: 0.5, step: 0.01 },
      table: { category: 'Wind' },
    },
    windSpeed: {
      control: { type: 'range', min: 0.1, max: 5.0, step: 0.1 },
      table: { category: 'Wind' },
    },
    windDirAngle: {
      control: { type: 'range', min: 0, max: 360, step: 5 },
      table: { category: 'Wind' },
    },
    colorBase: { control: 'color', table: { category: 'Visuals' } },
    colorTip: { control: 'color', table: { category: 'Visuals' } },
    lightColor: { control: 'color', table: { category: 'Lighting' } },
    ambientColor: { control: 'color', table: { category: 'Lighting' } },
    translucency: {
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: 'Backlit subsurface glow',
      table: { category: 'Lighting' },
    },
    rimStrength: {
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: 'Grazing-angle rim highlight',
      table: { category: 'Lighting' },
    },
  },
  render: ({
    fieldCount,
    fieldSpread,
    bladesPerClump,
    clumpRadius,
    height,
    baseWidth,
    tipWidth,
    lean,
    segments,
    windEnabled,
    windStrength,
    windSpeed,
    windDirAngle = 0,
    colorBase,
    colorTip,
    lightColor,
    ambientColor,
    translucency,
    rimStrength,
  }: any) => {
    const { camera } = useThree()

    useEffect(() => {
      camera.position.set(0, 2, 10)
    }, [camera])

    return (
      <>
        <GrassClumps
          fieldCount={fieldCount}
          fieldSpread={fieldSpread}
          shardParams={{ height, baseWidth, tipWidth, lean, segments }}
          clumpParams={{ bladesPerClump, clumpRadius }}
          windEnabled={windEnabled}
          windStrength={windStrength}
          windSpeed={windSpeed}
          windDirection={[
            Math.cos((windDirAngle * Math.PI) / 180),
            Math.sin((windDirAngle * Math.PI) / 180),
          ]}
          colorBase={colorBase}
          colorTip={colorTip}
          lightColor={lightColor}
          ambientColor={ambientColor}
          translucency={translucency}
          rimStrength={rimStrength}
        />
        <Ground />
      </>
    )
  },
}

// ─── Story 7: Grass Ground Shader — standalone ───────────────────────────────

export const GrassGroundShader = {
  name: 'Grass Ground Shader',
  args: {
    size: 100,
    col1: '#99de80',
    col2: '#373d0d',
    col3: '#ffff19',
    col4: '#ff66b3',
    ambient: 0.85,
    gScale: 24,
    gHeight: 4,
    terrainScale: 0.07,
    terrainHeight: 1.5,
  },
  argTypes: {
    size: {
      control: { type: 'range', min: 5, max: 120, step: 5 },
      description: 'Plane size (metres)',
      table: { category: 'Plane' },
    },
    col1: { control: 'color', description: 'Base grass colour', table: { category: 'Colours' } },
    col2: {
      control: 'color',
      description: 'Dry/warm patch colour',
      table: { category: 'Colours' },
    },
    col3: {
      control: 'color',
      description: 'Bright highlight patch',
      table: { category: 'Colours' },
    },
    col4: { control: 'color', description: 'Accent patch', table: { category: 'Colours' } },
    ambient: {
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: 'Ambient brightness',
      table: { category: 'Lighting' },
    },
    gScale: {
      control: { type: 'range', min: 1, max: 60, step: 0.5 },
      description: 'Grass noise frequency — higher = finer blades',
      table: { category: 'Grass' },
    },
    gHeight: {
      control: { type: 'range', min: 0.1, max: 8, step: 0.1 },
      description: 'Max grass blade height (world units)',
      table: { category: 'Grass' },
    },
    terrainScale: {
      control: { type: 'range', min: 0.005, max: 0.3, step: 0.005 },
      description: 'Terrain noise frequency',
      table: { category: 'Terrain' },
    },
    terrainHeight: {
      control: { type: 'range', min: 0, max: 20, step: 0.5 },
      description: 'Peak terrain height variation',
      table: { category: 'Terrain' },
    },
  },
  render: ({
    size,
    col1,
    col2,
    col3,
    col4,
    ambient,
    gScale,
    gHeight,
    terrainScale,
    terrainHeight,
  }: any) => {
    const { camera } = useThree()

    useEffect(() => {
      camera.position.set(0, 100, 40)
    }, [camera])

    return (
      <GrassGround
        size={size}
        col1={col1}
        col2={col2}
        col3={col3}
        col4={col4}
        ambient={ambient}
        gScale={gScale}
        gHeight={gHeight}
        terrainScale={terrainScale}
        terrainHeight={terrainHeight}
      />
    )
  },
}
