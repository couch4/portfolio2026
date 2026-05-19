'use client'

import { useRef, FC, useEffect, useState, useCallback } from 'react'
import clsx from 'clsx'
import { VideoContext, VideoPlayer } from './chunks'
import { Motion } from '@/components/waywardUI'

const Video: FC<any> = ({
  data,
  triggerPlay = false,
  isPlaying: isPlayingProp,
  setIsPlaying: setIsPlayingProp,
  isVideoPaused,
  setIsVideoPaused,
  onProgress,
  onDuration,
  onSeekReady,
  onEnded,
  ...props
}: any) => {
  const videoWrapperRef = useRef<HTMLDivElement>(null)
  const [isMuted, setIsMuted] = useState(!data?.allowSound)
  const [isPlayingInternal, setIsPlayingInternal] = useState(false)
  const isControlled = isPlayingProp !== undefined
  const isPlaying = isControlled ? isPlayingProp : isPlayingInternal
  const setIsPlaying = isControlled ? setIsPlayingProp : setIsPlayingInternal
  const [viewer, setViewer] = useState<HTMLVideoElement | null>(null)
  const [ready, setReady] = useState<any>(null)
  const [init, setInit] = useState(true)

  useEffect(() => {
    if (viewer && !isControlled) {
      setIsPlayingInternal(triggerPlay)
    }
  }, [triggerPlay, viewer, isControlled])

  useEffect(() => {
    if (!viewer) return
    const handleTimeUpdate = () => onProgress?.(viewer.currentTime)
    const handleDuration = () => onDuration?.(viewer.duration)
    const handleEnded = () => onEnded?.()
    if (viewer.readyState >= 1 && !isNaN(viewer.duration) && viewer.duration > 0) {
      onDuration?.(viewer.duration)
    }
    viewer.addEventListener('timeupdate', handleTimeUpdate)
    viewer.addEventListener('loadedmetadata', handleDuration)
    viewer.addEventListener('durationchange', handleDuration)
    viewer.addEventListener('ended', handleEnded)
    return () => {
      viewer.removeEventListener('timeupdate', handleTimeUpdate)
      viewer.removeEventListener('loadedmetadata', handleDuration)
      viewer.removeEventListener('durationchange', handleDuration)
      viewer.removeEventListener('ended', handleEnded)
    }
  }, [viewer, onProgress, onDuration, onEnded])

  const seekTo = useCallback(
    (time: number) => {
      if (viewer) viewer.currentTime = time
    },
    [viewer],
  )

  useEffect(() => {
    if (viewer) onSeekReady?.(seekTo)
  }, [viewer, seekTo, onSeekReady])

  return data ? (
    <Motion
      ref={videoWrapperRef}
      className={clsx('video__wrapper', { playing: isPlaying, ready: ready && !isPlaying })}
      {...props}
    >
      <VideoContext.Provider
        value={{
          data,
          init,
          isMuted,
          isPlaying,
          isVideoPaused,
          setInit,
          setIsMuted,
          setIsPlaying,
          setIsVideoPaused,
          setViewer,
          wrapper: videoWrapperRef,
          viewer,
          onPlayerReady: () => setReady(true),
        }}
      >
        <VideoPlayer />
      </VideoContext.Provider>
    </Motion>
  ) : null
}

export default Video
