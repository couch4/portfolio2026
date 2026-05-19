import { useMemo } from 'react'
import { makeRng } from './treeGeometry'
import { InstancedLayer } from './InstancedLayer'
import { useForestData } from './useForestData'

interface TreePlacement {
  x?: number
  y?: number
  z?: number
  rotY?: number
  scale?: number
  seed?: number
  treeParams?: Record<string, any>
}

interface ForestProps {
  treeCount?: number
  spread?: number
  minSpacing?: number
  leafStyle?: number
  foliageColorStem?: string
  foliageColorMid?: string
  foliageColorTip?: string
  stemStop?: number
  midStop?: number
  barkColor?: string
  sharedParams?: Record<string, any>
  placements?: TreePlacement[]
  windEnabled?: boolean
  windStrength?: number
  windSpeed?: number
  windDirection?: [number, number]
}

export function Forest({
  treeCount = 30,
  spread = 60,
  minSpacing = 0,
  leafStyle = 1,
  foliageColorStem = '#1a4a0a',
  foliageColorMid = '#3a8c1a',
  foliageColorTip = '#9acc3a',
  stemStop = 0.25,
  midStop = 0.6,
  barkColor = '#67483a',
  sharedParams = {},
  placements: placementsProp,
  windEnabled = false,
  windStrength = 0.08,
  windSpeed = 1.0,
  windDirection = [1, 0] as [number, number],
}: ForestProps) {
  // Generate placements if not provided
  const placements = useMemo<TreePlacement[]>(() => {
    if (placementsProp) return placementsProp
    const rng = makeRng(9001)
    const minSpacingSq = minSpacing * minSpacing
    const placed: { x: number; z: number }[] = []
    const result: TreePlacement[] = []
    const maxAttempts = treeCount * 20
    let attempts = 0
    let i = 0
    while (result.length < treeCount && attempts < maxAttempts) {
      attempts++
      const angle = rng() * Math.PI * 2
      const radius = Math.sqrt(rng()) * spread * 0.5
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      if (minSpacingSq > 0 && placed.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < minSpacingSq)) {
        continue
      }
      const rotY = rng() * Math.PI * 2
      const scale = 0.75 + rng() * 0.55
      const isTall = rng() < 0.1
      placed.push({ x, z })
      result.push({
        x,
        z,
        y: 0,
        rotY,
        scale: isTall ? scale * 1.35 : scale,
        seed: i * 137 + 1,
        treeParams: isTall
          ? {
              trunkHeight: 14,
              rungCount: 8,
              branchesPerRung: 5,
              branchLength: 3,
              branchLengthVariance: 0.8,
              branchDroop: 0.55,
              droopTopBias: 1.0,
              foliageScaleBase: 0.9,
              foliageScaleTop: 0.45,
              rungStart: 0.35,
            }
          : undefined,
      })
      i++
    }
    return result
  }, [treeCount, spread, minSpacing, placementsProp])

  const {
    branchTransforms,
    trunkSlots,
    branchColors,
    branchUvOffsets,
    branchGeo,
    branchMat,
    trunkMat,
  } = useForestData({
    placements,
    sharedParams,
    leafStyle,
    foliageColorStem,
    foliageColorMid,
    foliageColorTip,
    stemStop,
    midStop,
    barkColor,
  })

  return (
    <>
      {/* One draw call for all branches across every tree */}
      <InstancedLayer
        transforms={branchTransforms}
        geometry={branchGeo}
        material={branchMat}
        uvOffsets={branchUvOffsets}
        instanceColors={branchColors}
        windEnabled={windEnabled}
        windStrength={windStrength}
        windSpeed={windSpeed}
        windDirection={windDirection}
      />

      {/* One draw call per trunk geometry variation */}
      {trunkSlots
        .filter((slot) => slot.geo !== null)
        .map((slot, i) => (
          <InstancedLayer
            key={i}
            transforms={slot.transforms}
            geometry={slot.geo!}
            material={trunkMat}
          />
        ))}
    </>
  )
}
