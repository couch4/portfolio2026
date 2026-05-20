import { useMemo } from 'react'
import type { RefObject } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import { Group } from 'three'
import { getOrBuildProjectTemplate } from '@/hooks/useCarouselResources'
import type { MatcapConfig } from '@/hooks/useCarouselResources'
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

  const matcaps: MatcapConfig[] = modelSettings?.matcaps ?? []
  const matcapSrcs = useMemo(() => matcaps.map((m) => m.src), [matcaps])
  const matcapTextures = useTexture(matcapSrcs.length > 0 ? matcapSrcs : [])
  const loadedMatcaps = Array.isArray(matcapTextures) ? matcapTextures : [matcapTextures]

  const instanceScene = useMemo(() => {
    const template = getOrBuildProjectTemplate(
      scene,
      gltf,
      !!modelSettings?.clipBottom,
      modelSettings?.clipBottomOffset || 0,
      cardHeight / 2,
      matcaps,
      loadedMatcaps,
    )
    const source = inPortal ? template.portal : template.clipped
    return source.clone(true) as Group

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, gltf, inPortal, modelSettings?.clipBottom, modelSettings?.clipBottomOffset])

  return (
    <group ref={heroGroupRef}>
      <primitive object={instanceScene} {...modelSettings} position-x={posX} />
    </group>
  )
}

export default ProjectHero
