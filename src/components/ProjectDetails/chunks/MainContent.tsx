import { FC } from 'react'
import { Motion } from '@/components/waywardUI'
import Viewer from './Viewer'

interface MainContentProps {
  data: {
    align: 'left' | 'right'
  }
  isActive: boolean
}

const MainContent: FC<MainContentProps> = ({ data, isActive }) => {
  const { align } = data

  return (
    <Motion
      data-align={align}
      className="project-details__main"
      initial="inactive"
      animate={isActive ? 'active' : 'inactive'}
    >
      <Viewer />
    </Motion>
  )
}

export default MainContent
