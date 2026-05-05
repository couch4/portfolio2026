import { memo, useEffect, useLayoutEffect, useRef } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import type { Group, RenderTarget, Texture } from 'three'
import { PMREMGenerator } from 'three/webgpu'
import Project from '@/components/Three/Project'

type PortalSceneProps = {
  data: any
  floatY: MutableRefObject<number>
  spinY: MutableRefObject<number>
  outerRef: RefObject<Group | null>
  isActive: boolean
  envMap?: Texture
}

const PortalScene = ({ data, floatY, spinY, outerRef, isActive, envMap }: PortalSceneProps) => {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const isWebGPU = (gl as any)?.isWebGPURenderer === true

  const pmremRTRef = useRef<RenderTarget | null>(null)

  // WebGL: equirectangular is fine — the WebGL pipeline handles PMREM internally
  useLayoutEffect(() => {
    if (isWebGPU || !envMap) return
    scene.environment = envMap
    return () => {
      scene.environment = null
    }
  }, [scene, envMap, isWebGPU])

  // WebGPU: generate PMREM in an effect, NOT inside useFrame.
  // Running PMREMGenerator inside the render loop submits new GPU command
  // buffers mid-frame and corrupts WebGPU render state, causing subsequent
  // draws (backdrop textures, etc.) to go dark. Effects run between frames,
  // so the renderer is idle and the command buffer is clean.
  useEffect(() => {
    if (!isWebGPU || !envMap) return

    const pmremGen = new PMREMGenerator(gl as any)
    const rt = (envMap as any).isCubeTexture
      ? pmremGen.fromCubemap(envMap as any)
      : pmremGen.fromEquirectangular(envMap)

    pmremRTRef.current?.dispose()
    pmremRTRef.current = rt
    pmremGen.dispose()
    scene.environment = rt.texture

    return () => {
      scene.environment = null
      pmremRTRef.current?.dispose()
      pmremRTRef.current = null
    }
  }, [isWebGPU, envMap, gl, scene])

  return (
    <Project
      data={data}
      floatY={floatY}
      spinY={spinY}
      inPortal
      outerRef={outerRef}
      isActive={isActive}
    />
  )
}

export default memo(PortalScene)
