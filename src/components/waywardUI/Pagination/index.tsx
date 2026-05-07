'use client'

import { FC } from 'react'
import { Motion } from '@/components/waywardUI'
import clsx from 'clsx'
import PageDot from './PageDot'
import './Pagination.css'

interface PaginationProps {
  className?: string
  data: any
  activeIndex?: number
  updateIndex?: (index: number) => void
  waitTime?: number
  onTimerEnd?: (index: number) => void
}

const Pagination: FC<PaginationProps> = ({
  data,
  className,
  activeIndex,
  updateIndex,
  waitTime = 1000,
  onTimerEnd,
}) => {
  const handleDotClick = (index: number) => {
    console.log('Dot clicked:', index)

    updateIndex?.(index)
  }

  const renderDots = data.map((_: any, index: number) => {
    return (
      <PageDot
        key={`pageDot-${index}`}
        isActive={index === activeIndex}
        waitTime={waitTime}
        onClick={handleDotClick}
        index={index}
        onTimerEnd={onTimerEnd}
      />
    )
  })

  return <Motion className={clsx('pagination__wrapper', className)}>{renderDots}</Motion>
}

export default Pagination
