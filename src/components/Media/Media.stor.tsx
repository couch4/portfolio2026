import type { Meta, StoryObj } from '@storybook/react'
import { Media } from '@/components/Media'
import data from './__mockData__.json'

const meta: Meta<typeof Media> = {
  component: Media,
  title: 'Base Components/Media',
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '50vw',
          height: '50vh',
          background: 'transarent',
          borderRadius: '0.8rem',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

const responsiveImageData = {
  ...data,
  video: null,
}

const dataAutoPlay = {
  ...data,
  video: {
    ...data.video,
    autoplay: true,
  },
}

export default meta
type Story = StoryObj<typeof Media>

export const ResponsiveImage: Story = {
  args: {
    data: responsiveImageData,
  },
}

export const MediaWithVideo: Story = {
  args: {
    data,
  },
}

// export const MediaWithVideoAutoplay: Story = {
//   args: {
//     data: dataAutoPlay,
//   },
// }
