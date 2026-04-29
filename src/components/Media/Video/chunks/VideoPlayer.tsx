'use client'

import { FC, useEffect, useContext, useRef, useState } from 'react'
import { VideoContext, VideoControls } from './'
import { useDimensions } from '@/hooks'
import ReactPlayer from 'react-player'
import clsx from 'clsx'

const VideoPlayer: FC<any> = () => {
  const {
    data,
    isMuted,
    isPlaying,
    onAutoPlayStarted,
    onPlayerReady,
    setIsMuted,
    setIsPlaying,
    setInit,
    setViewer,
    wrapper,
    viewer,
  } = useContext(VideoContext)
  const { width, height } = useDimensions(wrapper)
  const [playerDimensions, setPlayerDimensions] = useState({
    vidWidth: 640,
    vidHeight: 390,
    aspect: 1,
    container: null,
  })
  const vidWrapper = wrapper.current
  const playerRef = useRef(null)

  useEffect(() => {
    handleResize()
  }, [vidWrapper, width, height, isPlaying])

  const { autoPlay, src, loop } = data?.video
  const skipRender = !data || !wrapper.current || !src

  const handleResize = () => {
    if (vidWrapper && typeof window !== 'undefined') {
      const { aspect } = playerDimensions
      const vidHolder = vidWrapper.querySelector('#videoPlayer')

      let containerWidth = width
      let containerHeight = width * 10

      if (height * aspect > width) {
        containerWidth = height * 10
        containerHeight = height
      }

      if (vidHolder) {
        // + 2 gives a pixel grace either side.
        vidHolder.style.width = `${Math.ceil(containerWidth + 2)}px`
        vidHolder.style.height = `${Math.ceil(containerHeight + 2)}px`
      }
    }
  }

  const handleReady = () => {
    if (onPlayerReady) onPlayerReady()

    if (vidWrapper && typeof window !== 'undefined') {
      let container: any = vidWrapper.getElementsByTagName('iframe')[0]
      let vidWidth = container?.width
      let vidHeight = container?.height

      container = vidWrapper.getElementsByTagName('video')[0]
      vidWidth = container?.videoWidth
      vidHeight = container?.videoHeight

      setPlayerDimensions({
        vidWidth,
        vidHeight,
        aspect: vidWidth / vidHeight,
        container,
      })

      if (container) {
        setViewer(container)
        if (autoPlay) {
          if (onAutoPlayStarted) onAutoPlayStarted()
          setInit(false)
          setIsPlaying(true)

          container.muted = true
          container.play()
        }
      }
    }
  }

  const togglePlay = (e: any) => {
    e.stopPropagation()

    viewer.playing = !isPlaying
    setIsPlaying(!isPlaying)
  }

  const toggleMute = (e: any) => {
    e.stopPropagation()
    setIsMuted(!isMuted)
  }

  return skipRender ? null : (
    <>
      <ReactPlayer
        ref={playerRef}
        url={src}
        id="videoPlayer"
        playing={isPlaying}
        onReady={handleReady}
        controls={false}
        muted={isMuted}
        autoPlay={autoPlay}
        playsinline={true}
        loop={loop}
        volume={1}
        width="100%"
        height="100%"
        className={clsx('video__player', { playing: isPlaying }, [isPlaying])}
      />
      <VideoControls {...{ togglePlay, toggleMute, playerRef }} />
    </>
  )
}

export default VideoPlayer
