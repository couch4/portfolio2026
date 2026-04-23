import { FC } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

interface TreePlaneProps {
  url: string
}

const TreePlane: FC<TreePlaneProps> = ({ url, ...props }) => {
  const tex = useTexture(url)

  return (
    <mesh {...props}>
      <planeGeometry args={[10, 10]} />
      <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} alphaTest={true} />
    </mesh>
  )
}

export default TreePlane
