import { FC } from 'react'
import clsx from 'clsx'
import DOMPurify from 'isomorphic-dompurify'
import Link from 'next/link'
import { camelToHyphen } from '@/utilities/formatting'
import { motion } from 'motion/react'
import { TextProps, TextTag, usePTag } from './Text.types'

const Text: FC<TextProps> = ({
  textStyle = 'p',
  asChild = false,
  href,
  ref,
  variant = 'primary',
  className,
  initial,
  animate,
  variants,
  children,
  ...props
}) => {
  if (!children || (typeof children === 'string' && children.length === 0)) return null

  const isAnimated: boolean = Boolean(
    initial || animate || variants || props?.layoutId || props?.layout,
  )

  const formattedText = DOMPurify.sanitize(children as string)

  const allProps = {
    ...props,
    className: clsx([className, 'text', `text-${textStyle}`], camelToHyphen(variant)),
    dangerouslySetInnerHTML: { __html: formattedText },
  }
  let motionProps = {}

  if (href) {
    const LinkComponent = isAnimated ? motion.create(Link) : Link
    return <LinkComponent href={href} {...allProps} />
  }

  const textTag: TextTag =
    textStyle === 'animatedSpan' ? motion.span : usePTag.includes(textStyle) ? 'p' : textStyle
  let Component: any = textTag
  if (isAnimated) {
    Component = motion.create(Component)
    motionProps = {
      initial,
      animate,
      variants,
    }
  }
  return <Component ref={ref} {...allProps} {...motionProps} />
}

export default Text
