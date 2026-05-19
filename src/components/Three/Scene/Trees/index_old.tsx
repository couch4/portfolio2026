import { useRef, useMemo, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import {
  BufferGeometry,
  Euler,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three'
import { createPointsMaterial, createWireframeMaterial } from '../../Shaders/PointCloudMaterial'
import { usePointCloud } from '@/hooks/usePointCloud'

const TREES_PER_BANK = 1000
const TOTAL_TREES = TREES_PER_BANK * 2
const CONSTELLATION_NEIGHBORS = 3
const CONSTELLATION_MAX_DIST = 12

const terrainUrl = '/gltf/alpsBlock.glb'
const treeUrl = '/gltf/pineTree.glb'

const groupMatrix = new Matrix4().compose(
  new Vector3(0, -50, 0),
  new Quaternion().setFromEuler(new Euler(0, -Math.PI, 0)),
  new Vector3(0.1, 0.1, 0.1),
)
const leftBankMatrix = new Matrix4().compose(
  new Vector3(-687.12, 0, -1521.199),
  new Quaternion(),
  new Vector3(222.496, 25.006, 904.699),
)
const rightBankMatrix = new Matrix4().compose(
  new Vector3(702.643, 0, -1381.945),
  new Quaternion().setFromEuler(new Euler(-Math.PI, 0, 0)),
  new Vector3(-222.496, -25.006, -904.699),
)

function sampleSurface(geo: BufferGeometry, localToGroup: Matrix4, count: number): Vector3[] {
  const posAttr = geo.attributes.position
  const n = posAttr.count
  const worldFromLocal = groupMatrix.clone().multiply(localToGroup)
  const result: Vector3[] = []
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * n)
    result.push(
      new Vector3(posAttr.getX(idx), posAttr.getY(idx), posAttr.getZ(idx)).applyMatrix4(worldFromLocal),
    )
  }
  return result
}

/** k-nearest constellation — O(n²) but runs once in useMemo */
function buildConstellationGeo(positions: Vector3[]): BufferGeometry {
  const verts: number[] = []
  for (let i = 0; i < positions.length; i++) {
    const dists: { j: number; d: number }[] = []
    for (let j = i + 1; j < positions.length; j++) {
      const d = positions[i].distanceTo(positions[j])
      if (d < CONSTELLATION_MAX_DIST) dists.push({ j, d })
    }
    dists.sort((a, b) => a.d - b.d)
    dists.slice(0, CONSTELLATION_NEIGHBORS).forEach(({ j }) => {
      const a = positions[i], b = positions[j]
      verts.push(a.x, a.y, a.z, b.x, b.y, b.z)
    })
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(verts), 3))
  return geo
}

// Both material instances kept alive to avoid recompilation
const treeMaterial = new MeshStandardMaterial({ color: '#2d5a27', roughness: 0.8, transparent: true })
const treePoints = createPointsMaterial('#3a7a32')
const treeWire   = createWireframeMaterial('#3a7a32')

const Trees = () => {
  const instancedRef = useRef<InstancedMesh>(null)
  const { nodes: terrainNodes } = useGLTF(terrainUrl)
  const { nodes: treeNodes } = useGLTF(treeUrl)
  const treeGeometry = (treeNodes.Object_4 as Mesh).geometry
  const progress = usePointCloud()

  const positions = useMemo(() => {
    const leftGeo  = (terrainNodes.leftBank  as Mesh).geometry
    const rightGeo = (terrainNodes.rightBank as Mesh).geometry
    return [
      ...sampleSurface(leftGeo,  leftBankMatrix,  TREES_PER_BANK),
      ...sampleSurface(rightGeo, rightBankMatrix, TREES_PER_BANK),
    ]
  }, [terrainNodes])

  useEffect(() => {
    const mesh = instancedRef.current
    if (!mesh) return
    const m = new Matrix4(), q = new Quaternion(), s = new Vector3()
    positions.forEach((pos, i) => {
      q.setFromEuler(new Euler(0, Math.random() * Math.PI * 2, 0))
      const scale = (20 + Math.random() * 20) * 0.08
      s.set(scale, scale, scale)
      m.compose(pos, q, s)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [positions])

  // One point per tree centroid
  const centroidGeo = useMemo(() => {
    const arr = new Float32Array(positions.length * 3)
    positions.forEach((p, i) => { arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z })
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(arr, 3))
    return geo
  }, [positions])

  // Constellation edges between nearby tree centroids
  const constellationGeo = useMemo(() => buildConstellationGeo(positions), [positions])

  useFrame(() => {
    const p = progress.current
    treeMaterial.opacity = 1 - p
    treePoints.uniforms.uProgress.value = p
    treeWire.uniforms.uProgress.value   = p
  })

  return (
    <>
      <instancedMesh ref={instancedRef} args={[treeGeometry, treeMaterial, TOTAL_TREES]} castShadow receiveShadow />
      <points geometry={centroidGeo} material={treePoints} />
      <lineSegments geometry={constellationGeo} material={treeWire} />
    </>
  )
}

export default Trees

useGLTF.preload(treeUrl)
