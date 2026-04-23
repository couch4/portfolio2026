import { Suspense, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { EdgesGeometry, Mesh, MeshStandardMaterial } from 'three'
import { createPointsMaterial, createWireframeMaterial } from '../../Shaders/PointCloudMaterial'
import { usePointCloud } from '@/hooks/usePointCloud'

const terrainUrl = '/gltf/alpsBLock.glb'

// Both material instances kept alive — no shader recompilation on toggle
const alpMaterial = new MeshStandardMaterial({
  color: '#8B7765',
  roughness: 0.8,
  metalness: 0.2,
  transparent: true,
})
const bankMaterial = new MeshStandardMaterial({ color: 'green', transparent: true })
const alpPoints = createPointsMaterial('#a8957a')
const alpWire = createWireframeMaterial('#a8957a')
const bankPoints = createPointsMaterial('#4a8c3f')
const bankWire = createWireframeMaterial('#4a8c3f')

const PEAK_NODES = [
  {
    key: 'peakLeft',
    pos: [-198.12, 62.888, -54.171] as [number, number, number],
    rot: [0, 0.053, 0] as [number, number, number],
    scale: [101.213, 66.852, 101.213] as [number, number, number],
  },
  {
    key: 'peakLeftBack',
    pos: [-81.527, 62.888, -127.939] as [number, number, number],
    rot: [0, 0.211, 0] as [number, number, number],
    scale: [101.213, 66.852, 101.213] as [number, number, number],
  },
  {
    key: 'peakMain',
    pos: [0, 62.888, 0] as [number, number, number],
    rot: [0, -0.259, 0] as [number, number, number],
    scale: [120.419, 79.537, 120.419] as [number, number, number],
  },
  {
    key: 'peakRight',
    pos: [212.629, 62.888, -21.897] as [number, number, number],
    rot: [0, 0.708, 0] as [number, number, number],
    scale: [101.213, 66.852, 101.213] as [number, number, number],
  },
  {
    key: 'peakRightBack',
    pos: [64.433, 62.888, -127.939] as [number, number, number],
    rot: [0, 0.211, 0] as [number, number, number],
    scale: [101.213, 66.852, 101.213] as [number, number, number],
  },
  {
    key: 'peakRightFront',
    pos: [110.734, 38.915, 118.266] as [number, number, number],
    rot: [0, -1.241, 0] as [number, number, number],
    scale: [112.9, 42.661, 112.9] as [number, number, number],
  },
] as const

const Terrain = ({ props }: { props?: any }) => {
  const mountainRangeRef = useRef(null)
  const { nodes } = useGLTF(terrainUrl)
  const progress = usePointCloud()

  // EdgesGeometry per peak — computed once, gives clean mountain ridgelines
  const edgeGeos = useMemo(
    () => PEAK_NODES.map(({ key }) => new EdgesGeometry((nodes[key] as Mesh).geometry, 20)),
    [nodes],
  )

  const leftBankEdges = useMemo(
    () => new EdgesGeometry((nodes.leftBank as Mesh).geometry, 20),
    [nodes],
  )
  const rightBankEdges = useMemo(
    () => new EdgesGeometry((nodes.rightBank as Mesh).geometry, 20),
    [nodes],
  )

  useFrame(() => {
    const p = progress.current
    alpMaterial.opacity = 1 - p
    bankMaterial.opacity = 1 - p
    alpPoints.uniforms.uProgress.value = p
    alpWire.uniforms.uProgress.value = p
    bankPoints.uniforms.uProgress.value = p
    bankWire.uniforms.uProgress.value = p
  })

  return (
    <Suspense fallback={null}>
      <group
        {...props}
        dispose={null}
        rotation={[0, -Math.PI, 0]}
        scale={0.1}
        position={[0, -50, 0]}
      >
        <group
          ref={mountainRangeRef}
          position={[0, 8.995, -4177.279]}
          scale={[8.39 * 1.5, 8.125 * 1.5, 4.627 * 1.5]}
        >
          {PEAK_NODES.map(({ key, pos, rot, scale }, i) => {
            const geo = (nodes[key] as Mesh).geometry
            return (
              <group key={key} position={pos} rotation={rot} scale={scale}>
                <mesh castShadow receiveShadow geometry={geo} material={alpMaterial} />
                <points geometry={geo} material={alpPoints} />
                <lineSegments geometry={edgeGeos[i]} material={alpWire} />
              </group>
            )
          })}
        </group>

        {/* Left bank */}
        <group position={[-687.12, 0, -1521.199]} scale={[222.496, 25.006, 904.699]}>
          <mesh
            castShadow
            receiveShadow
            geometry={(nodes.leftBank as Mesh).geometry}
            material={bankMaterial}
          />
          <points geometry={(nodes.leftBank as Mesh).geometry} material={bankPoints} />
          <lineSegments geometry={leftBankEdges} material={bankWire} />
        </group>

        {/* Right bank */}
        <group
          position={[702.643, 0, -1381.945]}
          rotation={[-Math.PI, 0, 0]}
          scale={[-222.496, -25.006, -904.699]}
        >
          <mesh
            castShadow
            receiveShadow
            geometry={(nodes.rightBank as Mesh).geometry}
            material={bankMaterial}
          />
          <points geometry={(nodes.rightBank as Mesh).geometry} material={bankPoints} />
          <lineSegments geometry={rightBankEdges} material={bankWire} />
        </group>
        {/* <mesh
          castShadow
          receiveShadow
          geometry={(nodes.Landscape as any).geometry}
          position={[-504.072, 55.881, -3850.142]}
          rotation={[Math.PI, -0.985, Math.PI]}
          scale={[1221.554, 1781.382, 1771.682]}
        /> */}
      </group>
    </Suspense>
  )
}

export default Terrain

useGLTF.preload(terrainUrl)
