import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  createGrassGroundMaterial,
  createGrassGroundUniforms,
  GrassGroundUniforms,
} from './GrassGroundMaterial'

// ---------------------------------------------------------------------------
// GrassGround
//
// A flat plane that uses the raymarched GrassGroundMaterial fragment shader.
// ---------------------------------------------------------------------------

export interface GrassGroundProps {
  /** World-space size of the plane (metres). Default 40. */
  size?: number
  /** Plane subdivision segments — more = smoother fog gradient. Default 1. */
  segments?: number
  /** Y position offset (put slightly above ground to avoid z-fighting). Default 0.002. */
  yOffset?: number

  // Grass colours (4 blended patch types)
  col1?: string
  col2?: string
  col3?: string
  col4?: string

  // Grass geometry
  /** Ambient brightness 0–1. Default 0.8. */
  ambient?: number
  /** Noise frequency for grass height variation. Default 15. */
  gScale?: number
  /** Max grass blade height in world units. Default 1.5. */
  gHeight?: number
  /** Noise frequency for terrain undulation. Default 0.05. */
  terrainScale?: number
  /** Peak terrain height variation. Default 6. */
  terrainHeight?: number
}

export function GrassGround({
  size = 40,
  segments = 1,
  yOffset = 0.002,
  col1 = '#99de80',
  col2 = '#373d0d',
  col3 = '#ffff19',
  col4 = '#ff66b3',
  ambient = 0.8,
  gScale = 15.0,
  gHeight = 1.5,
  terrainScale = 0.05,
  terrainHeight = 6.0,
}: GrassGroundProps) {
  const { scene, camera } = useThree()
  const uniformsRef = useRef<GrassGroundUniforms | null>(null)

  const material = useMemo(() => {
    const uniforms = createGrassGroundUniforms({
      col1,
      col2,
      col3,
      col4,
      ambient,
      gScale,
      gHeight,
      terrainScale,
      terrainHeight,
    })
    uniformsRef.current = uniforms
    return createGrassGroundMaterial(uniforms)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [col1, col2, col3, col4, ambient, gScale, gHeight, terrainScale, terrainHeight])

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(size, size, segments, segments),
    [size, segments],
  )

  useFrame(() => {
    const u = uniformsRef.current
    if (!u) return

    u.uCameraPos.value.copy(camera.position)

    // Auto-sync scene fog
    const fog = scene.fog as THREE.Fog | null
    if (fog && 'near' in fog) {
      u.uFogNear.value = fog.near
      u.uFogFar.value = fog.far
      u.uFogColor.value.copy(fog.color)
    }
  })

  return (
    <mesh
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, yOffset, 0]}
      receiveShadow
    />
  )
}
