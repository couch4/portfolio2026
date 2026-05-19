'use client'
import { FC, useContext } from 'react'
import { VideoContext } from './'
import { Motion } from '@/components/waywardUI'
import clsx from 'clsx'
// @ts-ignore
import Play from '@/assets/icons/iconPlaySquircle.svg?react'
import { scaleInDelay } from '@/styles/motion'

const VideoControls: FC<any> = ({ togglePlay }) => {
  const { isPlaying } = useContext(VideoContext)

  return (
    <Motion
      onClick={togglePlay}
      className={clsx('video__controls__play', { playing: isPlaying })}
      {...scaleInDelay(1, 0.2)}
      transition={{ stiffness: 500, damping: 20 }}
    >
      <Play />
    </Motion>
  )
}

export default VideoControls
