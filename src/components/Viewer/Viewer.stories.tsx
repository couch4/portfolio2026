import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import Viewer from '@/components/Viewer'
import CanvasBackground from '@/stories/components/CanvasBackground'
import data from './mock.json'

const BG_URL =
  'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'

const meta = {
  component: Viewer,
  title: 'Components/Viewer',
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    slideFadeDuration: {
      control: { type: 'range', min: 100, max: 2000, step: 50 },
      description: 'Transition duration in milliseconds',
    },
    depthIntensity: {
      control: { type: 'range', min: 0, max: 1.5, step: 0.05 },
      description: 'Depth parallax intensity',
    },
    blurXIntensity: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description: 'Horizontal blur intensity during transition',
    },
    showDepthMap: {
      control: { type: 'boolean' },
      description: 'Show depth map preview instead of albedo',
    },
  },
  decorators: [
    (Story) => (
      <>
        <CanvasBackground bg={BG_URL} />
        <div className="relative p-8 flex justify-center items-center w-[100vw] h-[100vh]">
          <Story />
        </div>
      </>
    ),
  ],
} satisfies Meta<typeof Viewer>

export default meta
type Story =
  | StoryObj<typeof meta>
  | {
      args: Record<string, unknown>
    }

// Wrapper component to drive activeIndex with prev/next buttons
interface ImageCarouselWrapperProps {
  slideFadeDuration?: number
  depthIntensity?: number
  blurXIntensity?: number
  showDepthMap?: boolean
}

const ImageCarouselWrapper = ({
  slideFadeDuration,
  depthIntensity,
  blurXIntensity,
  showDepthMap,
}: ImageCarouselWrapperProps) => {
  const images = data.images

  return (
    <div className="relative flex flex-col items-center gap-4 w-[60vw]">
      <Viewer
        data={images}
        slideFadeDuration={slideFadeDuration}
        depthIntensity={depthIntensity}
        blurXIntensity={blurXIntensity}
        showDepthMap={showDepthMap}
      />
    </div>
  )
}

export const ImageDepthCarousel: Story = {
  render: (args) => <ImageCarouselWrapper {...args} />,
  args: {
    slideFadeDuration: 1200,
    depthIntensity: 0.4,
    blurXIntensity: 0.5,
    showDepthMap: false,
  },
}

export const VideoPlayer: Story = {
  args: {},
}

export const ImageAndVideoCarousel: Story = {
  args: {},
}
