import type { Meta, StoryObj } from '@storybook/react'
import { Text } from 'waywardUI'
import type { TextProps } from './Text.types'

const text = 'Lorem ipsum dolor salmat'

const allStyles: TextProps['textStyle'][] = [
  'display-lg',
  'display-sm',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p-lg',
  'p',
  'p-sm',
  'a',
]

const TypeScale = ({ mb, variant }: { mb?: string; variant: string }) => (
  <div className="flex flex-col gap-4">
    {allStyles.map((textStyle) => (
      <div key={textStyle} className="flex flex-col">
        <Text textStyle="label" variant="system" className={`text-tertiary${mb ? ` ${mb}` : ''}`}>
          {textStyle}
        </Text>
        <Text textStyle={textStyle} variant={variant} className="text-white">
          The Wayward.
        </Text>
      </div>
    ))}
  </div>
)

const meta: Meta<typeof Text> = {
  component: Text,
  title: 'Design System/Text',
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof Text>

export const Primary: Story = {
  render: () => <TypeScale variant="primary" mb={'-mb-1'} />,
}

export const Secondary: Story = {
  render: () => <TypeScale variant="secondary" mb={'mb-2'} />,
}

export const System: Story = {
  render: () => (
    <Text variant="system" className="text-tertiary">
      System label font
    </Text>
  ),
}
