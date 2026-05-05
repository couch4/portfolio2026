import { FC } from 'react'
import { Motion } from '@/components/waywardUI'
import { scaleInDelay } from '@/styles/motion'

interface ViewerProps {
  // Add your props here
}

const Viewer: FC<ViewerProps> = ({}) => {
  return (
    <Motion className="project-details__viewer" {...scaleInDelay(0.8, 0.8)}>
      Viewer getting here?
    </Motion>
  )
}

export default Viewer
