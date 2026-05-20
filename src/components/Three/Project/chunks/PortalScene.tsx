import { memo } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Group, Material, Scene } from 'three'
import Project from '@/components/Three/Project'

type PortalSceneProps = {
  data: any
  heroGroupRef: RefObject<Group | null>
  posX: number
  isCentral?: boolean
  outerScene: Scene
  getBackdropResources?: (url: string) => {
    material: Material | null
    blurredDataUrl: string | null
  }
}

const PortalScene = ({
  data,
  heroGroupRef,
  posX,
  isCentral,
  outerScene,
  getBackdropResources,
}: PortalSceneProps) => {
  const innerScene = useThree((s) => s.scene) as Scene

  // Mirror the outer scene's IBL onto the portal's inner scene so lighting
  // is identical inside and outside. Texture/PMREM is a reference copy —
  // no extra memory, no extra GPU work, no recompilation.
  useFrame(() => {
    if (innerScene === outerScene) return
    if (innerScene.environment !== outerScene.environment) {
      innerScene.environment = outerScene.environment
    }
    if (innerScene.environmentIntensity !== outerScene.environmentIntensity) {
      innerScene.environmentIntensity = outerScene.environmentIntensity
    }
    if (outerScene.environmentRotation) {
      innerScene.environmentRotation.copy(outerScene.environmentRotation)
    }
    if (innerScene.backgroundBlurriness !== outerScene.backgroundBlurriness) {
      innerScene.backgroundBlurriness = outerScene.backgroundBlurriness
    }
    if (innerScene.backgroundIntensity !== outerScene.backgroundIntensity) {
      innerScene.backgroundIntensity = outerScene.backgroundIntensity
    }
  })

  return (
    <Project
      data={data}
      heroGroupRef={heroGroupRef}
      posX={posX}
      inPortal
      isCentral={isCentral}
      getBackdropResources={getBackdropResources}
    />
  )
}

export default memo(PortalScene)
