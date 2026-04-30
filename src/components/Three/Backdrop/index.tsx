import { memo, useEffect, useRef, useState } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import { BackdropMaterial } from '@/components/Three/Shaders/BackdropMaterial'
import { blurImageToDataURL } from '@/utilities/blurImage'
import type { Texture } from 'three'

extend({ BackdropMaterial })

declare module '@react-three/fiber' {
  interface ThreeElements {
    backdropMaterial: ThreeElements['meshStandardMaterial'] & {
      uTime?: number
      uTexture?: Texture | null
    }
  }
}

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
  const matRef = useRef<InstanceType<typeof BackdropMaterial>>(null)

  const rotateY = align === 'left' ? -Math.PI * 0.5 : Math.PI
  const posX = align === 'left' ? -10 : 10

  const [blurredUrl, setBlurredUrl] = useState<string | null>(null)

  useEffect(() => {
    blurImageToDataURL(textureUrl, 5).then(setBlurredUrl)
  }, [textureUrl])

  const backgroundTexture = useTexture(blurredUrl ?? textureUrl)
  backgroundTexture.flipY = false

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uTime = clock.getElapsedTime() * 2
    }
  })

  if (!blurredUrl) return null

  return (
    <group {...props} rotation-y={rotateY} scale={20} position={[posX, 10, -20]}>
      <mesh receiveShadow>
        <primitive object={nodes.backdrop.geometry} attach="geometry" />
        <backdropMaterial ref={matRef} uTexture={backgroundTexture} />
      </mesh>
    </group>
  )
}

export default memo(Backdrop)
