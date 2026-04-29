import type { Meta, StoryObj } from '@storybook/react'
import { camelToSpace } from '@/utilities/formatting'
import { Text } from '@/components/waywardUI'

const meta: Meta = {
  title: 'Design System/Colours',
  parameters: {
    layout: 'centered',
  },
}

export default meta

const groups = [
  {
    label: 'Base',
    colors: ['background'],
  },
  {
    label: 'Copy',
    colors: ['copy', 'copySecondary'],
  },
  {
    label: 'Brand',
    colors: ['primary', 'secondary', 'tertiary'],
  },
  {
    label: 'Accent',
    colors: ['accent', 'accentSecondary', 'accentTertiary'],
  },
  {
    label: 'Status',
    colors: ['success', 'warning', 'error'],
  },
]

const dark = ['copy', 'accent']

const getSwatches = (colors: string[]) => {
  return colors.map((color) => {
    const isDark = dark.includes(color)

    return (
      <div
        key={color}
        className={`w-60 h-32 rounded-md flex items-center justify-center font-semibold text-lg bg-${color} border border-secondary/20`}
      >
        <Text
          variant="primary"
          textStyle="h6"
          className={`${isDark ? 'text-black' : 'text-white'} font-semibold uppercase`}
        >
          {camelToSpace(color)}
        </Text>
      </div>
    )
  })
}

export const Colors: StoryObj = {
  render: () => (
    <>
      <h1 className="text-10xl font-bold mb-10 font-primary uppercase">Colors</h1>
      <div className="flex flex-col gap-4">
        {groups.map(({ label, colors }) => (
          <div key={label} className={`flex flex-col gap-2`}>
            <Text variant="system" className="text-tertiary">
              {label}
            </Text>
            <div className={`flex gap-4`}>{getSwatches(colors)}</div>
          </div>
        ))}
      </div>
    </>
  ),
}
