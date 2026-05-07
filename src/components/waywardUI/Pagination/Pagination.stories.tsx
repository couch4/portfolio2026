import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Pagination } from '@/components/waywardUI'

const PaginationDecorator = (Story: any, context: any) => {
  const { activeIndex } = context.args as { activeIndex: number }
  const [selectedIndex, setSelectedIndex] = useState(activeIndex)

  const handleUpdateIndex = (index: number) => {
    console.log('Updating index to:', index)
    setSelectedIndex(index)
  }

  return (
    <div className="relative p-8 flex justify-center items-center w-[40vw] h-[40vh]">
      <Story
        args={{ ...context.args, activeIndex: selectedIndex, updateIndex: handleUpdateIndex }}
      />
    </div>
  )
}

const meta = {
  component: Pagination,
  title: 'Components/Pagination',
  parameters: {
    layout: 'centered',
  },
  decorators: [PaginationDecorator],
} satisfies Meta<typeof Pagination>

export default meta
type Story =
  | StoryObj<typeof meta>
  | {
      args: Record<string, unknown>
    }

export const PaginationTimer: Story = {
  args: {
    data: [
      {
        title: 'Project 1',
        description: 'Description 1',
      },
      {
        title: 'Project 2',
        description: 'Description 2',
      },
      {
        title: 'Project 3',
        description: 'Description 3',
      },
      {
        title: 'Project 4',
        description: 'Description 4',
      },
      {
        title: 'Project 5',
        description: 'Description 5',
      },
      {
        title: 'Project 6',
        description: 'Description 6',
      },
    ],
    name: 'Pagination',
    activeIndex: 0,
    waitTime: 5,
  },
  argTypes: {
    waitTime: {
      control: { type: 'range', min: 1, max: 10, step: 1 },
    },
  },
}
