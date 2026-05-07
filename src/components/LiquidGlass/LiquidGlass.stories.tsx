import type { Meta, StoryObj } from '@storybook/react'
import LiquidGlass from '@/components/LiquidGlass'
import { Text } from '@/components/waywardUI'
import CanvasBackground from '@/stories/components/CanvasBackground'

const meta = {
  component: LiquidGlass,
  title: 'Components/LiquidGlass',
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <>
        <CanvasBackground />
        <div className="relative p-8 flex justify-center items-center w-[40vw] h-[40vh]">
          <Story />
        </div>
      </>
    ),
  ],
} satisfies Meta<typeof LiquidGlass>

export default meta
type Story =
  | StoryObj<typeof meta>
  | {
      args: Record<string, unknown>
    }

export const LiquidGlassDefault: Story = {
  args: {
    name: 'LiquidGlass',
    drag: true,
    abberation: 5,
    turbulence: 10,
    blurRadius: 40,
    children: (
      <Text
        textStyle="h2"
        variant="primaryBold"
        className="text-white flex justify-center items-center h-full"
      >
        Drag me!
      </Text>
    ),
  },
  argTypes: {
    abberation: {
      control: 'range',
      min: 0,
      max: 10,
    },
    turbulence: {
      control: 'range',
      min: 0,
      max: 100,
    },
    blurRadius: {
      control: 'range',
      min: 0,
      max: 100,
    },
  },
}
