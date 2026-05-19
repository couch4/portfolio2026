'use client'

import { FC, useContext, useRef } from 'react'
import { VideoContext, VideoControls } from './'
import ReactPlayer from 'react-player'
import clsx from 'clsx'

const VideoPlayer: FC<any> = () => {
  const {
    data,
    isPlaying,
    isVideoPaused,
    onPlayerReady,
    setIsPlaying,
    setIsVideoPaused,
    setViewer,
    wrapper,
  } = useContext(VideoContext)
  const playerRef = useRef<any>(null)

  const { src } = data
  const skipRender = !data || !src

  const handleReady = () => {
    if (onPlayerReady) onPlayerReady()
    if (typeof window === 'undefined') return

    const internal = playerRef.current?.getInternalPlayer?.()
    const fromWrapper = wrapper.current?.getElementsByTagName('video')[0]
    const videoEl =
      internal instanceof HTMLVideoElement ? internal : (fromWrapper as HTMLVideoElement | undefined)

    if (videoEl) setViewer(videoEl)
  }

  const togglePlay = (e: any) => {
    e.stopPropagation()

    setIsPlaying(!isPlaying)
    setIsVideoPaused(!isVideoPaused)
  }

  return skipRender ? null : (
    <>
      <ReactPlayer
        ref={playerRef}
        src={src}
        id="videoPlayer"
        playing={isPlaying && !isVideoPaused}
        onReady={handleReady}
        muted={true}
        playsInline={true}
        volume={1}
        width="100%"
        height="100%"
        className={clsx('video__player', { playing: isPlaying }, [isPlaying])}
      />
      <VideoControls {...{ togglePlay, playerRef }} />
    </>
  )
}

export default VideoPlayer
