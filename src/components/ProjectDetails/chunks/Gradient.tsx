import { FC } from 'react'
import { Motion } from '@/components/waywardUI'
import { fadeIn, spring } from '@/styles/motion'

interface GradientProps {
  align?: 'left' | 'right'
  isActive?: boolean
}

const Gradient: FC<GradientProps> = ({ align = 'left', isActive = false }) => {
  if (!isActive) return null

  return (
    <Motion
      data-align={align}
      className="project-details__gradient"
      {...fadeIn}
      initial="inactive"
      animate={isActive ? 'active' : 'inactive'}
      variants={{
        inactive: {
          opacity: 0,
          x: align === 'left' ? '200%' : '-200%',
          transition: {
            duration: 0.1,
            type: 'tween',
          },
        },
        active: {
          opacity: 1,
          x: 0,
          transition: {
            ...spring,
            opacity: {
              delay: 0.5,
              stiffness: 100,
            },
          },
        },
      }}
    />
  )
}

export default Gradient
