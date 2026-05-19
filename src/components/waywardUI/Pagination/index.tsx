'use client'

import { FC, useState } from 'react'
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
  isPlaying?: boolean
  videoProgress?: number
  onVideoSeek?: (progress: number) => void
}

const Pagination: FC<PaginationProps> = ({
  data,
  className,
  activeIndex,
  updateIndex,
  waitTime = 1000,
  onTimerEnd,
  isPlaying,
  videoProgress,
  onVideoSeek,
}) => {
  const [timerPaused, setTimerPaused] = useState(false)

  const handleDotClick = (index: number) => {
    if (index === activeIndex) {
      setTimerPaused(!timerPaused)
    } else {
      setTimerPaused(false)
      updateIndex?.(index)
    }
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
        pauseTimer={timerPaused}
        isVideo={data[index]?.video !== null}
        isPlaying={isPlaying}
        videoProgress={index === activeIndex ? videoProgress : undefined}
        onVideoSeek={index === activeIndex ? onVideoSeek : undefined}
      />
    )
  })

  return <Motion className={clsx('pagination__wrapper', className)}>{renderDots}</Motion>
}

export default Pagination
