'use client'

import { createElement, useImperativeHandle, useRef, FC } from 'react'
import { motion } from 'motion/react'
import { MotionBoxProps } from './Motion.types'
import { motionBox } from './Motion.props'

const Motion: FC<MotionBoxProps> = ({ className, variant = 'div', ref, ...props }) => {
  const innerRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => innerRef.current!, [])

  const allProps = {
    ...props,
    ...motionBox(className, props.style),
    suppressHydrationWarning: true,
  }

  return createElement(getMotionTag(variant), { ...allProps, ref: innerRef }, props.children)
}

Motion.displayName = 'Motion'

export default Motion

const getMotionTag = (tag = 'div') => {
  const tags: any = {
    div: motion.div,
    section: motion.section,
    footer: motion.footer,
    header: motion.header,
    nav: motion.nav,
    span: motion.span,
    list: motion.ul,
    orderedList: motion.ol,
    listItem: motion.li,
  }

  return tags[tag]
}
