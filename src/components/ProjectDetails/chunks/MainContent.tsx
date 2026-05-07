import { FC } from 'react'
import { Motion } from '@/components/waywardUI'
import Viewer from '@/components/Viewer'
import { AnimatePresence } from 'motion/react'
import { scaleInDelay } from '@/styles/motion'

interface MainContentProps {
  data: {
    align: 'left' | 'right'
    media: any[]
  }
  isActive: boolean
  showViewer?: boolean
  onAnimationComplete?: (anim: any) => void
}

const MainContent: FC<MainContentProps> = ({
  data,
  isActive,
  showViewer = false,
  onAnimationComplete,
}) => {
  const { align, media = [] } = data

  return (
    <Motion
      data-align={align}
      className="project-details__main"
      initial="inactive"
      animate={isActive ? 'active' : 'inactive'}
    >
      <AnimatePresence>
        {showViewer && (
          <Viewer
            key="viewer"
            data={media}
            onAnimationComplete={onAnimationComplete}
            {...scaleInDelay(0.5, 0.8)}
            initial="inactive"
            animate="active"
            exit="exit"
          />
        )}
      </AnimatePresence>
    </Motion>
  )
}

export default MainContent
