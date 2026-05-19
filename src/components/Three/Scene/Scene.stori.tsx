import { Suspense } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import Canvas from '@/components/Three/Canvas'
import VHS from '@/components/Three/Effects/VHS'
import { OrbitControls } from '@react-three/drei'
import Scene from '@/components/Three/Scene'
import { EffectComposer } from '@react-three/postprocessing'

const meta: Meta = {
  title: '3D/Main Scene',
  component: Scene,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story, context) => {
      const { renderer, stats = false, orbit = false } = context.globals
      const { postProcess = false, ...postProcessProps } = context.args

      return (
        <Canvas gl={renderer} stats={stats}>
          {/* <Environment preset="warehouse" /> */}
          <Suspense fallback={null}>
            <Story />
          </Suspense>
          {orbit && <OrbitControls />}
          {postProcess && (
            <EffectComposer>
              <VHS {...postProcessProps} />
            </EffectComposer>
          )}
        </Canvas>
      )
    },
  ],
}

export default meta

export const SceneStory: StoryObj = {
  name: 'Scene',
  argTypes: {
    debug: { control: 'boolean' },
    gap: { control: { type: 'number', step: 0.1 } },
    defaultValue: { control: 'number' },
    postProcess: { control: 'boolean' },
    intensity: { control: { type: 'range', min: -10, max: 10, step: 0.1 } },
    noiseStrength: { control: { type: 'range', min: 0, max: 1, step: 0.1 } },
    scanlineIntensity: { control: { type: 'range', min: 0, max: 1, step: 0.1 } },
    chromaShift: { control: { type: 'range', min: 0, max: 1, step: 0.1 } },
    ghostStrength: { control: { type: 'range', min: 0, max: 1, step: 0.1 } },
    trackingError: { control: { type: 'range', min: 0, max: 1, step: 0.1 } },
    barrelDistortion: { control: { type: 'range', min: 0, max: 1, step: 0.1 } },
    handheldStrength: { control: { type: 'range', min: 0, max: 20, step: 0.1 } },
    tapeSpeed: { control: { type: 'range', min: 0, max: 2, step: 0.1 } },
  },
  args: {
    debug: false,
    postProcess: true,
    intensity: 1,
    noiseStrength: 0.1,
    scanlineIntensity: 0.9,
    chromaShift: 0.3,
    ghostStrength: 0.2,
    trackingError: 0.2,
    barrelDistortion: 0,
    handheldStrength: 0,
    tapeSpeed: 1,
  },
}
