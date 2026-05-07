import { useMemo } from 'react'
import type { RefObject } from 'react'
import { useGLTF } from '@react-three/drei'
import type { Group } from 'three'
import { getOrBuildProjectTemplate } from '@/hooks/useCarouselResources'
import { useCardSize } from '@/hooks'

const ProjectHero = ({
  data,
  inPortal,
  heroGroupRef,
  posX,
}: {
  data: any
  inPortal?: boolean
  heroGroupRef: RefObject<Group | null>
  posX: number
}) => {
  const { gltf, modelSettings } = data
  const { scene }: any = useGLTF(gltf)
  const { cardHeight } = useCardSize()

  const instanceScene = useMemo(() => {
    const template = getOrBuildProjectTemplate(
      scene,
      gltf,
      !!modelSettings?.clipBottom,
      modelSettings?.clipBottomOffset || 0,
      cardHeight / 2,
    )
    const source = inPortal ? template.portal : template.clipped
    return source.clone(true) as Group
    // cardHeight intentionally omitted — bottomPlane.constant is mutated in-place
    // by useCarouselResources on resize, so the existing materials still pick it up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, gltf, inPortal, modelSettings?.clipBottom, modelSettings?.clipBottomOffset])

  return (
    <group ref={heroGroupRef}>
      <primitive object={instanceScene} {...modelSettings} position-x={posX} />
    </group>
  )
}

export default ProjectHero
