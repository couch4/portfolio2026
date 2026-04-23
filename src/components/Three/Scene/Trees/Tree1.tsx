import { FC, Suspense } from 'react'
import { useGLTF } from '@react-three/drei'

const treeUrl = '/gltf/pineTree.glb'

const Tree1: FC<any> = ({ props }) => {
  const { nodes } = useGLTF(treeUrl)
  return (
    <>
      <Suspense fallback={null}>
        <group {...props} dispose={null}>
          <mesh castShadow receiveShadow geometry={(nodes.Object_4 as any).geometry} />
        </group>
      </Suspense>
    </>
  )
}

export default Tree1

useGLTF.preload(treeUrl)
