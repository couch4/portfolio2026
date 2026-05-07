import type { Meta, StoryObj } from '@storybook/react'
import { camelToSpace } from '@/utilities/formatting'
import { Text } from '@/components/waywardUI'
import twConfig from 'tailwind.config.mjs'
import { getCssVarName, getRgbTriplet, rgbToHex } from '@/utilities/colors'

const twColors = twConfig.theme.extend.colors as Record<string, string>

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
    colors: ['background', 'surface', 'border'],
  },
  {
    label: 'Copy',
    colors: ['copy', 'copySecondary', 'copySoft'],
  },
  {
    label: 'Brand / Alpine Colors',
    colors: ['primary', 'secondary', 'tertiary'],
  },
  {
    label: 'Accent / 80s Tech',
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
      <div className="flex flex-col">
        <div
          key={color}
          className={`w-60 h-20 rounded-md flex items-center justify-center font-semibold text-lg bg-${color} border border-border gap-2 mb-2`}
        />
        <Text textStyle="label" className="text-copy-secondary">
          {camelToSpace(color)}
        </Text>
        {(() => {
          const rgb = getRgbTriplet(twColors[color])
          if (!rgb) return null
          return (
            <>
              <Text textStyle="label" className="text-xs text-copy/50">
                {rgbToHex(rgb)}
              </Text>
              <Text textStyle="label" className="text-xs text-copy/50">
                {`rgb(${rgb.join(', ')})`}
              </Text>
            </>
          )
        })()}
      </div>
    )
  })
}

export const Colors: StoryObj = {
  render: () => (
    <>
      <h1 className="text-10xl font-bold mb-10 font-primary uppercase">Colors</h1>
      <div className="flex flex-col gap-10 pb-20">
        {groups.map(({ label, colors }) => (
          <div key={label} className={`flex flex-col gap-2`}>
            <Text textStyle="h4" className="text-copy uppercase font-medium">
              {label}
            </Text>
            <div className={`flex gap-4`}>{getSwatches(colors)}</div>
          </div>
        ))}
      </div>
    </>
  ),
}
