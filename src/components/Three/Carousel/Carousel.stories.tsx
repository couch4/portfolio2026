import type { Meta, StoryObj } from '@storybook/react'
import Canvas from '@/components/Three/Canvas'
import { Environment, OrbitControls } from '@react-three/drei'
import Carousel from './index'
import ProjectItem from '../Project/chunks/ProjectItem'
import mock from '@/components/Three/Project/mock.json'
import carouselMock from './mock.json'

const meta: Meta = {
  title: '3D/Carousel',
  component: Carousel,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story, context) => {
      const { renderer, stats = false, orbit = false } = context.globals

      return (
        <Canvas gl={renderer} stats={stats}>
          <fog attach="fog" args={['#05080F', 0, 45]} />
          <Environment preset="warehouse" />
          <Story />
          {orbit && <OrbitControls />}
        </Canvas>
      )
    },
  ],
}

export default meta

export const CarouselItemLeft: StoryObj = {
  render: () => <ProjectItem data={mock} />,
}

export const CarouselItemRight: StoryObj = {
  render: () => <ProjectItem data={{ ...mock, align: 'right' }} />,
}

export const CarouselLoop: StoryObj = {
  render: (args) => <Carousel items={carouselMock} {...args} />,
  argTypes: {
    debug: { control: 'boolean' },
    gap: { control: { type: 'number', step: 0.1 } },
    defaultValue: { control: 'number' },
  },
  args: {
    debug: false,
    gap: 0.5,
    defaultValue: 0,
  },
}
