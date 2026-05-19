import type { Meta, StoryObj } from '@storybook/react'
import Canvas from '@/components/Three/Canvas'
import { Environment, OrbitControls } from '@react-three/drei'
import Project from './index'
import mock from './mock.json'

const meta: Meta = {
  title: '3D/Project',
  component: Project,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story, context) => {
      const { renderer, stats = false, orbit = false } = context.globals

      return (
        // @ts-ignore
        <Canvas gl={renderer} stats={stats} clearColor="#05080F">
          <Environment preset="warehouse" />
          <Story />
          {orbit && <OrbitControls />}
        </Canvas>
      )
    },
  ],
}

export default meta

export const ProjectLeft: StoryObj = {
  args: {
    data: {
      ...mock,
    },
  },
}

export const ProjectRight: StoryObj = {
  args: {
    data: {
      ...mock,
      align: 'right',
    },
  },
}
