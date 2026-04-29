import React from 'react'
import { MotionProps } from 'motion/react'

type HTMLAndMotionProps = React.HTMLAttributes<HTMLElement> & MotionProps

export interface CarouselProps extends HTMLAndMotionProps {
  items?: any
  loop?: boolean
  animationStyle?: 'default' | 'elegant' | 'bouncy' | 'slow' | 'superSlow'
  gap?: number
  width?: number | string | Record<string, any>
  height?: number | string | Record<string, any>
  columns?: number | string | Record<string, any>
  crop?: boolean
  isClickable?: boolean
  useVelocity?: boolean
  snap?: boolean
  ref?: React.RefObject<HTMLElement | null>
  variableWidth?: boolean
  onSwitch?: (index: number) => void
  onSwitchComplete?: (index: number) => void
  defaultValue?: number
  variant?: string
  noResize?: boolean
}

export type CarouselVars = (
  width: CarouselProps['width'],
  height: CarouselProps['height'],
  className: CarouselProps['className'],
  crop: CarouselProps['crop'],
) => Record<any, any>

export interface ICarouselWrapper {
  items: CarouselProps['items']
  animationStyle: CarouselProps['animationStyle']
  dragWidth: number
  dragHeight?: number
  gap: number
  crop: boolean
  loop?: boolean
  useVelocity?: boolean
  columnNum: number
}

export interface ICarouselItem {
  index: number
  item: any
  width: number
  height?: number
  slideWidth: number
  length: number
  loop?: boolean
  columnNum: number
  onClick: (index: number) => void
  animationStyle: CarouselProps['animationStyle']
  variant?: CarouselProps['variant']
}

export type DragConstraints = {
  top?: number
  right?: number
  bottom?: number
  left?: number
}
