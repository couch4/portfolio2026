import { memo } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import { Environment } from '@react-three/drei'
import type { Group } from 'three'
import Project from '@/components/Three/Project'

type PortalSceneProps = {
  data: any
  floatY: MutableRefObject<number>
  spinY: MutableRefObject<number>
  outerRef: RefObject<Group | null>
  isActive: boolean
}

const PortalScene = ({ data, floatY, spinY, outerRef, isActive }: PortalSceneProps) => (
  <>
    <Project
      data={data}
      floatY={floatY}
      spinY={spinY}
      inPortal
      outerRef={outerRef}
      isActive={isActive}
    />
    <Environment preset="warehouse" />
  </>
)

export default memo(PortalScene)
