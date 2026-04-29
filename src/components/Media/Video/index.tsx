'use client'

import { useRef, FC, useEffect, useState } from 'react'
import clsx from 'clsx'
import { VideoContext, VideoPlayer } from './chunks'
import Image from '../Image'

const Video: FC<any> = ({ data, imageSettings, triggerPlay = false }: any) => {
  const videoWrapperRef = useRef<HTMLDivElement>(null)
  const [isMuted, setIsMuted] = useState(!data?.allowSound)
  const [isPlaying, setIsPlaying] = useState(false)
  const [viewer, setViewer] = useState<any>(null)
  const [ready, setReady] = useState<any>(null)
  const [init, setInit] = useState(true)

  useEffect(() => {
    if (viewer) {
      setIsPlaying(triggerPlay)
    }
  }, [triggerPlay])

  return data ? (
    <div
      ref={videoWrapperRef}
      className={clsx('video__wrapper', { playing: isPlaying, ready: ready && !isPlaying })}
    >
      <VideoContext.Provider
        value={{
          data,
          init,
          isMuted,
          isPlaying,
          setInit,
          setIsMuted,
          setIsPlaying,
          setViewer,
          wrapper: videoWrapperRef,
          viewer,
          onPlayerReady: () => setReady(true),
        }}
      >
        <VideoPlayer />
        <Image
          data={data?.image}
          imageSettings={imageSettings}
          alt={imageSettings.alt || 'cover image'}
        />
      </VideoContext.Provider>
    </div>
  ) : null
}

export default Video
