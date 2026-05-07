import { MotionProps } from 'motion/react'

export interface ButtonProps extends MotionProps {
  asChild?: boolean
  variant?:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'primaryOutline'
    | 'secondaryOutline'
    | 'tertiaryOutline'
    | 'link'
    | 'iconArrow'
    | 'icon'
    | 'close'
  size?: 'sm' | 'lg'
  children?: React.ReactNode
  ref?: React.Ref<HTMLButtonElement>
  href?: string
  onClick?: () => void
  type?: HTMLButtonElement['type']
  disabled?: HTMLButtonElement['disabled']
  className?: string
  icons?: {
    icon?: React.ReactNode // If it's a sole icon Button
    iconBefore?: React.ReactNode
    iconAfter?: React.ReactNode
  }
}
