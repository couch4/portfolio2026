import type { Meta, StoryObj } from '@storybook/react'
import { Carousel } from 'waywardUI'
import { Media } from '@/components/Media'

const urls: any = [
  'https://images.pexels.com/photos/14850976/pexels-photo-14850976.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://images.pexels.com/photos/258393/pexels-photo-258393.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://images.pexels.com/photos/20988839/pexels-photo-20988839/free-photo-of-glenfinnan-viaduct-in-scotland.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://images.pexels.com/photos/3698327/pexels-photo-3698327.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://images.pexels.com/photos/19434724/pexels-photo-19434724/free-photo-of-view-of-the-bridge-of-sighs-in-oxford-england-united-kingdom.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://images.pexels.com/photos/7065481/pexels-photo-7065481.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://images.pexels.com/photos/20141298/pexels-photo-20141298/free-photo-of-national-museum-of-scotland-in-edinburgh.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://images.pexels.com/photos/2716774/pexels-photo-2716774.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://images.pexels.com/photos/247431/pexels-photo-247431.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
]

const items = urls.map((src: string, i: number) => {
  const data = {
    image: {
      src,
      alt: `image${i}`,
    },
    video: null,
  }

  return <Media key={`image${i}`} data={data} sizes="(max-width: 800px) 100vw, 60vw" priority />
})

const meta: Meta<typeof Carousel> = {
  component: Carousel,
  title: 'Utility Components/Carousel',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'focus', 'bookcase', 'fadeInAndScale'],
    },
  },
  args: {
    animationStyle: 'default',
    variant: 'primary',
  },
}

export default meta
type Story = StoryObj<typeof Carousel>

export const CroppedDefault: Story = {
  args: {
    items,
    crop: true,
    gap: 0,
    width: 661,
    height: 441,
  },
}

export const CroppedElegant: Story = {
  args: {
    items,
    crop: true,
    gap: 0,
    width: 661,
    height: 441,
    animationStyle: 'elegant',
  },
}

export const CroppedBouncy: Story = {
  args: {
    items,
    crop: true,
    gap: 0,
    width: 661,
    height: 441,
    animationStyle: 'bouncy',
  },
}

export const UncroppedWithGap: Story = {
  args: {
    items,
    crop: false,
    gap: 100,
    width: 661,
    height: 441,
  },
}

export const Focus: Story = {
  parameters: {
    backgrounds: {
      default: 'dark',
    },
  },
  args: {
    items,
    crop: false,
    gap: 0,
    variant: 'focus',
    width: 661,
    height: 441,
  },
}

export const BookcaseLooping: Story = {
  args: {
    items,
    crop: false,
    loop: true,
    variant: 'bookcase',
    width: 661,
    height: 441,
    animationStyle: 'elegant',
  },
}

export const FadeAndScaleLooping: Story = {
  args: {
    items,
    crop: false,
    loop: true,
    variant: 'fadeInAndScale',
    animationStyle: 'elegant',
    width: 661,
    height: 441,
  },
}
