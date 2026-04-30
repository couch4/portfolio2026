'use client'

import { ReactNode } from 'react'
import { ButtonProps } from './Button.types'
import { buttonWrapper } from './Button.styles'
import { Text } from 'waywardUI'
import { motion } from 'motion/react'

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
  if (!children && !href && !icons?.icon) return null
  // @ts-ignore
  const isAnimated = props?.initial || props?.animate || props?.variants

  const handleClick = () => {
    if (onClick) {
      onClick()
    }
    if (href) {
      // router.push(href)
    }
  }

  let btnContent: ReactNode = (
    <Text icons={icons} textStyle="button">
      {children}
    </Text>
  )
  if (variant === 'icon') {
    btnContent = icons?.icon || icons?.iconBefore || icons?.iconAfter
  }

  const Component = isAnimated ? motion.button : 'button'
  return (
    <Component
      role="button"
      tabIndex="0"
      ref={ref}
      {...buttonWrapper(variant, size, props)}
      onClick={handleClick}
    >
      {btnContent}
    </Component>
  )
}

export default Button
