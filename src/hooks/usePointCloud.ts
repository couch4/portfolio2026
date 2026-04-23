import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import { useSceneStore } from '@/store/sceneStore'

/**
 * Animates a progress ref 0→1 when isDevView is true, 1→0 when false.
 * Use in useFrame to drive material uniforms / opacity.
 */
export function usePointCloud() {
  const isDevView = useSceneStore((s) => s.isDevView)
  const progress = useRef(0)

  useFrame((_, delta) => {
    progress.current = MathUtils.lerp(
      progress.current,
      isDevView ? 1 : 0,
      Math.min(delta * 2.5, 1),
    )
  })

  return progress
}
