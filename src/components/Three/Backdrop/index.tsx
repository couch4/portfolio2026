'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { BackdropMaterial } from '@/components/Three/Shaders/BackdropMaterial'
import { blurImageToDataURL } from '@/utilities/blurImage'
import type { Material } from 'three'

const url = '/gltf/backdrop2.glb'

const Backdrop = ({
  align,
  textureUrl,
  material: preCreatedMaterial,
  blurredDataUrl: preBlurredDataUrl,
  isCentral = false,
  ...props
}: {
  align: 'left' | 'right'
  textureUrl: string
  material?: Material | null
  blurredDataUrl?: string | null
  isCentral?: boolean
}) => {
  const { nodes }: any = useGLTF(url)
  const gl = useThree((s) => s.gl)
  const gpu = (gl as any)?.isWebGPURenderer === true

  const rotateY = align === 'left' ? -Math.PI * 0.5 : Math.PI
  const posX = align === 'left' ? -10 : 10

  // Use pre-created resources from hook if available, otherwise fallback to local creation
  const localMaterial = useMemo(() => {
    // if (gpu) {
    //   // Dynamic import to avoid loading WebGPU module in WebGL mode
    //   // @ts-ignore - Dynamic import for WebGPU-only module
    //   const {
    //     createBackdropNodeMaterial,
    //   } = require('@/components/Three/Shaders/BackdropMaterialWebGPU')
    //   // @ts-ignore
    //   return createBackdropNodeMaterial()
    // }
    return new BackdropMaterial()
  }, [gpu])
  const material = preCreatedMaterial || localMaterial

  const blurredUrl = preBlurredDataUrl || textureUrl

  const [localBlurredUrl, setLocalBlurredUrl] = useState<string | null>(null)

  // Only run blur locally if not provided by hook AND not using shared material
  useEffect(() => {
    if (preBlurredDataUrl || preCreatedMaterial) return
    blurImageToDataURL(textureUrl, 5)
      .then(setLocalBlurredUrl)
      .catch((err) => {
        console.error('Failed to blur backdrop image locally:', textureUrl, err)
      })
  }, [textureUrl, preBlurredDataUrl, preCreatedMaterial])

  const finalBlurredUrl = preBlurredDataUrl || localBlurredUrl
  const textureToLoad = finalBlurredUrl || textureUrl

  // Create a 1x1 transparent pixel as fallback to ensure useTexture always receives a valid URL
  const fallbackUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

  // Always call useTexture unconditionally with a valid URL
  // When using preCreatedMaterial, the hook already loaded the texture
  const backgroundTexture = useTexture(textureToLoad || fallbackUrl)

  useEffect(() => {
    if (preCreatedMaterial) return
    backgroundTexture.flipY = false
    ;(material as any).uTexture = backgroundTexture
  }, [material, backgroundTexture, preCreatedMaterial])

  // Only dispose material if we created it locally (not from hook)
  useEffect(() => {
    if (preCreatedMaterial) return
    return () => material.dispose()
  }, [material, preCreatedMaterial])

  // uTime is updated per-instance, but only for central slides to reduce visual churn.
  // Non-central slides freeze at their current uTime value — pattern is static but visible.
  useFrame(({ clock }) => {
    if (!isCentral) return
    ;(material as any).uTime = clock.getElapsedTime() * 2
  })

  // Early return after all hooks (React rules satisfied)
  if (!finalBlurredUrl || !textureUrl) return null

  return (
    <group {...props} rotation-y={rotateY} scale={20} position={[posX, 10, -20]}>
      <mesh receiveShadow>
        <primitive object={nodes.backdrop.geometry} attach="geometry" />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  )
}

export default memo(Backdrop)
