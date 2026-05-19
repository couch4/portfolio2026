import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  buildGrassShardGeometry,
  generateGrassClumps,
  generateGrassField,
  GrassClumpParams,
  GrassShardParams,
} from './grassGeometry'
import {
  createGrassMaterial,
  createGrassMaterialUniforms,
  GrassMaterialUniforms,
} from './GrassMaterial'

// ---------------------------------------------------------------------------
// GrassClumps
//
// Standalone component — pass origins explicitly or let it scatter a field.
// Integrates with Forest by accepting trunk origins as the `origins` prop.
// ---------------------------------------------------------------------------

export interface GrassClumpsProps {
  /** World-space origin positions to clump grass around. */
  origins?: THREE.Vector3[]
  /** If origins is omitted, scatter a random field with this many clump centres. */
  fieldCount?: number
  /** Spread radius for random field mode (metres). */
  fieldSpread?: number
  /** Seed for random field placement. */
  fieldSeed?: number

  // Shard shape
  shardParams?: GrassShardParams

  // Clump scatter
  clumpParams?: GrassClumpParams

  // Wind
  windEnabled?: boolean
  windStrength?: number
  windSpeed?: number
  windDirection?: [number, number]

  // Visuals
  colorBase?: string
  colorTip?: string
  /** World-space sun direction (x,y,z) */
  lightDir?: [number, number, number]
  lightColor?: string
  ambientColor?: string
  /** Backlit subsurface glow strength 0-1 */
  translucency?: number
  /** Grazing-angle rim highlight strength 0-1 */
  rimStrength?: number

  castShadow?: boolean
  receiveShadow?: boolean
}

export function GrassClumps({
  origins,
  fieldCount = 40,
  fieldSpread = 30,
  fieldSeed = 9999,
  shardParams = {},
  clumpParams = {},
  windEnabled = true,
  windStrength = 0.06,
  windSpeed = 1.2,
  windDirection = [1, 0] as [number, number],
  colorBase = '#1a3a0a',
  colorTip = '#6dc230',
  lightDir = [0.4, 0.8, 0.3],
  lightColor = '#ffe8c0',
  ambientColor = '#1a2f14',
  translucency = 0.55,
  rimStrength = 0.35,
  castShadow = false,
  receiveShadow = false,
}: GrassClumpsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { scene } = useThree()
  const uniformsRef = useRef<GrassMaterialUniforms | null>(null)

  // Build the shared shard geometry (one blade template)
  const shardGeo = useMemo(
    () => buildGrassShardGeometry(shardParams),
    [
      shardParams.height,
      shardParams.baseWidth,
      shardParams.tipWidth,
      shardParams.lean,
      shardParams.segments,
    ],
  )

  // Generate per-instance transforms
  const transforms = useMemo(() => {
    if (origins && origins.length > 0) {
      return generateGrassClumps(origins, clumpParams)
    }
    return generateGrassField(fieldCount, fieldSpread, clumpParams, fieldSeed)
  }, [
    origins,
    fieldCount,
    fieldSpread,
    fieldSeed,
    clumpParams.bladesPerClump,
    clumpParams.clumpRadius,
    clumpParams.heightMin,
    clumpParams.heightMax,
    clumpParams.leanMin,
    clumpParams.leanMax,
    clumpParams.seed,
  ])

  // Build material with all uniforms
  const material = useMemo(() => {
    const uniforms = createGrassMaterialUniforms({
      colorBase,
      colorTip,
      lightDir: new THREE.Vector3(...lightDir),
      lightColor,
      ambientColor,
      translucency,
      rimStrength,
    })
    uniforms.uWindStrength.value = windStrength
    uniforms.uWindSpeed.value = windSpeed
    uniforms.uWindDir.value.set(windDirection[0], windDirection[1])
    uniformsRef.current = uniforms
    return createGrassMaterial(uniforms)
    // Recreate only when structural visual props change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorBase, colorTip, lightColor, ambientColor, translucency, rimStrength])

  // Write instance matrices after mount / when transforms change
  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    transforms.forEach((t, i) => {
      dummy.position.copy(t.position)
      dummy.rotation.copy(t.rotation)
      dummy.scale.copy(t.scale)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [transforms])

  // Sync scene fog into material uniforms each frame (cheap — just float writes)
  useFrame((_, delta) => {
    const u = uniformsRef.current
    if (!u) return

    // Wind
    if (windEnabled) u.uTime.value += delta
    u.uWindStrength.value = windEnabled ? windStrength : 0
    u.uWindSpeed.value = windSpeed
    u.uWindDir.value.set(windDirection[0], windDirection[1])

    // Sync Three.js scene fog automatically so grass matches the scene
    const fog = scene.fog as THREE.Fog | null
    if (fog && 'near' in fog) {
      u.uFogNear.value = fog.near
      u.uFogFar.value = fog.far
      u.uFogColor.value.copy(fog.color)
    }
  })

  if (!transforms.length) return null

  return (
    <instancedMesh
      ref={meshRef}
      args={[shardGeo, material, transforms.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      onUpdate={(self) => {
        const dummy = new THREE.Object3D()
        transforms.forEach((t, i) => {
          dummy.position.copy(t.position)
          dummy.rotation.copy(t.rotation)
          dummy.scale.copy(t.scale)
          dummy.updateMatrix()
          self.setMatrixAt(i, dummy.matrix)
        })
        self.instanceMatrix.needsUpdate = true
      }}
    />
  )
}
