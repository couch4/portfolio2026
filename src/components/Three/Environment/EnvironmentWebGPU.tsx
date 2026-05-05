'use client'

import { useLayoutEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { useEnvironment } from '@react-three/drei'
import type { EnvironmentProps } from '@react-three/drei'
import * as THREE from 'three'
// three/webgpu exports the node-based PMREMGenerator (uses NodeMaterial internally).
// THREE.PMREMGenerator from 'three' is the WebGL version (ShaderMaterial) and
// crashes when passed a WebGPU renderer.
import { PMREMGenerator } from 'three/webgpu'

type Props = Pick<EnvironmentProps, 'preset' | 'files' | 'path' | 'background' | 'environmentIntensity' | 'extensions'>

const EnvironmentWebGPU = ({
  preset,
  files,
  path,
  background = false,
  environmentIntensity,
  extensions,
}: Props) => {
  const { gl, scene } = useThree()
  const texture = useEnvironment({ preset, files, path, extensions })

  // Track which texture the current PMREM was generated for to avoid re-generation
  const generatedForRef = useRef<THREE.Texture | null>(null)
  // Hold the render target so we can dispose it on change / unmount
  const pmremRTRef = useRef<THREE.RenderTarget | null>(null)

  // Cleanup env + PMREM render target when texture changes or component unmounts.
  // PMREMNode has a module-level _generator singleton that becomes stale when the
  // renderer is recreated (Canvas remount / story navigation). We bypass it by
  // pre-generating PMREM with a fresh PMREMGenerator (below in useFrame) and
  // handing Three.js a texture with isPMREMTexture=true — PMREMNode then skips
  // its _generator/_cache path entirely.
  useLayoutEffect(() => {
    generatedForRef.current = null
    return () => {
      scene.environment = null
      if (background) scene.background = null
      pmremRTRef.current?.dispose()
      pmremRTRef.current = null
      generatedForRef.current = null
    }
  }, [texture, scene, background])

  // Generate PMREM inside the render loop where WebGPU GPU calls are safe.
  // useFrame fires before gl.render() so materials compile WITH environment on
  // the very first frame — no dark frame on any render path.
  useFrame(() => {
    if (!texture || generatedForRef.current === texture) return

    pmremRTRef.current?.dispose()

    const pmremGen = new PMREMGenerator(gl as any)
    const envRT = (texture as THREE.CubeTexture).isCubeTexture
      ? pmremGen.fromCubemap(texture as THREE.CubeTexture)
      : pmremGen.fromEquirectangular(texture)

    pmremRTRef.current = envRT
    generatedForRef.current = texture
    pmremGen.dispose()

    // envRT.texture.isPMREMTexture === true → PMREMNode skips its stale
    // module-level _generator/_cache and uses this texture directly.
    scene.environment = envRT.texture

    // Force materials that compiled without env to recompile
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((m) => { if (m) m.needsUpdate = true })
    })

    if (background === true || background === 'only') scene.background = texture
    if (background !== 'only' && environmentIntensity !== undefined) {
      scene.environmentIntensity = environmentIntensity
    }
  })

  return null
}

export default EnvironmentWebGPU
