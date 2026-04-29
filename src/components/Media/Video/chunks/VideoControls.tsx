'use client'
import { FC, useContext } from 'react'
import { VideoContext } from './'
import clsx from 'clsx'
import Play from '@/assets/icons/iconPlay.svg?react'

const VideoControls: FC<any> = ({ toggleMute, togglePlay }) => {
  const { data, init, isMuted, isPlaying } = useContext(VideoContext)

  if (data?.autoplay) return null

  return (
    <div className={clsx('video__controls', { playing: isPlaying, init })}>
      <div
        onClick={toggleMute}
        className={isMuted ? 'video__controls-mute' : 'video__controls-unmute'}
      />
      <div
        onClick={togglePlay}
        className={clsx('video__controls-play-btn', { playing: isPlaying })}
      >
        <Play />
      </div>
    </div>
  )
}

export default VideoControls
