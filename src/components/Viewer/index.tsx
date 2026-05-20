import { FC, useState, useRef, useCallback } from 'react'
import { Motion, Pagination } from '@/components/waywardUI'
import LiquidGlass from '@/components/LiquidGlass'
import CarouselCanvas from './chunks/CarouselCanvas'
import { AnimatePresence } from 'motion/react'
import { fadeIn, motionDefaults } from '@/styles/motion'
import Video from './chunks/Video'
import ViewerCaption from './chunks/ViewerCaption'
import { Fullscreen } from 'lucide-react'
// @ts-ignore
import Play from '@/assets/icons/iconPlaySquircle.svg?react'
// @ts-ignore
import Pause from '@/assets/icons/iconPauseSquircle.svg?react'
import './Viewer.css'

interface SlideImage {
  src: string
  alt: string
  blurred: string
  depth: string
}

interface Slide {
  image: SlideImage
  video?: null | unknown
  caption?: {
    title: string
    description: string
  }
}

interface ViewerProps {
  data: Slide[]
  activeIndex?: number
  slideFadeDuration?: number
  depthIntensity?: number
  blurXIntensity?: number
  showDepthMap?: boolean
  mouseInteraction?: boolean
  mouseIntensity?: number
  recaptureKey?: number
  [key: string]: any
}

const Viewer: FC<ViewerProps> = ({
  data = [],
  activeIndex = 0,
  slideFadeDuration = 1500,
  depthIntensity = 0.4,
  blurXIntensity = 0.5,
  showDepthMap = false,
  mouseInteraction = false,
  mouseIntensity = 0.1,
  recaptureKey = 0,
  ...props
}) => {
  const [currentIndex, setCurrentIndex] = useState(activeIndex)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isVideoPaused, setIsVideoPaused] = useState(true)
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const seekToRef = useRef<((t: number) => void) | null>(null)
  const lastProgressUpdate = useRef(0)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleProgress = useCallback((currentTime: number) => {
    const now = performance.now()
    if (now - lastProgressUpdate.current >= 100) {
      lastProgressUpdate.current = now
      setVideoCurrentTime(currentTime)
    }
  }, [])

  const handleSeekReady = useCallback((fn: (t: number) => void) => {
    seekToRef.current = fn
  }, [])

  const handleVideoSeek = useCallback(
    (progress: number) => {
      if (seekToRef.current && videoDuration) {
        seekToRef.current(progress * videoDuration)
      }
    },
    [videoDuration],
  )

  const handleUpdate = (index: number) => {
    setCurrentIndex(index)
    setIsPlaying(false)
    setIsVideoPaused(true)
    setVideoCurrentTime(0)
    setVideoDuration(0)
    seekToRef.current = null
  }

  const handleSkip = () => {
    setCurrentIndex((prev) => (prev + 1) % data.length)
    setIsPlaying(false)
    setIsVideoPaused(true)
  }

  const handleVideoEnd = useCallback(() => {
    setIsPlaying(false)
    setIsVideoPaused(true)
    setVideoCurrentTime(0)
    setVideoDuration(0)
    seekToRef.current = null
  }, [])

  const hasVideo = data[currentIndex]?.video !== null

  const handlePlay = () => {
    setIsPlaying(true)
    setIsVideoPaused(!isVideoPaused)
  }

  const handleFullscreen = () => {
    const el = wrapperRef.current?.getElementsByTagName('video')[0]
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      if (!isPlaying || isVideoPaused) {
        setIsPlaying(true)
        setIsVideoPaused(false)
      }
      el.requestFullscreen?.()
    }
  }

  return (
    <Motion ref={wrapperRef} className="viewer__wrapper" {...props}>
      <LiquidGlass blurRadius={80} className="viewer__glass" recaptureKey={recaptureKey} />
      <Motion className="viewer__container">
        <CarouselCanvas
          data={data}
          activeIndex={currentIndex}
          slideFadeDuration={slideFadeDuration}
          depthIntensity={depthIntensity}
          blurXIntensity={blurXIntensity}
          showDepthMap={showDepthMap}
          mouseInteraction={mouseInteraction}
          mouseIntensity={mouseIntensity}
        />
        <AnimatePresence>
          {hasVideo && (
            <Video
              key={`video-${currentIndex}`}
              data={data[currentIndex].video}
              isPlaying={isPlaying}
              isVideoPaused={isVideoPaused}
              setIsPlaying={setIsPlaying}
              setIsVideoPaused={setIsVideoPaused}
              onProgress={handleProgress}
              onDuration={setVideoDuration}
              onSeekReady={handleSeekReady}
              onEnded={handleVideoEnd}
              initial="inactive"
              animate="active"
              exit="exit"
            />
          )}
        </AnimatePresence>
      </Motion>
      <Motion className="viewer__controls">
        <AnimatePresence>
          {hasVideo && (
            <Motion
              className="viewer__control"
              onClick={handlePlay}
              {...fadeIn}
              {...motionDefaults}
            >
              {isPlaying && !isVideoPaused ? (
                <Pause className="viewer__control__pause" data-disabled={!hasVideo} />
              ) : (
                <Play className="viewer__control__play" data-disabled={!hasVideo} />
              )}
            </Motion>
          )}
        </AnimatePresence>
        <Pagination
          data={data}
          updateIndex={handleUpdate}
          activeIndex={currentIndex}
          waitTime={5}
          onTimerEnd={handleSkip}
          isPlaying={isPlaying}
          videoProgress={videoDuration > 0 ? videoCurrentTime / videoDuration : 0}
          onVideoSeek={handleVideoSeek}
        />
        <AnimatePresence>
          {hasVideo && (
            <Motion
              className="viewer__control"
              onClick={handleFullscreen}
              {...fadeIn}
              {...motionDefaults}
            >
              <Fullscreen className="viewer__control__fullscreen" />
            </Motion>
          )}
        </AnimatePresence>
      </Motion>
      <ViewerCaption data={data[currentIndex]?.caption} />
    </Motion>
  )
}

export default Viewer
