import { Meta, StoryObj } from '@storybook/react-vite'
import SkillPill from '@/components/SkillPill'
import data from './mock.json'

const meta = {
  title: 'Components/SkillPill',
  component: SkillPill,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof SkillPill>

export default meta
type Story = StoryObj<typeof meta>

export const React: Story = {
  args: {
    data,
  },
}
