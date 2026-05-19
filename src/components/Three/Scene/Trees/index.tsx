import { useMemo, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { makeRng } from '@/components/Three/Tree/treeGeometry'
import { Forest } from '@/components/Three/Tree/Forest'

interface TreePlacement {
  x?: number
  y?: number
  z?: number
  rotY?: number
  scale?: number
  seed?: number
  treeParams?: Record<string, any>
}

export { Forest as Trees }
export default Forest

// ---------------------------------------------------------------------------
// Density map pixel sampler
// Loads a PNG via canvas and returns a lookup function (u,v) -> [0,1]
// ---------------------------------------------------------------------------
function useDensityMap(url: string): ((u: number, v: number) => number) | null {
  const [sampler, setSampler] = useState<((u: number, v: number) => number) | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        if (cancelled) return undefined
        return createImageBitmap(new Blob([buf], { type: 'image/png' }))
      })
      .then((bitmap) => {
        if (!bitmap || cancelled) return
        const oc = new OffscreenCanvas(bitmap.width, bitmap.height)
        const ctx = oc.getContext('2d') as OffscreenCanvasRenderingContext2D
        ctx.drawImage(bitmap, 0, 0)
        bitmap.close()
        const data = ctx.getImageData(0, 0, oc.width, oc.height).data
        const w = oc.width
        const h = oc.height
        // Stable function reference — wrap in a closure that captures data
        const fn = (u: number, v: number) => {
          const px = Math.max(0, Math.min(w - 1, Math.floor(u * w)))
          const py = Math.max(0, Math.min(h - 1, Math.floor((1 - v) * h)))
          return data[(py * w + px) * 4] / 255
        }
        setSampler(() => fn)
      })
      .catch((e) => console.error('[useDensityMap] failed:', url, e))
    return () => {
      cancelled = true
    }
  }, [url])

  return sampler
}

// ---------------------------------------------------------------------------
// Sample bank geometry vertices in world space, filtered by density map.
// groupScale / groupY: terrain group transform (scale=0.1, y=-50)
// densitySampler: maps (u,v) -> density weight
// seed: deterministic RNG seed
// ---------------------------------------------------------------------------
function sampleBankPlacements(
  geo: THREE.BufferGeometry,
  groupScale: number,
  groupY: number,
  densitySampler: (u: number, v: number) => number,
  count: number,
  seed: number,
  flipU = false,
  flipV = false,
): TreePlacement[] {
  const posAttr = geo.attributes.position
  const n = posAttr.count

  // Compute world XZ AABB for density UV mapping
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity
  for (let i = 0; i < n; i++) {
    const wx = posAttr.getX(i) * groupScale
    const wz = posAttr.getZ(i) * groupScale
    if (wx < minX) minX = wx
    if (wx > maxX) maxX = wx
    if (wz < minZ) minZ = wz
    if (wz > maxZ) maxZ = wz
  }
  const rangeX = maxX - minX || 1
  const rangeZ = maxZ - minZ || 1

  // Water surface is at world Y = -50 (WATER_Y constant in Water/index.tsx)
  // Only spawn on vertices meaningfully above the waterline
  const waterlineY = -49.2

  const rng = makeRng(seed)

  // Rejection sampling — use the mesh's baked UV to sample the density map
  const placements: TreePlacement[] = []
  const maxAttempts = count * 50

  for (let attempt = 0; attempt < maxAttempts && placements.length < count; attempt++) {
    const idx = Math.floor(rng() * n)
    const wx = posAttr.getX(idx) * groupScale
    const wy = posAttr.getY(idx) * groupScale + groupY
    const wz = posAttr.getZ(idx) * groupScale

    // Skip vertices below the waterline
    if (wy < waterlineY) continue

    // No mesh UVs — map world XZ into [0,1] within the mesh AABB
    // V axis is flipped: Blender Y (forward) = Three.js -Z, so high Z = low V
    let u = (wx - minX) / rangeX
    let v = 1 - (wz - minZ) / rangeZ
    if (flipU) u = 1 - u
    if (flipV) v = 1 - v
    const density = densitySampler(u, v)
    if (rng() > density) continue

    placements.push({
      x: wx,
      y: wy,
      z: wz,
      rotY: rng() * Math.PI * 2,
      scale: 0.75 + rng() * 0.55,
      seed: placements.length * 137 + seed,
    })
  }

  return placements
}

// ---------------------------------------------------------------------------
// Terrain GLB url — must match Terrain/index.tsx
// ---------------------------------------------------------------------------
const TERRAIN_URL = '/gltf/alpsBlock4.glb'

// Terrain group transform constants (scale=0.1, position y=-50)
const TERRAIN_GROUP_SCALE = 0.1
const TERRAIN_GROUP_Y = -50

/**
 * BankTrees — spawns Trees on the left and right bank meshes,
 * restricted by per-bank density weight maps.
 */
export function BankTrees({
  treeCount = 1500,
  leafStyle = 1,
  sharedParams = {
    trunkHeight: 10,
    rungCount: 15,
    branchesPerRung: 10,
    branchLength: 3,
    branchLengthVariance: 0.1,
    branchDroop: 0.6,
    droopTopBias: 0.1,
    foliageScaleBase: 1,
    foliageScaleTop: 0.05,
    rungStart: 0.3,
  },
  windEnabled = false,
  windStrength = 0.08,
  windSpeed = 1.0,
  windDirection = [1, 0] as [number, number],
}: {
  treeCount?: number
  leafStyle?: number
  sharedParams?: Record<string, any>
  windEnabled?: boolean
  windStrength?: number
  windSpeed?: number
  windDirection?: [number, number]
}) {
  const { nodes } = useGLTF(TERRAIN_URL)

  const leftDensity = useDensityMap('/textures/banks/leftBankDensity.png')
  const rightDensity = useDensityMap('/textures/banks/rightBankDensity.png')

  const placements = useMemo<TreePlacement[]>(() => {
    if (!leftDensity || !rightDensity) return []

    const leftGeo = (nodes.Retopo_leftBank002 as THREE.Mesh | undefined)?.geometry
    const rightGeo = (nodes.rightBank001 as THREE.Mesh | undefined)?.geometry

    const left = leftGeo
      ? sampleBankPlacements(
          leftGeo,
          TERRAIN_GROUP_SCALE,
          TERRAIN_GROUP_Y,
          leftDensity,
          Math.ceil(treeCount * 0.5),
          1001,
        )
      : []

    const right = rightGeo
      ? sampleBankPlacements(
          rightGeo,
          TERRAIN_GROUP_SCALE,
          TERRAIN_GROUP_Y,
          rightDensity,
          Math.ceil(treeCount * 0.5),
          2002,
        )
      : []

    return [...left, ...right]
  }, [nodes, leftDensity, rightDensity, treeCount])

  if (placements.length === 0) return null

  return (
    <Forest
      placements={placements}
      leafStyle={leafStyle}
      sharedParams={sharedParams}
      windEnabled={windEnabled}
      windStrength={windStrength}
      windSpeed={windSpeed}
      windDirection={windDirection}
    />
  )
}

BankTrees.preload = () => useGLTF.preload(TERRAIN_URL)
