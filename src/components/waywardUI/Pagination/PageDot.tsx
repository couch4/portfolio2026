'use client'

import { FC, useMemo } from 'react'
import { Motion } from '@/components/waywardUI'
import clsx from 'clsx'
import { spring } from '@/styles/motion'

interface PageDotProps {
  onClick?: (index: number) => void
  onTimerStart?: (index: number) => void
  onTimerEnd?: (index: number) => void
  isActive?: boolean
  waitTime?: number
  index: number
}

const PageDot: FC<PageDotProps> = ({
  onClick,
  onTimerStart,
  onTimerEnd,
  isActive,
  waitTime = 1000,
  index,
}) => {
  const timerProps = useMemo(() => timerVars(waitTime), [waitTime])

  return (
    <Motion
      className={clsx('pagination__dot', { 'pagination__dot--active': isActive })}
      animate={isActive ? 'active' : 'inactive'}
      {...dotVars}
      onClick={() => onClick?.(index)}
    >
      <Motion
        className="pagination__dot__timer"
        {...timerProps}
        onAnimationStart={(name) => {
          if (name === 'active') onTimerStart?.(index)
        }}
        onAnimationComplete={(name) => {
          if (name === 'active') onTimerEnd?.(index)
        }}
      />
    </Motion>
  )
}

export default PageDot

const dotVars = {
  initial: 'inactive',
  variants: {
    inactive: {
      width: 12,
    },
    active: {
      width: 40,
    },
  },
  transition: spring,
}

const timerVars = (duration: number) => ({
  variants: {
    inactive: {
      width: '0%',
      transition: {
        duration: 0,
      },
    },
    active: {
      width: '100%',
    },
  },
  transition: {
    type: 'tween' as const,
    duration,
  },
})
