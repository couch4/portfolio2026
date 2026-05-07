import { FC, useEffect, useRef, useState } from 'react'
import { Button, Motion } from '@/components/waywardUI'
import MainContent from './chunks/MainContent'
import SideContent from './chunks/SideContent'
import Gradient from './chunks/Gradient'
import { scaleInDelay, spring } from '@/styles/motion'

import './ProjectDetails.css'
const VIEWER_DELAY = 0.8

interface ProjectDetailsProps {
  data: any
  index: number
  isActive: boolean
  onClick: () => void
  sizes: {
    contentWidth: number
    offset: number
    wrapperHeight: number
  }
}

const ProjectDetails: FC<ProjectDetailsProps> = ({ data, index, isActive, sizes, onClick }) => {
  const { contentWidth, offset, wrapperHeight } = sizes
  const [showViewer, setShowViewer] = useState(false)
  const viewerTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleClose = () => {
    setShowViewer(false)
  }

  useEffect(() => {
    if (isActive) {
      viewerTimeoutRef.current = setTimeout(() => {
        setShowViewer(true)
      }, VIEWER_DELAY * 1000)
    } else {
      setShowViewer(false)
    }

    return () => {
      if (viewerTimeoutRef.current) {
        clearTimeout(viewerTimeoutRef.current)
        viewerTimeoutRef.current = null
      }
    }
  }, [isActive])

  const handleAnimComplete = (anim: any) => {
    if (anim === 'exit') {
      onClick?.()
    }
  }

  return (
    <Motion
      data-align={data?.align}
      animate={{ height: wrapperHeight }}
      style={{ width: contentWidth, height: wrapperHeight }}
      className="project-details"
      transition={spring}
    >
      <Button
        variant="close"
        onClick={handleClose}
        {...scaleInDelay(0.5, 0.5, 'bounce')}
        animate={isActive ? 'active' : 'inactive'}
      />

      {isActive && (
        <MainContent
          data={data}
          isActive={isActive}
          showViewer={showViewer}
          onAnimationComplete={handleAnimComplete}
        />
      )}
      <SideContent
        data={data}
        index={index}
        isActive={isActive}
        onClick={onClick}
        offset={data?.align === 'left' ? -offset : offset}
      />
      <Gradient align={data?.align} isActive={isActive} />
    </Motion>
  )
}

export default ProjectDetails
