'use client'

import { ReactNode } from 'react'
import { ButtonProps } from './Button.types'
import { buttonWrapper } from './Button.styles'
import { Text } from 'waywardUI'
import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'

const Button: React.FC<ButtonProps> = ({
  asChild = false,
  size,
  variant = 'primary',
  text,
  href,
  onClick,
  icons = {},
  ref,
  ...props
}) => {
  const router = useRouter()

  if (!text && !href && !icons?.icon) return null
  // @ts-ignore
  const isAnimated = props?.initial || props?.animate || props?.variants

  const handleClick = () => {
    if (onClick) {
      onClick()
    }
    if (href) {
      router.push(href)
    }
  }

  let btnContent: ReactNode = <Text text={text} icons={icons} textStyle="button" />
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
