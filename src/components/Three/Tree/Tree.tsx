import { useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { BRANCH_GEO } from './treeGeometry'
import { InstancedLayer } from './InstancedLayer'
import { ImpostorBillboard } from './ImpostorBillboard'
import { useForestData } from './useForestData'

// 2x2 atlas UV offsets for each quadrant
export const UV_OFFSETS = [
  [0.0, 0.5], // top-left
  [0.5, 0.5], // top-right
  [0.0, 0.0], // bottom-left
  [0.5, 0.0], // bottom-right
]

// ---------------------------------------------------------------------------
// Shared geometries — created once, reused across all Tree instances
// Swap these for your real GLB meshes once they're modelled:
//   SPRIG_GEO  → needle-card sprig mesh
//   BRANCH_GEO → branch cylinder / organic shape
//   TRUNK_GEO  → trunk cylinder
// ---------------------------------------------------------------------------
export const TRUNK_GEO = new THREE.ConeGeometry(1, 1, 8) // kept for external callers
export { BRANCH_GEO } from './treeGeometry'

// ---------------------------------------------------------------------------
// LOD levels
// ---------------------------------------------------------------------------
export const LOD_LEVELS = {
  LOD0: 0, // Full geometry  (0 – distanceLOD1)
  LOD1: 1, // Impostor billboard (distanceLOD1+)
}

const FADE_SPEED = 4 // units/sec for crossfade (higher = snappier)

// ---------------------------------------------------------------------------
// Tree
// ---------------------------------------------------------------------------
export function Tree({
  // ── Trunk ────────────────────────────────────────────────
  trunkHeight = 8,
  trunkSegments = 6,
  trunkRadiusBase = 0.18,
  trunkRadiusTip = 0.05,
  trunkTaper = 1.4,
  trunkMaxLean = 0.55,

  // ── Branches / rungs ─────────────────────────────────────
  rungCount = 10,
  rungSpacing = 0.85,
  branchesPerRung = 5,
  branchLength = 2.2,
  branchLengthVariance = 0.25,
  branchDroop = 0.35,
  branchAngleSpread = 0.2,
  foliageScaleBase = 1.4, // scale multiplier at bottom rung
  foliageScaleTop = 0.5, // scale multiplier at top rung
  rungStart = 0.15, // 0=ground, 1=trunk tip — where first rung appears

  // ── LOD distances (metres) ───────────────────────────────
  distanceLOD1 = 150, // switch LOD0 → LOD1 (impostor)

  // ── Manual LOD override ──────────────────────────────────
  // When set (0/1) the auto-distance logic is bypassed.
  // Used by Storybook's LOD slider.
  forceLOD = null,

  // ── Seed & visuals ─────────────────────────────────────
  seed = 42,
  foliageColorStem = '#1a4a0a',
  foliageColorMid = '#3a8c1a',
  foliageColorTip = '#9acc3a',
  stemStop = 0.25,
  midStop = 0.6,
  barkColor = '#67483a',

  // ── Leaf billboard ───────────────────────────────────────
  leafStyle = 1, // 1-8: which alpha texture to use

  // ── Wind ────────────────────────────────────────────────────────────────────
  windEnabled = false,
  windStrength = 0.08,
  windSpeed = 1.0,
  windDirection = [1, 0] as [number, number],
  x = 0,
  y = 0,
  z = 0,

  // ── Shadows ───────────────────────────────────────────────────────────────────
  receiveShadow = false,

  // ── Impostor ─────────────────────────────────────────────────────────────────
  atlasTexture = null,
  ...props // THREE.Texture — 4×2 angle atlas
}) {
  const groupRef = useRef<THREE.Group>(null)
  const { camera } = useThree()

  // Single placement at origin — useForestData handles all geometry/material generation
  const placement = useMemo(
    () => ({
      x: 0,
      y: 0,
      z: 0,
      rotY: 0,
      scale: 1,
      seed,
    }),
    [seed],
  )

  // Pass all tree geometry params via sharedParams
  const sharedParams = useMemo(
    () => ({
      trunkHeight,
      trunkSegments,
      trunkRadiusBase,
      trunkRadiusTip,
      trunkTaper,
      trunkMaxLean,
      rungCount,
      rungSpacing,
      branchesPerRung,
      branchLength,
      branchLengthVariance,
      branchDroop,
      branchAngleSpread,
      foliageScaleBase,
      foliageScaleTop,
      rungStart,
    }),
    [
      trunkHeight,
      trunkSegments,
      trunkRadiusBase,
      trunkRadiusTip,
      trunkTaper,
      trunkMaxLean,
      rungCount,
      rungSpacing,
      branchesPerRung,
      branchLength,
      branchLengthVariance,
      branchDroop,
      branchAngleSpread,
      foliageScaleBase,
      foliageScaleTop,
      rungStart,
    ],
  )

  const {
    branchTransforms,
    trunkSlots,
    branchColors,
    branchUvOffsets,
    branchGeo,
    branchMat,
    trunkMat,
  } = useForestData({
    placements: [placement],
    sharedParams,
    leafStyle,
    foliageColorStem,
    foliageColorMid,
    foliageColorTip,
    stemStop,
    midStop,
    barkColor,
  })

  // ── LOD state ──────────────────────────────────────────────────────────
  const [activeLOD, setActiveLOD] = useState(LOD_LEVELS.LOD0)
  const [opacity, setOpacity] = useState(1)
  const prevLODRef = useRef(LOD_LEVELS.LOD0)
  const fadeRef = useRef(1) // 0 = just switched, 1 = fully faded in

  useFrame((_, delta) => {
    if (!groupRef.current) return

    // Determine target LOD
    let targetLOD
    if (forceLOD !== null) {
      targetLOD = forceLOD
    } else {
      const dist = camera.position.distanceTo(
        // @ts-ignore
        groupRef.current?.getWorldPosition(new THREE.Vector3()) || new THREE.Vector3(),
      )
      targetLOD = dist < distanceLOD1 ? LOD_LEVELS.LOD0 : LOD_LEVELS.LOD1
    }

    // Trigger fade when LOD changes
    if (targetLOD !== prevLODRef.current) {
      prevLODRef.current = targetLOD
      setActiveLOD(targetLOD)
      fadeRef.current = 0
    }

    // Advance fade
    if (fadeRef.current < 1) {
      fadeRef.current = Math.min(1, fadeRef.current + delta * FADE_SPEED)
      setOpacity(fadeRef.current)
    }
  })

  const showLOD0 = activeLOD === LOD_LEVELS.LOD0
  const showImpostor = activeLOD === LOD_LEVELS.LOD1

  return (
    <group ref={groupRef} position={[x, y, z]} {...props}>
      {/* ── Trunk — visible at all geometry LODs ── */}
      {!showImpostor &&
        trunkSlots
          .filter((slot) => slot.geo !== null)
          .map((slot, i) => (
            <InstancedLayer
              key={i}
              transforms={slot.transforms}
              geometry={slot.geo!}
              material={trunkMat}
              opacity={opacity}
              receiveShadow={receiveShadow}
            />
          ))}

      {/* ── LOD0 — full sprig count ── */}
      {showLOD0 && (
        <InstancedLayer
          transforms={branchTransforms}
          geometry={branchGeo}
          material={branchMat}
          opacity={opacity}
          uvOffsets={branchUvOffsets}
          instanceColors={branchColors}
          windEnabled={windEnabled}
          windStrength={windStrength}
          windSpeed={windSpeed}
          windDirection={windDirection}
        />
      )}

      {/* ── LOD1 — impostor billboard ── */}
      {showImpostor && (
        <ImpostorBillboard
          atlasTexture={atlasTexture}
          treeHeight={trunkHeight}
          treeWidth={branchLength * 2.2}
          opacity={opacity}
        />
      )}
    </group>
  )
}
