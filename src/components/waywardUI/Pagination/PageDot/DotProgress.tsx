'use client'

import { FC, useRef, useCallback, useState } from 'react'
import { Motion } from '@/components/waywardUI'
import { spring } from '@/styles/motion'

interface DotProgressProps {
  videoProgress?: number
  onVideoSeek?: (progress: number) => void
}

const DotProgress: FC<DotProgressProps> = ({ videoProgress = 0, onVideoSeek }) => {
  const [isDragging, setIsDragging] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const getProgressFromEvent = useCallback((e: PointerEvent) => {
    const track = trackRef.current
    if (!track) return 0
    const rect = track.getBoundingClientRect()
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      onVideoSeek?.(getProgressFromEvent(e.nativeEvent))
      setIsDragging(true)
    },
    [onVideoSeek, getProgressFromEvent],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.buttons) return
      e.stopPropagation()
      onVideoSeek?.(getProgressFromEvent(e.nativeEvent))
    },
    [onVideoSeek, getProgressFromEvent],
  )

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    setIsDragging(false)
  }, [])

  return (
    <div
      ref={trackRef}
      className="pagination__dot__progress"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <Motion
        className="pagination__dot__progress__fill"
        animate={{
          width: `${videoProgress * 100}%`,
          transition: isDragging ? { duration: 0 } : { ...spring, stiffness: 900 },
        }}
      />
    </div>
  )
}

export default DotProgress
