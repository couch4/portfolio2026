'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { BackdropMaterial } from '@/components/Three/Shaders/BackdropMaterial'
import { createBackdropNodeMaterial } from '@/components/Three/Shaders/BackdropMaterialWebGPU'
import { blurImageToDataURL } from '@/utilities/blurImage'

const url = '/gltf/backdrop2.glb'

const Backdrop = ({
  align,
  textureUrl,
  ...props
}: {
  align: 'left' | 'right'
  textureUrl: string
}) => {
  const { nodes }: any = useGLTF(url)
  const gl = useThree((s) => s.gl)
  const gpu = (gl as any)?.isWebGPURenderer === true

  const rotateY = align === 'left' ? -Math.PI * 0.5 : Math.PI
  const posX = align === 'left' ? -10 : 10

  const [blurredUrl, setBlurredUrl] = useState<string | null>(null)

  useEffect(() => {
    blurImageToDataURL(textureUrl, 5).then(setBlurredUrl)
  }, [textureUrl])

  const backgroundTexture = useTexture(blurredUrl ?? textureUrl)
  backgroundTexture.flipY = false

  const material = useMemo(
    () => (gpu ? createBackdropNodeMaterial() : new BackdropMaterial()),
    [gpu],
  )

  useEffect(() => {
    ;(material as any).uTexture = backgroundTexture
  }, [material, backgroundTexture])

  useEffect(() => () => material.dispose(), [material])

  useFrame(({ clock }) => {
    ;(material as any).uTime = clock.getElapsedTime() * 2
  })

  if (!blurredUrl) return null

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
