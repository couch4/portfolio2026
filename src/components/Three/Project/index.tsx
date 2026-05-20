import { memo, Suspense, useEffect } from 'react'
import type { RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import { Fog } from 'three'
import type { Group, Material } from 'three'
import Backdrop from '@/components/Three/Backdrop'
import ProjectHero from './chunks/ProjectHero'

const Project = ({
  data,
  heroGroupRef,
  posX = 0,
  inPortal,
  isCentral,
  fogStart = 0,
  fogEnd = 45,
  getBackdropResources,
  ...props
}: {
  data: any
  heroGroupRef: RefObject<Group | null>
  posX?: number
  inPortal?: boolean
  isCentral?: boolean
  fogStart?: number
  fogEnd?: number
  getBackdropResources?: (url: string) => {
    material: Material | null
    blurredDataUrl: string | null
  }
}) => {
  const { align, background } = data
  const scene = useThree((s) => s.scene)

  const backdropResources = getBackdropResources?.(background) || {
    material: null,
    blurredDataUrl: null,
  }

  useEffect(() => {
    scene.fog = new Fog('#05080F', fogStart, fogEnd)
    return () => {
      scene.fog = null
    }
  }, [fogStart, fogEnd, scene])

  return (
    <group {...props}>
      <Suspense fallback={null}>
        <ProjectHero data={data} heroGroupRef={heroGroupRef} posX={posX} inPortal={inPortal} />
      </Suspense>
      {background && (
        <Backdrop
          textureUrl={background}
          align={align}
          material={backdropResources.material}
          blurredDataUrl={backdropResources.blurredDataUrl}
          isCentral={isCentral}
        />
      )}
    </group>
  )
}

export default memo(Project)
