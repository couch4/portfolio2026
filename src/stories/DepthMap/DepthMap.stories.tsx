import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DepthMapCreator } from '.'

const meta = {
  title: 'Utils/CreateDepthMap',
  component: DepthMapCreator,
  decorators: [
    (Story) => (
      <div className="min-h-screen flex items-start justify-center bg-gray-900 text-white w-full p-5">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Generate depth maps from uploaded images entirely in the browser. Uses Depth Anything V2 (MiDaS-inspired) via ONNX Runtime through Transformers.js — no server round-trip or API key required. The model is downloaded once and cached in the browser.',
      },
    },
  },
} satisfies Meta<typeof DepthMapCreator>

export default meta
type Story = StoryObj<typeof meta>

export const Upload: Story = {}
