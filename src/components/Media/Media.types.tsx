import React from 'react'

export type MediaType = {
  image: {
    src: string
    alt: string
    blurDataURL?: string
    caption?: string
    captionTitle?: string
    captionDescription?: string
  }
  video: {
    src?: string | null
    fullScreen?: boolean
    autoplay?: boolean
    loop?: boolean
    muted?: boolean
  } | null
}

export interface MediaProps {
  data: MediaType
  sizes?: string
  responsive?: boolean
  priority?: boolean
  imageQuality?: any
  className?: string
  triggerPlay?: boolean
  ref?: React.RefObject<HTMLDivElement>
  modifiers?: any
  onClick?: () => void
}

export interface ImageProps {
  data: MediaType['image']
  imageSettings: {
    sizes?: string
    responsive?: boolean
    priority?: boolean
    imageQuality?: any
    width?: number
  }
  alt?: string
}
