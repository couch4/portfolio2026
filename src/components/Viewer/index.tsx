import { FC, useState } from 'react'
import { Motion, Pagination } from '@/components/waywardUI'
import LiquidGlass from '@/components/LiquidGlass'
import CarouselCanvas from './chunks/CarouselCanvas'
import { Play, Pause, Fullscreen } from 'lucide-react'
import './Viewer.css'

interface SlideImage {
  src: string
  alt: string
  blurred: string
  depth: string
}

interface Slide {
  image: SlideImage
  video: null | unknown
}

interface ViewerProps {
  data: Slide[]
  activeIndex?: number
  slideFadeDuration?: number
  depthIntensity?: number
  blurXIntensity?: number
  showDepthMap?: boolean
  [key: string]: any
}

const Viewer: FC<ViewerProps> = ({
  data = [],
  activeIndex = 0,
  slideFadeDuration = 1500,
  depthIntensity = 0.4,
  blurXIntensity = 0.5,
  showDepthMap = false,
  ...props
}) => {
  const [currentIndex, setCurrentIndex] = useState(activeIndex)
  const [isPlaying, setIsPlaying] = useState(false)

  const handleUpdate = (index: number) => {
    setCurrentIndex(index)
  }

  const handleSkip = () => {
    setCurrentIndex((prev) => (prev + 1) % data.length)
  }

  return (
    <Motion className="viewer__wrapper" {...props}>
      <LiquidGlass blurRadius={80}>
        <Motion className="viewer__container">
          <CarouselCanvas
            data={data}
            activeIndex={currentIndex}
            slideFadeDuration={slideFadeDuration}
            depthIntensity={depthIntensity}
            blurXIntensity={blurXIntensity}
            showDepthMap={showDepthMap}
          />
        </Motion>
        <Motion className="viewer__controls">
          {isPlaying ? (
            <Pause className="viewer__control pause" />
          ) : (
            <Play className="viewer__control play" />
          )}
          <Pagination
            data={data}
            updateIndex={handleUpdate}
            activeIndex={currentIndex}
            waitTime={5}
            onTimerEnd={handleSkip}
          />
          <Fullscreen className="viewer__control fullscreen" />
        </Motion>
      </LiquidGlass>
    </Motion>
  )
}

export default Viewer
