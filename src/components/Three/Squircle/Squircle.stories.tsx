import type { Meta, StoryObj } from '@storybook/react'
import Canvas from '@/components/Three/Canvas'
import { Environment, OrbitControls } from '@react-three/drei'
import SquircleMesh from './index'

const meta: Meta = {
  title: '3D/Squircle',
  component: SquircleMesh,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    width: {
      control: { type: 'range', min: 0.5, max: 5, step: 0.1 },
      description: 'Total width of the squircle',
    },
    height: {
      control: { type: 'range', min: 0.5, max: 5, step: 0.1 },
      description: 'Total height of the squircle',
    },
    radius: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description: 'Corner radius in world units (0 = rectangle)',
    },
    segments: {
      control: { type: 'range', min: 32, max: 256, step: 8 },
      description: 'Perimeter vertex count (higher = smoother edges)',
    },
    // barrelDistortion: {
    //   control: { type: 'range', min: 0, max: 1, step: 0.01 },
    //   description: 'Barrel distortion factor (0 = no distortion, 1 = maximum distortion)',
    // },
  },
  decorators: [
    (Story, context) => {
      const { renderer, stats = false, orbit = false } = context.globals
      const { wireframe } = context.args

      return (
        // @ts-ignore
        <Canvas gl={renderer} stats={stats} clearColor="#05080F">
          <Environment preset="warehouse" />
          <Story
            args={{
              ...context.args,
              children: <meshStandardMaterial wireframe={wireframe} color="pink" />,
            }}
          />
          {orbit && <OrbitControls />}
        </Canvas>
      )
    },
  ],
}

export default meta

export const Default: StoryObj = {
  args: {
    width: 5,
    height: 3,
    radius: 0.8,
    segments: 128,
    barrelDistortion: true,
    wireframe: false,
  },
}
