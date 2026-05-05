import { memo, Suspense, useEffect } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import { Fog } from 'three'
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
  fogStart = 0,
  fogEnd = 45,
  ...props
}: {
  data: any
  floatY?: MutableRefObject<number>
  spinY?: MutableRefObject<number>
  currXMotion?: MotionValue<number>
  inPortal?: boolean
  outerRef?: RefObject<Group | null>
  isActive?: boolean
  fogStart?: number
  fogEnd?: number
}) => {
  const { align, background } = data
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    scene.fog = new Fog('#05080F', fogStart, fogEnd)
    return () => {
      scene.fog = null
    }
  }, [fogStart, fogEnd, scene])

  return (
    <group {...props}>
      <Suspense fallback={null}>
        <ProjectHero
          data={data}
          floatY={floatY}
          spinY={spinY}
          inPortal={inPortal}
          outerRef={outerRef}
          isActive={isActive}
        />
      </Suspense>
      <Backdrop textureUrl={background} align={align} />
    </group>
  )
}

export default memo(Project)
