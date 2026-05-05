'use client'

import { FC } from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import { IconProps } from './Icon.types'

const Icon: FC<IconProps> = ({ data, ...props }) => {
  if (!data) return null
  const { url, svgSrc } = data
  const isAnimated = props?.initial || props?.animate || props?.variants || props?.layout

  const IconWrapper = isAnimated ? motion.span : 'span'

  if (!url && !svgSrc) return null

  return svgSrc ? (
    <IconWrapper dangerouslySetInnerHTML={{ __html: svgSrc }} {...props} className="icon" />
  ) : (
    <IconWrapper {...props}>
      <Image src={url} alt="icon" width={42} height={42} />
    </IconWrapper>
  )
}

export default Icon
