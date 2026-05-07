import { FC, useMemo } from 'react'
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
  icons,
  ...props
}) => {
  const textTag: TextTag =
    textStyle === 'animatedSpan' ? motion.span : usePTag.includes(textStyle) ? 'p' : textStyle
  const MotionTag = useMemo(() => motion.create(textTag as any), [textTag])
  const MotionLink = useMemo(() => motion.create(Link), [])

  if (!children || (typeof children === 'string' && children.length === 0)) return null

  const isAnimated: boolean = Boolean(
    initial || animate || variants || props?.layoutId || props?.layout,
  )

  const formattedText = DOMPurify.sanitize(children as string, {
    ALLOWED_ATTR: ['className', 'class'],
    ALLOWED_TAGS: ['br', 'span'],
  })

  const hasIcons = icons?.iconBefore || icons?.iconAfter

  const content = (
    <>
      {icons?.iconBefore}
      <span dangerouslySetInnerHTML={{ __html: formattedText }} />
      {icons?.iconAfter}
    </>
  )

  const allProps = {
    ...props,
    className: clsx([className, 'text', `text-${textStyle}`], camelToHyphen(variant)),
    ...(hasIcons ? { children: content } : { dangerouslySetInnerHTML: { __html: formattedText } }),
  }
  let motionProps = {}

  if (href) {
    const LinkComponent = isAnimated ? MotionLink : Link
    return <LinkComponent href={href} {...allProps} />
  }

  let Component: any = textTag
  if (isAnimated) {
    Component = MotionTag
    motionProps = {
      initial,
      animate,
      variants,
    }
  }
  return <Component ref={ref} {...allProps} {...motionProps} />
}

export default Text
