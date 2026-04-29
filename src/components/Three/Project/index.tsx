import { memo } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import { ContactShadows } from '@react-three/drei'
import type { Group } from 'three'
import Backdrop from '@/components/Three/Backdrop'
import { useSceneStore } from '@/store/sceneStore'
import type { MotionValue } from 'motion/react'
import ProjectHero from './chunks/ProjectHero'

const Project = ({
  data,
  floatY,
  spinY,
  inPortal,
  currXMotion,
  outerRef,
  isActive,
  ...props
}: {
  data: any
  floatY?: MutableRefObject<number>
  spinY?: MutableRefObject<number>
  currXMotion?: MotionValue<number>
  inPortal?: boolean
  outerRef?: RefObject<Group | null>
  isActive?: boolean
}) => {
  const isDevView = useSceneStore((s) => s.isDevView)
  const { align, background } = data

  return (
    <group {...props}>
      <ProjectHero
        data={data}
        floatY={floatY}
        spinY={spinY}
        inPortal={inPortal}
        outerRef={outerRef}
        isActive={isActive}
      />
      {/* <ContactShadows
        opacity={0.3}
        scale={15}
        blur={1.5}
        far={10}
        resolution={256}
        color="#000000"
        position-y={-3.5}
      /> */}
      <Backdrop textureUrl={background} align={align} />
    </group>
  )
}

export default memo(Project)
