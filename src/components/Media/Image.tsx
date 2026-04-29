import { FC } from 'react'
import { ImageProps } from './Media.types'
import NextImage from 'next/image'

const Image: FC<ImageProps> = ({ data, imageSettings, alt = 'media object' }) => {
  const { sizes = '100vw', responsive, priority, imageQuality = 100 } = imageSettings
  const { src, alt: altText, blurDataURL } = data || {}

  const isResponsive = responsive ? { fill: true } : {}
  const blurSettings = blurDataURL ? { blurDataURL, placeholder: 'blur' } : {}

  return (
    // @ts-ignore
    <NextImage
      /* enable cloudflare optimisation - when we get cloudflare */
      // loader={cloudflareLoader(data?.image?.src, width, imageQuality)}
      sizes={sizes}
      src={src}
      alt={altText || alt}
      priority={priority}
      quality={imageQuality}
      {...isResponsive}
      {...blurSettings}
    />
  )
}

export default Image
