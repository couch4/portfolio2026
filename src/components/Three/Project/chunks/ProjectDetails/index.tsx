import { Html } from '@react-three/drei'
import { motion as r3fMotion } from 'r3f-motion'
import { spring } from '@/styles/motion'
import { useCardSize } from '@/hooks'
import ProjectDetailsHtml from '@/components/ProjectDetails'

const ProjectDetails = ({
  data,
  index = 0,
  isActive,
  onClick,
  onExit,
  ...props
}: {
  data: any
  isActive?: boolean
  index: number
  onClick?: () => void
  onExit?: () => void
}) => {
  const { gapPx, colWidth, contentWidth, contentHeight, distanceFactor } = useCardSize()

  const wrapperHeight = isActive ? window.innerHeight * 0.9 : contentHeight

  const handleClick = () => {
    console.log('button click')
    isActive ? onExit?.() : onClick?.()
  }

  const offset = colWidth * 2 + gapPx

  return (
    <r3fMotion.group
      position={[0, 0, 0.01]}
      initial={false}
      animate={{ z: isActive ? -4 : 0 }}
      transition={spring}
    >
      <Html
        transform
        center
        distanceFactor={distanceFactor}
        className="project-html"
        pointerEvents="none"
        {...props}
      >
        <ProjectDetailsHtml
          data={data}
          index={index}
          isActive={isActive || false}
          onClick={handleClick}
          sizes={{
            contentWidth,
            offset,
            wrapperHeight,
          }}
        />
      </Html>
    </r3fMotion.group>
  )
}

export default ProjectDetails
