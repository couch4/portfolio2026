import { Suspense, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, EdgesGeometry, Mesh, MeshStandardMaterial } from 'three'
import { createPointsMaterial, createWireframeMaterial } from '../../Shaders/PointCloudMaterial'
import { usePointCloud } from '@/hooks/usePointCloud'

const terrainUrl = '/gltf/alpsBlock4.glb'

const mountainsOffset = 2000

const Terrain = ({ props }: { props?: any }) => {
  const mountainRangeRef = useRef(null)
  const { nodes, materials = {} } = useGLTF(terrainUrl)

  return (
    <Suspense fallback={null}>
      <group {...props} dispose={null} scale={0.1} position={[0, -50, 0]}>
        <mesh
          name="Icosphere"
          castShadow
          receiveShadow
          geometry={nodes.Icosphere?.geometry}
          material={nodes.Icosphere?.material}
          position={[-67.107, 0.182, -148.335]}
          scale={8.966}
        />
        <mesh
          name="Icosphere001"
          castShadow
          receiveShadow
          geometry={nodes.Icosphere001?.geometry}
          material={nodes.Icosphere001?.material}
          position={[-58.356, 1.259, -132.105]}
          scale={8.966}
        />
        <mesh
          name="Icosphere002"
          castShadow
          receiveShadow
          geometry={nodes.Icosphere002?.geometry}
          material={nodes.Icosphere002?.material}
          position={[-137.872, 0.012, -81.443]}
          rotation={[0.006, -0.002, -0.465]}
          scale={[21.424, 14.197, 21.424]}
        />
        <mesh
          name="Icosphere003"
          castShadow
          receiveShadow
          geometry={nodes.Icosphere003?.geometry}
          material={nodes.Icosphere003?.material}
          position={[-160.983, 0.012, -60.617]}
          rotation={[-0.105, 0, -0.412]}
          scale={[21.424, 14.197, 21.424]}
        />
        <mesh
          name="Retopo_big_rock001"
          castShadow
          receiveShadow
          geometry={nodes.Retopo_big_rock001?.geometry}
          material={nodes.Retopo_big_rock001?.material}
          position={[8.291, 1.068, -320.568]}
          scale={1.482}
        />
        <mesh
          name="Retopo_big_rock002"
          castShadow
          receiveShadow
          geometry={nodes.Retopo_big_rock002?.geometry}
          material={nodes.Retopo_big_rock002?.material}
          position={[25.007, 7.401, 104.061]}
        />
        <mesh
          name="Icosphere004"
          castShadow
          receiveShadow
          geometry={nodes.Icosphere004?.geometry}
          material={nodes.Icosphere004?.material}
          position={[0, 3.229, 0]}
          rotation={[0.56, -0.247, -0.172]}
          scale={[4.323, 2.244, 4.323]}
        />
        <mesh
          name="campfire"
          castShadow
          receiveShadow
          geometry={nodes.campfire?.geometry}
          material={materials?.tripo_mat_e19d9078}
          position={[332.283, 12.16, -759.269]}
          rotation={[0, -1.423, 0]}
          scale={47.801}
        />
        <mesh name="Retopo_leftBank002" receiveShadow geometry={nodes.Retopo_leftBank002?.geometry}>
          <meshStandardMaterial color="#578e57" roughness={1} metalness={0} side={DoubleSide} />
        </mesh>
        <mesh
          name="Icosphere005"
          castShadow
          receiveShadow
          geometry={nodes.Icosphere005?.geometry}
          material={nodes.Icosphere005?.material}
          position={[0, 3.229, 0]}
          rotation={[0.373, 0.694, 0.789]}
          scale={[4.323, 2.244, 4.323]}
        />
        {/* <PerspectiveCamera
          name="Camera"
          makeDefault={false}
          far={5000}
          near={0.1}
          fov={31.417}
          position={[2.09, 0.639, 443.975]}
          rotation={[0.037, 0.06, -0.002]}
          scale={0.197}
        /> */}
        {/* <group
          name="mountainRange"
          position={[-80.988, 1.789, -1574.498]}
          scale={[3.892, 3.769, 2.146]}
        /> */}
        <mesh
          name="boat"
          castShadow
          receiveShadow
          geometry={nodes.boat?.geometry}
          material={nodes.boat?.material}
          position={[148.211, -4.097, -542.391]}
          rotation={[-Math.PI, -0.847, -3.099]}
          scale={52.037}
        />
        <mesh
          name="jetty"
          castShadow
          receiveShadow
          geometry={nodes.jetty?.geometry}
          material={materials?.['tripo_mat_9c9082df-5a96-480a-bef9-acd07b6c1c78']}
          position={[166.064, -1.797, -508.363]}
          rotation={[0, 0.183, 0]}
          scale={91.035}
        />
        <mesh
          name="cabin"
          castShadow
          receiveShadow
          geometry={nodes.cabin?.geometry}
          material={materials?.['tripo_mat_1a0ac4cc-7946-42f0-81ec-1795afdce3f3']}
          position={[346.856, -14.603, -575.906]}
          rotation={[-Math.PI, 0.126, -Math.PI]}
          scale={320.089}
        />
        <mesh
          name="rightBank001"
          receiveShadow
          geometry={nodes.rightBank001?.geometry}
          // material={materials.grass}
        >
          <meshStandardMaterial color="#578e57" roughness={1} metalness={0} />
        </mesh>
        <group scale={5} position={[0, 0, 100]}>
          <mesh
            name="peakLeft"
            castShadow
            receiveShadow
            geometry={nodes.peakLeft?.geometry}
            position={[-1102.081, 238.81, mountainsOffset - 4383.688]}
            rotation={[0, 0.062, 0]}
            scale={[521.932, 333.885, 585.387]}
          >
            <meshStandardMaterial color="grey" fog={false} />
          </mesh>
          <mesh
            name="peakLeftBack"
            castShadow
            receiveShadow
            geometry={nodes.peakLeftBack?.geometry}
            position={[-500.787, 238.81, mountainsOffset - 4810.96]}
            rotation={[0, 0.242, 0]}
            scale={[521.31, 333.885, 574.048]}
          >
            <meshStandardMaterial color="grey" fog={false} />
          </mesh>
          <mesh
            name="peakMain"
            castShadow
            receiveShadow
            geometry={nodes.peakMain?.geometry}
            position={[-80.334, 238.81, mountainsOffset - 4069.925]}
            rotation={[0, -0.295, 0]}
            scale={[619.878, 397.242, 676.674]}
          >
            <meshStandardMaterial color="grey" fog={false} />
          </mesh>
          <mesh
            name="peakRight"
            castShadow
            receiveShadow
            geometry={nodes.peakRight?.geometry}
            position={[1016.238, 238.81, mountainsOffset - 4196.758]}
            rotation={[0, 0.705, 0]}
            scale={[640.748, 410.196, 647.208]}
          >
            <meshStandardMaterial color="grey" fog={false} />
          </mesh>
          <mesh
            name="peakRightBack"
            castShadow
            receiveShadow
            geometry={nodes.peakRightBack?.geometry}
            position={[251.96, 238.81, mountainsOffset - 4810.96]}
            rotation={[0, 0.242, 0]}
            scale={[521.31, 333.885, 574.048]}
          >
            <meshStandardMaterial color="grey" fog={false} />
          </mesh>
        </group>
      </group>
    </Suspense>
  )
}

export default Terrain

useGLTF.preload(terrainUrl)
