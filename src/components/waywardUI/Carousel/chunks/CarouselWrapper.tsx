'use client'
import { FC, useContext, useEffect, useRef, useState } from 'react'
import { Motion } from 'waywardUI'
import CarouselItem from './CarouselItem'
import { ICarouselWrapper } from '../Carousel.types'
import { PanInfo } from 'motion/react'
import { useDimensions } from '@/hooks'
import { carouselCanvas, carouselWrapper } from '../Carousel.props'
import { CarouselContext } from '.'
import { isMobile } from 'react-device-detect'

const CarouselWrapper: FC<ICarouselWrapper> = ({
  items,
  dragWidth,
  dragHeight = 0,
  gap = 0,
  animationStyle,
  columnNum,
  crop,
  loop,
  useVelocity,
  ...props
}) => {
  const wrapperRef = useRef(null)
  const [isBrowserReady, setIsBrowserReady] = useState(false)
  const { width: wrapperWidth } = useDimensions(wrapperRef)
  const length = Math.floor((items.length - 1) / columnNum)
  const {
    currItem,
    direction,
    setCurrItem,
    isClickable,
    isVariableWidth,
    onSwitch,
    snap,
    variableWidths,
  } = useContext(CarouselContext)
  const [isDragging, setIsDragging] = useState(false)
  const slideWidth = dragWidth + gap * columnNum

  const carouselItems = loop ? [...items, ...items] : items

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('resize'))

      setIsBrowserReady(true)

      return () => {
        return
      }
    }
  }, [wrapperWidth, dragWidth])

  const handleItemClick = (index: number) => {
    if (!loop && isClickable) {
      setCurrItem(index)
    }
  }

  const renderItems = carouselItems.map((val: any, i: number) => {
    return (
      <CarouselItem
        key={`carouselItem_${i}`}
        item={val}
        index={i}
        width={dragWidth}
        height={dragHeight}
        slideWidth={slideWidth}
        columnNum={columnNum}
        length={length}
        animationStyle={animationStyle}
        loop={loop}
        onClick={() => handleItemClick(i)}
      />
    )
  })

  const startDrag = () => {
    if (isBrowserReady && isMobile) {
      const html = document.documentElement
      html.style.touchAction = 'none'
      html.style.overflow = isMobile ? 'hidden' : 'auto'
    }
    setIsDragging(true)
  }

  const endDrag: any = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isBrowserReady && isMobile) {
      const html = document.documentElement

      html.style.touchAction = 'auto'
      html.style.overflow = 'auto'
    }

    if (!snap) return
    const { velocity } = info
    let vel = velocity.x
    if (direction === 'vertical') {
      vel = velocity.y
    }
    const fastEnough = Math.abs(vel) > 5

    if (fastEnough && typeof currItem === 'number') {
      let switchThreshold = vel > 0 ? 1 : -1
      if (useVelocity) {
        switchThreshold = Math.round(vel * (isMobile ? 0.001 : 0.0004))
      }

      const next = currItem - switchThreshold

      if (next !== currItem) {
        const croppedVal = loop ? next : Math.max(0, Math.min(length, next))

        setCurrItem(croppedVal)
        onSwitch(croppedVal)
      }
    }

    setIsDragging(false)
  }

  let offset = 0
  if (typeof currItem === 'number') {
    offset = -currItem * slideWidth
    if (isVariableWidth && variableWidths.length > 0) {
      const totalItems = variableWidths.length
      const totalWidth = variableWidths.reduce((acc, w) => acc + w + gap, 0)
      const cycles = Math.floor(currItem / totalItems)
      const moddedIndex = ((currItem % totalItems) + totalItems) % totalItems
      const partialOffset = variableWidths
        .slice(0, moddedIndex)
        .reduce((acc, w) => acc + w + gap, 0)
      offset = -(cycles * totalWidth + partialOffset)
    }
  }

  const animateOffset: any = { x: offset }

  let dragConstraints = {
    left: offset,
    right: offset,
    top: 0,
    bottom: 0,
  }

  if (!snap) {
    dragConstraints = {
      left: dragWidth - wrapperWidth,
      right: 0,
      top: 0,
      bottom: 0,
    }
  }

  return (
    <Motion {...carouselCanvas(crop)} data-dragging={isDragging}>
      <Motion
        ref={wrapperRef}
        drag={length > 0 ? 'x' : false}
        onDragEnd={endDrag}
        onDragStart={startDrag}
        animate={animateOffset}
        dragConstraints={dragConstraints}
        {...carouselWrapper(gap, animationStyle, isDragging)}
        {...props}
      >
        {renderItems}
      </Motion>
    </Motion>
  )
}

export default CarouselWrapper
