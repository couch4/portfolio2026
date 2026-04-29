import { CarouselVars } from './Carousel.types'
import {
  carouselAnimationDefault,
  carouselAnimationElegant,
  carouselAnimationBouncy,
  carouselAnimationSlow,
  carouselAnimationSuperSlow,
} from './Carousel.motion'
import clsx from 'clsx'

const transition = {
  default: carouselAnimationDefault,
  elegant: carouselAnimationElegant,
  bouncy: carouselAnimationBouncy,
  slow: carouselAnimationSlow,
  superSlow: carouselAnimationSuperSlow,
}

export const carousel: CarouselVars = (width, height, className, crop) => {
  const heightVals = height ? { height } : {}
  const widthVals = width ? { width } : {}

  return {
    className: clsx('carousel', { crop }, [className]),
    style: {
      ...widthVals,
      ...heightVals,
    },
  }
}

export const carouselCanvas = (crop: boolean) => ({
  className: clsx('carousel-canvas', { crop }),
})

export const carouselWrapper = (gap: number, animationStyle = 'default', isDragging = false) => {
  let transitionStyle: any = transition[animationStyle as 'default']
  if (typeof animationStyle === 'object') {
    transitionStyle = animationStyle
  }

  return {
    className: clsx('carousel-wrapper', { dragging: isDragging }),
    style: { gap: `${gap}px` },
    transition: transitionStyle,
  }
}

export const itemHolder: any = (
  width: number,
  offset: number,
  style: any,
  loop: boolean,
  snap: boolean,
  isActive: boolean,
  isVariableWidth: boolean,
  noResize: boolean,
) => {
  const addOffset = loop
    ? {
        transform: `translateX(${offset}px)`,
      }
    : ''

  const snapWidth = snap && !isVariableWidth && !noResize ? { width: `${width}px` } : {}

  return {
    className: clsx('carousel-item', { 'variable-size': !snap }, { active: isActive }),
    style: {
      ...style,
      ...snapWidth,
      ...addOffset,
    },
  }
}
