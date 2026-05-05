import { useEffect, useMemo, useRef } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { Group, Material, Mesh, Plane } from 'three'
import { motion } from 'r3f-motion'

// WebGPU fix: material.clone() can lose texture bindings when the renderer
// converts standard materials to NodeMaterials via fromMaterial(). Explicitly
// re-assigning every map property after cloning forces the node builder to
// pick up the correct texture references.
const MAP_KEYS = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'emissiveMap',
  'bumpMap',
  'displacementMap',
  'alphaMap',
  'envMap',
  'lightMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
  'sheenColorMap',
  'sheenRoughnessMap',
  'transmissionMap',
  'thicknessMap',
  'specularIntensityMap',
  'specularColorMap',
  'iridescenceMap',
  'iridescenceThicknessMap',
  'anisotropyMap',
] as const

function cloneMaterialWebGPUSafe(source: Material): Material {
  const clone = source.clone()
  for (const key of MAP_KEYS) {
    if (key in source) (clone as any)[key] = (source as any)[key]
  }
  return clone
}

const ProjectHero = ({
  data,
  floatY,
  inPortal,
  spinY,
  outerRef,
  clippingPlanes,
  isActive,
}: {
  data: any
  floatY?: MutableRefObject<number>
  spinY?: MutableRefObject<number>
  inPortal?: boolean
  outerRef?: RefObject<Group | null>
  clippingPlanes?: Plane[]
  isActive?: boolean
}) => {
  const { align, gltf, modelSettings } = data
  const { scene }: any = useGLTF(gltf)

  const { clonedScene, clonedMaterials } = useMemo(() => {
    const clone = scene.clone(true)
    const cloned: Material[] = []

    if (clippingPlanes && !inPortal) {
      clone.traverse((obj: Mesh) => {
        const mesh = obj as Mesh
        if (!mesh.isMesh) return
        const mat: Material | Material[] = mesh.material

        if (Array.isArray(mat)) {
          mesh.material = mat.map((m) => {
            const c = cloneMaterialWebGPUSafe(m)
            c.clippingPlanes = clippingPlanes
            c.clipShadows = true
            c.needsUpdate = true
            cloned.push(c)
            return c
          })
        } else if (mat) {
          const c = cloneMaterialWebGPUSafe(mat)
          c.clippingPlanes = clippingPlanes
          c.clipShadows = true
          c.needsUpdate = true
          cloned.push(c)
          mesh.material = c
        }
      })
    }

    return { clonedScene: clone, clonedMaterials: cloned }
  }, [scene, clippingPlanes, inPortal])

  useEffect(() => {
    return () => {
      clonedMaterials.forEach((m) => m.dispose())
    }
  }, [clonedMaterials])

  let posX = 0
  if (modelSettings?.position) {
    posX = align === 'left' ? -modelSettings.position[0] : modelSettings.position[0]
  }

  const innerGroupRef = useRef<Group>(null)
  // For the OUTER instance, use the parent-supplied outerRef so it can be read
  // from the in-portal instance to mirror world transform.
  const animRef = !inPortal && outerRef ? outerRef : innerGroupRef

  useFrame(() => {
    const g = animRef.current
    if (!g) return
    if (inPortal && outerRef?.current) {
      g.position.copy(outerRef.current.position)
      g.rotation.copy(outerRef.current.rotation)
      return
    }
    if (floatY && modelSettings.floatY) {
      g.position.y = floatY.current
    }
    if (spinY && modelSettings.spinY) {
      g.rotation.y = spinY.current
    }
  })

  return (
    <motion.group
      ref={animRef}
      initial={false}
      animate={{ z: isActive ? 5 : 0, x: isActive ? posX * 2 : 0 }}
    >
      <primitive object={clonedScene} {...modelSettings} position-x={posX} />
    </motion.group>
  )
}

export default ProjectHero
