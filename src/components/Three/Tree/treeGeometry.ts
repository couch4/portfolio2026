import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Branch plane geometry factory.
// Plane starts horizontal (XZ), pivot at near edge (stem side).
// rotateX(-PI/2): XY plane -> XZ plane (normal points up)
// translate(0, 0, 0.5): shift so near edge sits at Z=0, tip at Z=+1
//
// The 3-stop colour gradient (stem → mid → tip) is baked per-vertex so every
// leaf billboard shows the gradient regardless of which rung it sits on.
// Per-instance colors then provide only a greyscale rung darkening.
// ---------------------------------------------------------------------------
export interface BranchGeoParams {
  colorStem?: string // colour at Z=0 (branch base)
  colorMid?: string // colour at Z=stemStop (mid point)
  colorTip?: string // colour at Z=1 (branch tip)
  stemStop?: number // Z fraction where stem transitions to mid (0–1)
  midStop?: number // Z fraction where mid transitions to tip (0–1)
}

export function buildBranchGeo({
  colorStem = '#1a4a0a',
  colorMid = '#3a8c1a',
  colorTip = '#9acc3a',
  stemStop = 0.25,
  midStop = 0.6,
}: BranchGeoParams = {}): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(1, 1, 1, 4)
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, 0, 0.5)
  const pos = geo.getAttribute('position')
  const colors = new Float32Array(pos.count * 3)
  const cStem = new THREE.Color(colorStem)
  const cMid = new THREE.Color(colorMid)
  const cTip = new THREE.Color(colorTip)
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, pos.getZ(i))
    if (t <= stemStop) {
      c.lerpColors(cStem, cMid, stemStop > 0 ? t / stemStop : 0)
    } else if (t <= midStop) {
      c.lerpColors(cMid, cTip, midStop > stemStop ? (t - stemStop) / (midStop - stemStop) : 0)
    } else {
      c.copy(cTip)
    }
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

export const BRANCH_GEO = buildBranchGeo()

// ---------------------------------------------------------------------------
// Seeded PRNG — deterministic per-tree variation
// ---------------------------------------------------------------------------
export function makeRng(seed) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ---------------------------------------------------------------------------
// Trunk — single cone centered at trunk mid-height
// ---------------------------------------------------------------------------
export function generateTrunkSegments(params) {
  const { trunkHeight = 8, trunkRadiusBase = 0.18 } = params

  return [
    {
      position: new THREE.Vector3(0, trunkHeight * 0.5, 0),
      rotation: new THREE.Euler(0, 0, 0),
      scale: new THREE.Vector3(trunkRadiusBase, trunkHeight, trunkRadiusBase),
    },
  ]
}

