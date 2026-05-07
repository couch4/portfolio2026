import { memo, useEffect, useLayoutEffect } from 'react'
import type { RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import type { Group, Material, Texture } from 'three'
import Project from '@/components/Three/Project'
import { getOrBuildPMREM } from '@/hooks/useCarouselResources'

type PortalSceneProps = {
  data: any
  heroGroupRef: RefObject<Group | null>
  posX: number
  isCentral?: boolean
  envMap?: Texture
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
  envMap,
  getBackdropResources,
}: PortalSceneProps) => {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const isWebGPU = (gl as any)?.isWebGPURenderer === true

  // WebGL: equirectangular envMap directly — pipeline does PMREM internally.
  useLayoutEffect(() => {
    if (isWebGPU || !envMap) return
    scene.environment = envMap
    return () => {
      scene.environment = null
    }
  }, [scene, envMap, isWebGPU])

  // WebGPU: PMREM is generated once per envMap and cached at module scope.
  // Without the cache, every PortalScene mount runs PMREMGenerator over the
  // same envMap and disposes a fresh RenderTarget on unmount.
  useEffect(() => {
    if (!isWebGPU || !envMap) return
    const rt = getOrBuildPMREM(envMap, gl)
    scene.environment = rt.texture
    return () => {
      scene.environment = null
    }
  }, [isWebGPU, envMap, gl, scene])

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
