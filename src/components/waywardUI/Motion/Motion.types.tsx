import React from 'react'
import { MotionProps as FramerProps } from 'motion/react'

type HTMLAndMotionProps = React.HTMLAttributes<HTMLElement> & FramerProps

export interface MotionBoxProps extends HTMLAndMotionProps {
  scrollTrigger?: any
  debug?: boolean
  onEnter?: any
  onEnterBack?: any
  onLeave?: any
  onLeaveBack?: any
  onRefresh?: any
  animateOnScrollDown?: boolean
  update?: any
  ref?: React.RefObject<HTMLElement | null>
  variant?:
    | 'div'
    | 'section'
    | 'footer'
    | 'header'
    | 'nav'
    | 'span'
    | 'list'
    | 'orderedList'
    | 'listItem'
    | 'details'
    | 'summary'
}

export type MotionProps = (
  className: MotionBoxProps['className'],
  styleProps: any,
) => MotionBoxProps
