import { memo, useEffect, useState } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
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

  const rotateY = align === 'left' ? -Math.PI * 0.5 : Math.PI
  const posX = align === 'left' ? -10 : 10

  const [blurredUrl, setBlurredUrl] = useState<string | null>(null)

  useEffect(() => {
    blurImageToDataURL(textureUrl, 5).then(setBlurredUrl)
  }, [textureUrl])

  const backgroundTexture = useTexture(blurredUrl ?? textureUrl)
  backgroundTexture.flipY = false

  if (!blurredUrl) return null

  return (
    <group {...props} dispose={null} rotation-y={rotateY} scale={20} position={[posX, 10, -20]}>
      <mesh receiveShadow geometry={nodes.backdrop.geometry}>
        <meshPhysicalMaterial map={backgroundTexture} roughness={0.5} metalness={0.1} />
      </mesh>
    </group>
  )
}

export default memo(Backdrop)
