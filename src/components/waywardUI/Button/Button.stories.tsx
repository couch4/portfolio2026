import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import { Button } from 'waywardUI'

const Arrow = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

const ArrowBox = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 12h6M12 9l3 3-3 3" />
  </svg>
)

const meta = {
  component: Button,
  title: 'Design System/Button',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: { onClick: fn() },
} satisfies Meta<typeof Button>

export default meta
type Story =
  | StoryObj<typeof meta>
  | {
      args: Record<string, unknown>
    }

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Button',
  },
}

export const PrimaryOutline: Story = {
  args: {
    variant: 'primaryOutline',
    children: 'Button',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Button',
  },
}

export const SecondaryOutline: Story = {
  args: {
    variant: 'secondaryOutline',
    children: 'Button',
  },
}

export const Tertiary: Story = {
  args: {
    variant: 'tertiary',
    children: 'Button',
  },
}

export const TertiaryOutline: Story = {
  args: {
    variant: 'tertiaryOutline',
    children: 'Button',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Button',
  },
}

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Button',
  },
}

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Button',
  },
}

export const ButtonWithIcon: Story = {
  args: {
    variant: 'primary',
    children: 'Button',
    icons: {
      iconAfter: <Arrow />,
    },
  },
}

export const LinkWithIcon: Story = {
  args: {
    variant: 'link',
    children: 'Button',
    icons: {
      iconAfter: <Arrow />,
    },
  },
}

export const IconButton: Story = {
  args: {
    variant: 'icon',
    icons: {
      icon: <ArrowBox />,
    },
  },
}
