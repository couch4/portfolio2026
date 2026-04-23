import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { GaussianSplatGenerator } from '.'

const meta = {
  title: 'Utils/GaussianSplatGenerator',
  component: GaussianSplatGenerator,
  decorators: [
    (Story, globals) => (
      <div className="min-h-screen flex items-start justify-center bg-gray-900 text-white w-full p-5">
        <Story stats={globals.stats} gl={globals.renderer} />
      </div>
    ),
  ],
  argTypes: {
    viewMode: {
      control: { type: 'radio' },
      options: ['splat', 'shader', 'both'],
      description:
        'splat — Gaussian Splat cloud · shader — fake-3D parallax (mouse to look around)',
    },
    depthScale: {
      control: { type: 'range', min: 0, max: 0.5, step: 0.01 },
      description:
        'Max Z displacement: white=+depthScale, black=−depthScale. Rebuilds splat on change (debounced 300ms).',
    },
    splatSize: {
      control: { type: 'range', min: 0, max: 2, step: 0.05 },
      description:
        'Gaussian covariance blur added to each splat. Larger = bigger, softer points. No rebuild.',
    },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Upload an image to generate a depth map via Depth Anything V2 (ONNX, in-browser), then visualise the result as a 3D Gaussian Splat scene rendered with Spark.',
      },
    },
  },
} satisfies Meta<typeof GaussianSplatGenerator>

export default meta
type Story = StoryObj<typeof meta>

export const Upload: Story = {
  args: {
    viewMode: 'splat',
    depthScale: 2,
    splatSize: 0.3,
  },
}
