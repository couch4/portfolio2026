'use client'

import { ReactNode } from 'react'
import { ButtonProps } from './Button.types'
import { buttonWrapper } from './Button.styles'
import { Text } from 'waywardUI'
import { motion } from 'motion/react'
import { X } from 'lucide-react'

const Button: React.FC<ButtonProps> = ({
  size,
  variant = 'primaryBold',
  href,
  onClick,
  icons = {},
  ref,
  children,
  ...props
}) => {
  if (!children && !href && !icons?.icon && variant !== 'close') return null
  // @ts-ignore
  const isAnimated = props?.initial || props?.animate || props?.variants

  const handleClick = () => {
    if (href) return
    onClick?.()
  }

  let btnContent: ReactNode = (
    <Text icons={icons} textStyle="button">
      {children}
    </Text>
  )
  if (variant === 'icon') {
    btnContent = icons?.icon || icons?.iconBefore || icons?.iconAfter
  }
  if (variant === 'close') {
    btnContent = <X />
  }
  if (href) {
    // @TODO add handling for links/href
  }

  const Component = isAnimated ? motion.button : 'button'

  return (
    <Component
      role="button"
      tabIndex="0"
      ref={ref}
      {...buttonWrapper(variant, size, props)}
      onClick={handleClick}
      style={{ pointerEvents: 'auto' }}
    >
      {btnContent}
    </Component>
  )
}

export default Button
