'use client'

import { FC, useEffect } from 'react'
import { Motion } from '@/components/waywardUI'
import { useSpring } from 'motion/react'
import clsx from 'clsx'
import { spring } from '@/styles/motion'
import DotTimer from './DotTimer'
import DotProgress from './DotProgress'

interface PageDotProps {
  onClick?: (index: number) => void
  onTimerStart?: (index: number) => void
  onTimerEnd?: (index: number) => void
  isActive?: boolean
  waitTime?: number
  index: number
  pauseTimer?: boolean
  isVideo?: boolean
  isPlaying?: boolean
  videoProgress?: number
  onVideoSeek?: (progress: number) => void
}

const PageDot: FC<PageDotProps> = ({
  onClick,
  onTimerStart,
  onTimerEnd,
  isActive,
  waitTime = 1000,
  pauseTimer = false,
  index,
  isVideo = false,
  isPlaying = false,
  videoProgress = 0,
  onVideoSeek,
}) => {
  const timerWidth = useSpring(0)
  timerWidth.set(isActive ? 100 : 0)

  useEffect(() => {
    if (pauseTimer) {
      timerWidth.stop()
    }
  }, [pauseTimer, index, isActive])

  const isVidProgress = isVideo && isPlaying && isActive

  return (
    <Motion
      className={clsx('pagination__dot', {
        'pagination__dot--active': isActive,
        video: isVideo && isActive,
      })}
      animate={isActive ? (isVidProgress ? 'activeVideo' : 'active') : 'inactive'}
      {...dotVars}
      onClick={() => !(isActive && isVidProgress) && onClick?.(index)}
    >
      {isVidProgress ? (
        <DotProgress
          key={`progress-${index}`}
          videoProgress={videoProgress}
          onVideoSeek={onVideoSeek}
        />
      ) : (
        <DotTimer
          onTimerStart={onTimerStart}
          onTimerEnd={onTimerEnd}
          isActive={isActive}
          waitTime={waitTime}
          index={index}
          pauseTimer={pauseTimer}
        />
      )}
    </Motion>
  )
}

export default PageDot

const dotVars = {
  initial: 'inactive',
  variants: {
    inactive: {
      width: 12,
      flexGrow: 0,
    },
    active: {
      width: 40,
      flexGrow: 0,
    },
    activeVideo: {
      width: 'auto',
      flexGrow: 1,
    },
  },
  transition: spring,
}
