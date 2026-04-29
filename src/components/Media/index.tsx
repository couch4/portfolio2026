'use client'

import { FC, Suspense, useRef } from 'react'
import Video from './Video'
import { Motion, Text } from 'waywardUI'
import { MediaProps } from './Media.types'
import clsx from 'clsx'
import Image from './Image'
import { useDimensions } from '@/hooks'

export const Media: FC<MediaProps> = ({
  data,
  sizes = '100vw',
  responsive = true,
  priority = false,
  imageQuality = 100,
  triggerPlay = false,
  modifiers,
  onClick,
  ref,
  ...props
}) => {
  const mediaRef = useRef(null)
  const { width } = useDimensions(mediaRef)

  const {
    captionWrapper: modCaptionWrapper,
    caption: modCaption,
    captionTitle: modCaptionTitle,
    captionDescription: modCaptionDescription,
    image: modImage,
    ...modifiersBase
  } = modifiers || {}

  if (!data) return null

  const imageSettings = {
    sizes,
    responsive,
    priority,
    imageQuality,
    ...(width > 0 && { width }),
    ...modImage,
  }

  let hasVideo = false
  let variant: any = <Image data={data?.image} imageSettings={imageSettings} alt="placeholder" />
  if (data?.video && data?.video?.src) {
    hasVideo = true
    variant = (
      <Suspense>
        <Video data={data} imageSettings={imageSettings} triggerPlay={triggerPlay} />
      </Suspense>
    )
  }

  if (!variant) return null

  const { caption, captionTitle, captionDescription } = data?.image || {}
  const showCaption = caption || captionTitle || captionDescription

  return (
    <Motion
      ref={ref || mediaRef}
      onClick={onClick}
      {...props}
      className={clsx('media__wrapper', [props?.className], { 'has-video': hasVideo })}
      {...modifiersBase}
    >
      {variant}
      {showCaption && (
        <Motion
          {...modCaptionWrapper}
          className={clsx('media__caption-wrapper', [modCaptionWrapper?.className])}
        >
          <Text
            text={captionTitle}
            {...modCaptionTitle}
            className={clsx('media__caption-title', [modCaptionTitle?.className])}
          />
          <Text
            text={captionDescription}
            {...modCaptionDescription}
            className={clsx('media__caption-description', [modCaptionDescription?.className])}
          />
          <Text
            text={caption}
            {...modCaption}
            className={clsx('media__caption', [modCaption?.className])}
          />
        </Motion>
      )}
    </Motion>
  )
}

Media.displayName = 'Media'
