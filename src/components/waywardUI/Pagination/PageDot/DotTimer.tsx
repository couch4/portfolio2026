'use client'

import { FC, useEffect, useRef } from 'react'
import { Motion } from '@/components/waywardUI'
import { useAnimate, type AnimationPlaybackControls } from 'motion/react'

interface DotTimerProps {
  onTimerStart?: (index: number) => void
  onTimerEnd?: (index: number) => void
  isActive?: boolean
  waitTime?: number
  index: number
  pauseTimer?: boolean
}

const DotTimer: FC<DotTimerProps> = ({
  onTimerStart,
  onTimerEnd,
  isActive = false,
  waitTime = 1000,
  pauseTimer = false,
  index,
}) => {
  const [timerRef, animate] = useAnimate()
  const controlsRef = useRef<AnimationPlaybackControls | null>(null)
  const genRef = useRef(0)

  useEffect(() => {
    handleReset(isActive)
  }, [isActive])

  useEffect(() => {
    if (pauseTimer) {
      handlePause()
    } else {
      handlePlay()
    }
  }, [pauseTimer, index, isActive])

  const handleReset = (active: boolean) => {
    // Stop the previous animation, then start a new one
    controlsRef.current?.stop()
    const gen = ++genRef.current
    if (active) onTimerStart?.(index)
    const controls = animate(
      timerRef.current,
      { width: active ? '100%' : '0%' },
      { duration: active ? waitTime : 0 },
    )
    controlsRef.current = controls
    if (active) {
      controls.then(() => {
        if (genRef.current === gen) onTimerEnd?.(index)
      })
    }
  }

  const handlePause = () => {
    controlsRef.current?.pause()
  }

  const handlePlay = () => {
    controlsRef.current?.play()
  }

  return <Motion ref={timerRef} className="pagination__dot__timer" initial={{ width: '0%' }} />
}

export default DotTimer
