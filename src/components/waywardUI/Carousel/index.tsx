'use client'

import { FC, Suspense, useEffect, useRef, useState } from 'react'
import { CarouselProps } from './Carousel.types'
import { carousel } from './Carousel.props'
import { Motion } from 'waywardUI'
import { CarouselContext, CarouselWrapper } from './chunks'
import { getValueAtBreakpoint } from '@/utilities/content'
import { useDimensions } from '@/hooks'

const variableWidths = []

const Carousel: FC<CarouselProps> = ({
  className,
  items = [],
  loop = false,
  animationStyle = 'default',
  gap = 0,
  width: propsWidth = '100%',
  height: propsHeight,
  crop = false,
  useVelocity = false,
  columns = 1,
  isClickable = false,
  onSwitch = () => {},
  onSwitchComplete,
  variant = 'primary',
  snap = true,
  defaultValue = 0,
  ref,
  noResize = false,
  variableWidth: isVariableWidth = false,
  ...props
}) => {
  const [currItem, setCurrItem] = useState(defaultValue)
  // @ts-ignore
  const carouselWrapperRef = useRef(ref?.current || null)
  const { width, height, breakpoint } = useDimensions(carouselWrapperRef)

  const totalVariableItems = variableWidths.length
  const moddedIndex = ((currItem % totalVariableItems) + totalVariableItems) % totalVariableItems

  const carouselWidth = isVariableWidth
    ? variableWidths[moddedIndex]
    : getValueAtBreakpoint(propsWidth, breakpoint)
  const carouselHeight = propsHeight ? getValueAtBreakpoint(propsHeight, breakpoint) : null
  const columnNum = getValueAtBreakpoint(columns, breakpoint)

  useEffect(() => {
    if (typeof onSwitchComplete === 'function') {
      onSwitchComplete(currItem)
    }
  }, [currItem])

  if (items.length === 0) return null

  const allProps = {
    ...carousel(carouselWidth, carouselHeight, className, crop),
    ...props,
  }

  return (
    <Suspense fallback={items[0]}>
      <Motion ref={carouselWrapperRef} {...allProps}>
        <CarouselContext.Provider
          value={{
            currItem,
            setCurrItem,
            onSwitch,
            isClickable,
            breakpoint,
            snap,
            carouselWidth: width,
            items,
            variant,
            isVariableWidth,
            variableWidths,
            noResize,
          }}
        >
          <CarouselWrapper
            items={items}
            gap={gap}
            dragWidth={isVariableWidth ? 0 : width}
            dragHeight={height}
            columnNum={columnNum}
            animationStyle={animationStyle}
            crop={crop}
            loop={loop}
            useVelocity={useVelocity}
          />
        </CarouselContext.Provider>
      </Motion>
    </Suspense>
  )
}

export default Carousel
