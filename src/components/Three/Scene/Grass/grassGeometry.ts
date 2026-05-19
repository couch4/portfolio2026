import * as THREE from 'three'
import { makeRng } from '@/components/Three/Tree/treeGeometry'

// ---------------------------------------------------------------------------
// Grass shard geometry
//
// A single blade: flat plane that tapers from a base width to a pointed tip,
// bent along the Y axis using a quadratic Bézier so it curves gracefully.
//
// Local coordinate system:
//   X = width axis (symmetric around 0)
//   Y = height axis (0 = root, 1*height = tip)
//   Z = bend direction (lean)
//
// The bend is baked into vertex positions — the base control point sits at
// (0, height*0.5, lean) and the tip at (0, height, lean*2), giving a natural
// forward lean with curvature accelerating toward the tip.
// ---------------------------------------------------------------------------
export interface GrassShardParams {
  height?: number // blade world-height (before instancing)
  baseWidth?: number // width at the root
  tipWidth?: number // width at the tip (0 = sharp point)
  lean?: number // forward lean (Z offset at tip in local space)
  segments?: number // vertical segments along the blade
}

export function buildGrassShardGeometry({
  height = 1,
  baseWidth = 0.12,
  tipWidth = 0.0,
  lean = 0.3,
  segments = 5,
}: GrassShardParams = {}): THREE.BufferGeometry {
  // Bézier control points for the spine
  const P0 = new THREE.Vector3(0, 0, 0)
  const P1 = new THREE.Vector3(0, height * 0.55, lean * 0.6)
  const P2 = new THREE.Vector3(0, height, lean)

  const verts: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const colors: number[] = []

  // We build (segments+1) cross-section rows.
  // Each row has 2 vertices (left, right).
  for (let s = 0; s <= segments; s++) {
    const t = s / segments

    // Quadratic Bézier spine position
    const spine = new THREE.Vector3(
      (1 - t) * (1 - t) * P0.x + 2 * (1 - t) * t * P1.x + t * t * P2.x,
      (1 - t) * (1 - t) * P0.y + 2 * (1 - t) * t * P1.y + t * t * P2.y,
      (1 - t) * (1 - t) * P0.z + 2 * (1 - t) * t * P1.z + t * t * P2.z,
    )

    // Bezier tangent
    const tangent = new THREE.Vector3(
      2 * (1 - t) * (P1.x - P0.x) + 2 * t * (P2.x - P1.x),
      2 * (1 - t) * (P1.y - P0.y) + 2 * t * (P2.y - P1.y),
      2 * (1 - t) * (P1.z - P0.z) + 2 * t * (P2.z - P1.z),
    ).normalize()

    // Width tapers linearly (squared for sharper tip feel)
    const taper = Math.pow(1 - t, 0.7)
    const halfW = THREE.MathUtils.lerp(tipWidth * 0.5, baseWidth * 0.5, taper)

    // Local X axis (perpendicular to tangent in the XZ plane)
    const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()
    if (right.lengthSq() < 0.001) right.set(1, 0, 0)

    // Normal: cross(right, tangent)
    const normal = new THREE.Vector3().crossVectors(right, tangent).normalize()

    // Vertex color: dark root → bright tip (similar pattern to branch geo)
    const brightness = Math.pow(t, 1.5)
    const dark = new THREE.Color('#0d1f07')
    const bright = new THREE.Color('#ffffff')
    const col = new THREE.Color().lerpColors(dark, bright, brightness)

    const left = new THREE.Vector3().copy(spine).addScaledVector(right, -halfW)
    const rightV = new THREE.Vector3().copy(spine).addScaledVector(right, halfW)

    for (const v of [left, rightV]) {
      verts.push(v.x, v.y, v.z)
      normals.push(normal.x, normal.y, normal.z)
      uvs.push(v === left ? 0 : 1, t)
      colors.push(col.r, col.g, col.b)
    }
  }

  // Stitch quads between adjacent rows
  // Row i: vertices [i*2, i*2+1]
  for (let s = 0; s < segments; s++) {
    const tl = s * 2
    const tr = s * 2 + 1
    const bl = (s + 1) * 2
    const br = (s + 1) * 2 + 1
    // CCW winding, two triangles per quad
    indices.push(tl, bl, tr)
    indices.push(tr, bl, br)
    // Back-face (DoubleSide equivalent in geometry for shadow)
    indices.push(tl, tr, bl)
    indices.push(tr, br, bl)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

// ---------------------------------------------------------------------------
// Grass clump scatter
//
// Given a set of world-space origin positions (e.g. trunk bases), scatter
// N blades per clump in a disk around each origin.
//
// Returns a flat array of transforms ready for InstancedLayer.
// ---------------------------------------------------------------------------
export interface GrassClumpParams {
  bladesPerClump?: number // instances per origin
  clumpRadius?: number // scatter disk radius (metres)
  heightMin?: number // blade height min
  heightMax?: number // blade height max
  leanMin?: number // lean min
  leanMax?: number // lean max
  seed?: number
}

export interface GrassTransform {
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
  tBlade: number // 0-1 normalized blade index (for color tints)
}

export function generateGrassClumps(
  origins: THREE.Vector3[],
  params: GrassClumpParams = {},
): GrassTransform[] {
  const {
    bladesPerClump = 12,
    clumpRadius = 0.9,
    heightMin = 0.35,
    heightMax = 0.75,
    leanMin = 0.15,
    leanMax = 0.45,
    seed = 31337,
  } = params

  const rng = makeRng(seed)
  const transforms: GrassTransform[] = []

  for (const origin of origins) {
    for (let i = 0; i < bladesPerClump; i++) {
      // Polar scatter inside disk (uniform area distribution)
      const angle = rng() * Math.PI * 2
      const r = Math.sqrt(rng()) * clumpRadius
      const x = origin.x + Math.cos(angle) * r
      const z = origin.z + Math.sin(angle) * r

      const height = THREE.MathUtils.lerp(heightMin, heightMax, rng())
      const lean = THREE.MathUtils.lerp(leanMin, leanMax, rng())

      // Yaw randomly so blades fan in all directions
      const rotY = rng() * Math.PI * 2
      // Slight tilt on X so the blade leans with its local lean baked in
      const tiltX = (rng() - 0.5) * 0.2

      transforms.push({
        position: new THREE.Vector3(x, origin.y, z),
        rotation: new THREE.Euler(tiltX, rotY, 0, 'YXZ'),
        // Scale Y drives height; X/Z drive width & lean proportionally
        scale: new THREE.Vector3(height, height, lean),
        tBlade: i / bladesPerClump,
      })
    }
  }

  return transforms
}

// ---------------------------------------------------------------------------
// Convenience: scatter grass around a flat grid / random positions
// (no tree dependency — standalone use)
// ---------------------------------------------------------------------------
export function generateGrassField(
  count: number,
  spread: number,
  params: GrassClumpParams = {},
  fieldSeed = 9999,
): GrassTransform[] {
  const rng = makeRng(fieldSeed)
  const origins: THREE.Vector3[] = Array.from({ length: count }, () => {
    const angle = rng() * Math.PI * 2
    const radius = Math.sqrt(rng()) * spread * 0.5
    return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
  })
  return generateGrassClumps(origins, params)
}
