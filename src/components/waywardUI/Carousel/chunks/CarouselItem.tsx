import { FC, useContext, useEffect, useRef } from 'react'
import { Motion } from 'waywardUI'
import { ICarouselItem } from '../Carousel.types'
import { itemHolder } from '../Carousel.props'
import {
  carouselFocusAnimation,
  carouselBookcaseAnimation,
  carouselFadeAndScaleAnimation,
} from '../Carousel.motion'
import { CarouselContext } from '.'
import { useDimensions } from '@/hooks'

let offset = 0

const CarouselItem: FC<ICarouselItem> = ({
  index,
  item,
  width,
  length,
  columnNum,
  loop = false,
  animationStyle,
  slideWidth,
  ...props
}) => {
  const {
    currItem,
    noResize,
    isVariableWidth,
    snap,
    variableWidths,
    variant = 'default',
  } = useContext(CarouselContext)
  const itemRef = useRef(null)
  const { width: itemWidth } = useDimensions(itemRef)
  let isActive = currItem === index

  useEffect(() => {
    if (isVariableWidth && itemWidth > 0) {
      variableWidths[index] = itemWidth
    }
  }, [itemWidth])

  if (loop) {
    const itemsLength = length + 1
    const fullLength = itemsLength * 2
    const groupOffset = Math.floor((currItem - index - 1) / fullLength)

    // reorders stack to faux infinte scroll
    const itemsToShift = fullLength * groupOffset + itemsLength
    offset = slideWidth * itemsToShift

    // reorders stack for infinite scroll with items of variable widths
    if (isVariableWidth && variableWidths.length > 0) {
      const totalItems = variableWidths.length
      const totalWidth = variableWidths.reduce((acc, w) => acc + w, 0)
      const itemsLength = length + 1
      const fullLength = itemsLength * 2
      const groupOffset = Math.floor((currItem - index - 1) / fullLength)
      const itemsToShift = fullLength * groupOffset + itemsLength
      const cycles = Math.floor(itemsToShift / totalItems)
      const moddedIndex = ((itemsToShift % totalItems) + totalItems) % totalItems
      const partialOffset = variableWidths.slice(0, moddedIndex).reduce((acc, w) => acc + w, 0)

      offset = cycles * totalWidth + partialOffset
    }

    isActive = currItem - fullLength * groupOffset - itemsLength === index
  }

  const itemAnimation = {
    primary: { initial: 'inactive', animate: isActive ? 'active' : 'inactive' },
    focus: carouselFocusAnimation(animationStyle, isActive, offset, loop),
    bookcase: carouselBookcaseAnimation(animationStyle, isActive, offset, loop),
    fadeInAndScale: carouselFadeAndScaleAnimation(animationStyle, isActive, offset, loop),
    none: {},
  }

  const allProps = {
    ...itemHolder(
      width / columnNum,
      offset,
      (props as any).style,
      loop,
      snap,
      isActive,
      isVariableWidth,
      noResize,
    ),
    ...props,
    ...itemAnimation[variant],
    ref: itemRef,
  }

  return <Motion {...allProps}>{item.type ? item : null}</Motion>
}

export default CarouselItem