// ---------------------------------------------------------------------------
// Curved trunk geometry (world space)
//
// Geometry is built directly in world units — no normalization.
// leanX/leanZ are the world-space XZ offset of the trunk tip from the base.
// The Bezier control point is at 60% of the lean at mid-height so the curve
// accelerates toward the tip (natural tree lean shape).
// Instance transforms only need position + uniform scale=1 + rotY.
// ---------------------------------------------------------------------------
export function generateCurvedTrunkGeometry({
  trunkHeight = 8,
  radiusBase = 0.18,
  radiusTip = 0.06,
  leanX = 0,
  leanZ = 0,
  radialSegs = 8,
  heightSegs = 6,
}: {
  trunkHeight?: number
  radiusBase?: number
  radiusTip?: number
  leanX?: number
  leanZ?: number
  radialSegs?: number
  heightSegs?: number
} = {}): THREE.BufferGeometry {
  // Quadratic Bezier: base(0,0,0) → control(leanX*0.6, h*0.5, leanZ*0.6) → tip(leanX, h, leanZ)
  const P0 = new THREE.Vector3(0, 0, 0)
  const P1 = new THREE.Vector3(leanX * 0.6, trunkHeight * 0.5, leanZ * 0.6)
  const P2 = new THREE.Vector3(leanX, trunkHeight, leanZ)

  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  // Sample the Bezier spine and build rings
  const rings: THREE.Vector3[] = []
  const tangents: THREE.Vector3[] = []
  for (let s = 0; s <= heightSegs; s++) {
    const t = s / heightSegs
    // Bezier point
    const p = new THREE.Vector3()
    p.x = (1 - t) * (1 - t) * P0.x + 2 * (1 - t) * t * P1.x + t * t * P2.x
    p.y = (1 - t) * (1 - t) * P0.y + 2 * (1 - t) * t * P1.y + t * t * P2.y
    p.z = (1 - t) * (1 - t) * P0.z + 2 * (1 - t) * t * P1.z + t * t * P2.z
    rings.push(p)

    // Bezier tangent (derivative)
    const d = new THREE.Vector3()
    d.x = 2 * (1 - t) * (P1.x - P0.x) + 2 * t * (P2.x - P1.x)
    d.y = 2 * (1 - t) * (P1.y - P0.y) + 2 * t * (P2.y - P1.y)
    d.z = 2 * (1 - t) * (P1.z - P0.z) + 2 * t * (P2.z - P1.z)
    tangents.push(d.normalize())
  }

  // Build vertex rings perpendicular to tangent
  const up = new THREE.Vector3(0, 1, 0)
  const right = new THREE.Vector3()
  const forward = new THREE.Vector3()

  for (let s = 0; s <= heightSegs; s++) {
    const t = s / heightSegs
    const radius = THREE.MathUtils.lerp(radiusBase, radiusTip, t)
    const tan = tangents[s]
    const center = rings[s]

    // Stable frame: cross tangent with world-up to get radial axes
    right.crossVectors(tan, up).normalize()
    if (right.lengthSq() < 0.001) right.set(1, 0, 0) // degenerate guard
    forward.crossVectors(right, tan).normalize()

    for (let r = 0; r <= radialSegs; r++) {
      const theta = (r / radialSegs) * Math.PI * 2
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)

      const vx = center.x + (right.x * cos + forward.x * sin) * radius
      const vy = center.y + (right.y * cos + forward.y * sin) * radius
      const vz = center.z + (right.z * cos + forward.z * sin) * radius

      positions.push(vx, vy, vz)

      // Outward normal (approximate — good enough for bark)
      normals.push(
        right.x * cos + forward.x * sin,
        right.y * cos + forward.y * sin,
        right.z * cos + forward.z * sin,
      )

      uvs.push(r / radialSegs, t)
    }
  }

  // Stitch quads between adjacent rings
  const stride = radialSegs + 1
  for (let s = 0; s < heightSegs; s++) {
    for (let r = 0; r < radialSegs; r++) {
      const a = s * stride + r
      const b = a + 1
      const c = a + stride
      const d = c + 1
      indices.push(a, c, b)
      indices.push(b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  return geo
}

// ---------------------------------------------------------------------------
// Evaluate the trunk Bezier spine XZ offset at a given world Y height.
// Same formula as generateCurvedTrunkGeometry so foliage stays on the trunk.
// ---------------------------------------------------------------------------
export function bezierSpineXZ(
  y: number,
  trunkHeight: number,
  leanX: number,
  leanZ: number,
): { x: number; z: number } {
  // t = fraction of height (clamp for safety)
  const t = Math.max(0, Math.min(1, y / trunkHeight))
  // Quadratic Bezier X: P0=0, P1=leanX*0.6, P2=leanX
  const bx = 2 * (1 - t) * t * (leanX * 0.6) + t * t * leanX
  const bz = 2 * (1 - t) * t * (leanZ * 0.6) + t * t * leanZ
  return { x: bx, z: bz }
}

// ---------------------------------------------------------------------------
// Trunk variation pool
//
// Returns { geo, leanX, leanZ }[] so callers can align foliage to each variant.
// ---------------------------------------------------------------------------
export interface TrunkVariant {
  geo: THREE.BufferGeometry
  leanX: number
  leanZ: number
}

export function buildTrunkVariationPool({
  count = 12,
  maxLean = 1.0,
  trunkHeight = 8,
  radiusBase = 0.18,
  radiusTip = 0.01,
}: {
  count?: number
  maxLean?: number
  trunkHeight?: number
  radiusBase?: number
  radiusTip?: number
} = {}): TrunkVariant[] {
  // World-space geometry — instances use uniform scale only (no shear).
  // leanX/Z are world units. tipRatio near 0 = pointed tip.
  const rng = makeRng(7331)
  return Array.from({ length: count }, () => {
    const angle = rng() * Math.PI * 2
    const magnitude = rng() * maxLean
    const leanX = Math.cos(angle) * magnitude
    const leanZ = Math.sin(angle) * magnitude
    return {
      geo: generateCurvedTrunkGeometry({ trunkHeight, radiusBase, radiusTip, leanX, leanZ }),
      leanX,
      leanZ,
    }
  })
}

// ---------------------------------------------------------------------------
// Full tree geometry
//
// Returns:
//   branchTransforms     — shared across LOD0 + LOD1
//   sprigTransformsLOD0  — full sprig count  (close range)
//   sprigTransformsLOD1  — ~35% sprig count  (mid range)
// ---------------------------------------------------------------------------
export function generateTree(params) {
  const {
    seed = 42,
    trunkHeight = 8,
    rungCount = 10,
    rungSpacing = 0.85,
    branchesPerRung = 5,
    branchLength = 2.2,
    branchLengthVariance = 0.25,
    branchDroop = 0.35,
    droopTopBias = 5,
    branchAngleSpread = 0.2,
    sprigsPerBranch = 8,
    foliageScaleBase = 1.4,
    foliageScaleTop = 0.5,
    rungStart = 0.15,
    trunkLeanX = 0,
    trunkLeanZ = 0,
  } = params

  const rng = makeRng(seed)
  const branchTransforms = []

  for (let rung = 0; rung < rungCount; rung++) {
    const tRung = rung / Math.max(1, rungCount - 1)
    // rungStart offsets the first rung up the trunk (0=base, 1=tip)
    const tRungOffset = rungStart + tRung * (1 - rungStart)
    const yOffset = trunkHeight * (1 - Math.pow(1 - tRungOffset, 1.0 / rungSpacing))
    const rungY = yOffset
    // lengthScale: branch length shrinks toward top (0.35 of base at tip)
    const lengthScale = THREE.MathUtils.lerp(1.0, 0.35, tRung)
    // foliageScale: user-controlled size tween from base to top
    const foliageScale = THREE.MathUtils.lerp(foliageScaleBase, foliageScaleTop, tRung)

    for (let b = 0; b < branchesPerRung; b++) {
      const baseAngle = (b / branchesPerRung) * Math.PI * 2
      const angle = baseAngle + (rng() - 0.5) * branchAngleSpread * 2 + rung * 0.37
      // branchDroop: 0 = horizontal, 1 = steep droop downward
      // droopTopBias: exponent on tRung curve — higher = top rungs droop far more than bottom
      const droopCurve = 0.6 + 0.4 * Math.pow(tRung, droopTopBias)
      const droopAngle = branchDroop * Math.PI * 0.5 * droopCurve
      const len = branchLength * lengthScale * (1 - branchLengthVariance * rng())

      // Stem origin — on the trunk Bezier spine at this rung's Y, offset outward
      const spine = bezierSpineXZ(rungY, trunkHeight, trunkLeanX, trunkLeanZ)
      const stemOffset = 0.05 + len * 0.04
      const ox = spine.x + Math.cos(angle) * stemOffset
      const oz = spine.z + Math.sin(angle) * stemOffset

      // Organic random variation
      const tiltVariance = (rng() - 0.5) * 0.25 // small pitch variance ±0.125 rad
      const rollVariance = (rng() - 0.5) * 0.5 // slight roll lean ±0.25 rad
      const widthVariance = 0.75 + rng() * 0.5 // width 75%–125% of len

      // Width ≈ branchLength so planes are roughly square; shrinks toward top
      const width = len * widthVariance

      // Geometry is horizontal (XZ plane), extending along +Z from Z=0 to Z=1.
      // YXZ order: first yaw to face outward, then pitch tip downward for droop.
      // droopAngle > 0 tilts the tip down (positive X rotation on a horizontal plane).
      branchTransforms.push({
        position: new THREE.Vector3(ox, rungY, oz),
        rotation: new THREE.Euler(droopAngle + tiltVariance, -angle, rollVariance, 'YXZ'),
        scale: new THREE.Vector3(width * foliageScale, 1, len * foliageScale),
        tRung, // 0 = bottom, 1 = top — used for color gradient
        castShadow: true,
        receiveShadow: true,
      })
    }
  }

  // Top rung Y = the Y of the last rung — used to cap trunk geometry height
  const tRungLast = 1.0
  const tRungOffsetLast = rungStart + tRungLast * (1 - rungStart)
  const topRungY = trunkHeight * (1 - Math.pow(1 - tRungOffsetLast, 1.0 / rungSpacing))

  return { branchTransforms, topRungY }
}

// ---------------------------------------------------------------------------
// Forest — merges all trees into flat instance arrays (one draw call each)
//
// placements: array of { x, z, rotY, scale, seed, treeParams? }
// sharedParams: default tree params applied to all trees (overridden by treeParams)
//
// Returns flat arrays ready to feed directly into InstancedLayer:
//   branchTransforms, trunkTransformsByVariation, branchColors, branchUvQuadrants
//
// trunkTransformsByVariation is an array of arrays — index = variation slot.
// Callers render one InstancedLayer per slot (only populated slots need draws).
// ---------------------------------------------------------------------------
export function generateForest(placements: any[], sharedParams: any = {}) {
  const allBranchTransforms: any[] = []
  const allBranchColors: THREE.Color[] = []
  const allBranchUvQuadrants: number[] = []

  const trunkVariationCount: number = sharedParams.trunkVariationCount ?? 12

  // Keyed by "variationIndex:trunkHeight" so tall and normal trees never collide in one slot.
  // Each slot builds its geometry from the first tree assigned (all trees in a slot share
  // the same variationIndex AND the same trunkHeight, so geometry matches exactly).
  const trunkSlotMap = new Map<string, { geo: THREE.BufferGeometry | null; transforms: any[] }>()

  // Pre-compute lean directions (world units) — same seed as old pool for consistency.
  const trunkMaxLean: number = sharedParams.trunkMaxLean ?? 1.0
  const leanLookup: { leanX: number; leanZ: number }[] = (() => {
    const rng = makeRng(7331)
    return Array.from({ length: trunkVariationCount }, () => {
      const angle = rng() * Math.PI * 2
      const magnitude = rng() * trunkMaxLean
      return { leanX: Math.cos(angle) * magnitude, leanZ: Math.sin(angle) * magnitude }
    })
  })()

  const treeQuat = new THREE.Quaternion()
  const dummy = new THREE.Object3D()

  for (const placement of placements) {
    const { x = 0, y = 0, z = 0, rotY = 0, scale = 1, seed = 1, treeParams = {} } = placement
    const variationIndex = seed % trunkVariationCount
    const { leanX, leanZ } = leanLookup[variationIndex]
    const params = { ...sharedParams, ...treeParams, seed, trunkLeanX: leanX, trunkLeanZ: leanZ }

    const { branchTransforms, topRungY } = generateTree(params)

    const tH = params.trunkHeight ?? 8
    const slotKey = `${variationIndex}:${tH}`
    if (!trunkSlotMap.has(slotKey)) {
      trunkSlotMap.set(slotKey, {
        geo: generateCurvedTrunkGeometry({
          trunkHeight: topRungY,
          radiusBase: params.trunkRadiusBase ?? 0.18,
          radiusTip: 0.01,
          leanX,
          leanZ,
        }),
        transforms: [],
      })
    }
    // Uniform scale — world-space geometry, no shear.
    trunkSlotMap.get(slotKey)!.transforms.push({
      position: new THREE.Vector3(x, y, z),
      rotation: new THREE.Euler(0, rotY, 0),
      scale: new THREE.Vector3(scale, scale, scale),
    })

    // World transform for this tree
    treeQuat.setFromEuler(new THREE.Euler(0, rotY, 0))

    // Use a well-dispersed seed by hashing — avoids correlated first values
    const colorSeed = ((seed * 2654435761) ^ (seed >> 16)) >>> 0
    const rngColor = makeRng((colorSeed % 2147483646) + 1)
    rngColor()
    rngColor() // burn a couple values to escape correlation
    // Per-tree brightness variation
    const brightness = 0.85 + rngColor() * 0.3
    // tintT: 0 = warm (yellow/orange), 0.5 = neutral (green), 1 = cool (aqua/blue)
    // tintBias shifts the centre (0.5=neutral, <0.5=biased warm, >0.5=biased cool)
    const tintBias: number = sharedParams.tintBias ?? 0.5
    const tintRange: number = sharedParams.tintRange ?? 0.5
    const tintSaturation: number = sharedParams.tintSaturation ?? 0.55
    const tintT = THREE.MathUtils.clamp(tintBias + (rngColor() - 0.5) * tintRange * 2, 0, 1)
    // Per-tree tint multiplier (RGB, each channel 0–2 range).
    // tintT=0.5 → white (1,1,1), neutral green. Warm end dims blue + boosts red;
    // cool end dims red + boosts blue, shifting green vertex colors → aqua/blue.
    const tintMulR =
      tintT < 0.5
        ? THREE.MathUtils.lerp(1, 1 + tintSaturation, (0.5 - tintT) * 2) // warm: boost red → yellow/orange
        : THREE.MathUtils.lerp(1, 1 - tintSaturation, (tintT - 0.5) * 2) // cool: dim red → aqua/blue
    const tintMulG = 1.0
    const tintMulB =
      tintT < 0.5
        ? THREE.MathUtils.lerp(1, 1 - tintSaturation, (0.5 - tintT) * 2) // warm: dim blue
        : THREE.MathUtils.lerp(1, 1 + tintSaturation, (tintT - 0.5) * 2) // cool: boost blue
    const rngUv = makeRng(seed + 1)

    // Bake each branch transform into world space
    for (const t of branchTransforms as any[]) {
      dummy.position.copy(t.position)
      dummy.rotation.copy(t.rotation)
      dummy.scale.copy(t.scale)
      dummy.updateMatrix()

      // Apply tree world transform (position, rotY, uniform scale)
      dummy.position.applyQuaternion(treeQuat)
      dummy.position.multiplyScalar(scale)
      dummy.position.x += x
      dummy.position.y += y
      dummy.position.z += z
      dummy.scale.multiplyScalar(scale)
      dummy.quaternion.premultiply(treeQuat)
      dummy.updateMatrix()

      allBranchTransforms.push({
        position: dummy.position.clone(),
        rotation: new THREE.Euler().setFromQuaternion(dummy.quaternion, 'YXZ'),
        scale: dummy.scale.clone(),
      })

      // Per-instance color: rung darkening × per-tree brightness × per-tree hue tint.
      // The tint multiplier shifts green vertex colors toward warm (yellow/orange) or
      // cool (aqua/blue) by scaling individual RGB channels around white (1,1,1).
      const rungDim = THREE.MathUtils.lerp(0.6, 1.0, Math.pow(t.tRung, 0.5))
      const b = rungDim * brightness
      const inst = new THREE.Color(b * tintMulR, b * tintMulG, b * tintMulB)
      allBranchColors.push(inst)

      // UV quadrant
      allBranchUvQuadrants.push(Math.floor(rngUv() * 4))
    }
  }

  return {
    branchTransforms: allBranchTransforms,
    trunkSlots: Array.from(trunkSlotMap.values()),
    branchColors: allBranchColors,
    branchUvQuadrants: allBranchUvQuadrants,
  }
}

// ---------------------------------------------------------------------------
// Write transforms into an already-created InstancedMesh
// ---------------------------------------------------------------------------
export function applyTransforms(mesh, transforms) {
  const dummy = new THREE.Object3D()
  transforms.forEach((t, i) => {
    dummy.position.copy(t.position)
    dummy.rotation.copy(t.rotation)
    dummy.scale.copy(t.scale)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
}

// ---------------------------------------------------------------------------
// Write transforms with correct non-uniform scale (no shear).
//
// Object3D.updateMatrix() computes T*R*S but Three.js decomposes this
// incorrectly when scale is non-uniform and rotation is non-zero, producing
// visible shear.  This version builds the matrix explicitly:
//   M = Translation * RotationY * Scale(sx, sy, sz)
// which is mathematically correct for axis-aligned non-uniform scale.
//
// Only the Y component of rotation is used (trees only yaw).
// ---------------------------------------------------------------------------
const _mat4 = new THREE.Matrix4()
export function applyTransformsDirect(
  mesh: THREE.InstancedMesh,
  transforms: { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }[],
) {
  transforms.forEach((t, i) => {
    const { x, y, z } = t.position
    const { x: sx, y: sy, z: sz } = t.scale
    const cosY = Math.cos(t.rotation.y)
    const sinY = Math.sin(t.rotation.y)

    // Column-major, row notation: [col0row0, col0row1, ...]
    // M = T * Ry * S
    // Ry * S:
    //   col0 = (cosY*sx,  0,    sinY*sx,  0)
    //   col1 = (0,        sy,   0,        0)
    //   col2 = (-sinY*sz, 0,    cosY*sz,  0)
    //   col3 = (x,        y,    z,        1)
    _mat4.set(cosY * sx, 0, -sinY * sz, x, 0, sy, 0, y, sinY * sx, 0, cosY * sz, z, 0, 0, 0, 1)
    mesh.setMatrixAt(i, _mat4)
  })
  mesh.instanceMatrix.needsUpdate = true
}
