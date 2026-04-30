import { useEffect, useMemo, useRef } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { Group, Material, Mesh, Plane } from 'three'
import { motion } from 'r3f-motion'

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
  const clonedScene = useMemo(() => scene.clone(true), [scene])

  useEffect(() => {
    if (!clippingPlanes || inPortal) return
    const cloned: Material[] = []
    clonedScene.traverse((obj: Mesh) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      const mat = mesh.material
      if (Array.isArray(mat)) {
        const mats = mat.map((m) => {
          const c = m.clone()
          c.clippingPlanes = clippingPlanes
          c.clipShadows = true
          cloned.push(c)
          return c
        })
        mesh.material = mats
      } else if (mat) {
        const c = mat.clone()
        c.clippingPlanes = clippingPlanes
        c.clipShadows = true
        cloned.push(c)
        mesh.material = c
      }
    })
    return () => {
      cloned.forEach((m) => m.dispose())
    }
  }, [clonedScene, clippingPlanes, inPortal])

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
    <motion.group ref={animRef} animate={{ z: isActive ? 5 : 0, x: isActive ? posX * 2 : 0 }}>
      <primitive object={clonedScene} {...modelSettings} position-x={posX} />
    </motion.group>
  )
}

export default ProjectHero
