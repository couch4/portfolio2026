import clsx from 'clsx'
import { MotionProps } from './Motion.types'

export const motionBox: MotionProps = (classes, styleProps) => {
  return {
    className: clsx(classes),
    style: { ...styleProps },
  }
}
