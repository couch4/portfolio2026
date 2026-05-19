import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { generateForest, buildBranchGeo } from './treeGeometry'
import { UV_OFFSETS } from './Tree'

const trunkTextures = [
  '/textures/trunk/pineBarkDiffuse.jpg',
  '/textures/trunk/pineBarkNormal.jpg',
  '/textures/trunk/pineBarkAO.jpg',
  '/textures/trunk/pineBarkRoughness.jpg',
]

interface TreePlacement {
  x?: number
  y?: number
  z?: number
  rotY?: number
  scale?: number
  seed?: number
  treeParams?: Record<string, any>
}

interface UseForestDataOptions {
  placements: TreePlacement[]
  sharedParams?: Record<string, any>
  leafStyle?: number
  foliageColorStem?: string
  foliageColorMid?: string
  foliageColorTip?: string
  stemStop?: number
  midStop?: number
  barkColor?: string
}

/**
 * Computes all cross-tree instancing data for a Forest.
 * Returns:
 *   branchTransforms  — flat array of all branch transforms (world space)
 *   trunkSlots        — array of { geo, transforms } — one draw call per trunk variation
 *   branchColors      — per-branch instance colors
 *   branchUvOffsets   — per-branch UV offsets for the 2×2 atlas
 *   branchMat         — shared branch MeshStandardMaterial
 *   trunkMat          — shared trunk MeshStandardMaterial
 */
export function useForestData({
  placements,
  sharedParams = {},
  leafStyle = 1,
  foliageColorStem = '#1a4a0a',
  foliageColorMid = '#3a8c1a',
  foliageColorTip = '#9acc3a',
  stemStop = 0.25,
  midStop = 0.6,
  barkColor = '#67483a',
}: UseForestDataOptions) {
  // ── Textures ─────────────────────────────────────────────────────────────
  const [map, normalMap, aoMap, roughnessMap] = useTexture(trunkTextures)

  const alphaTextureUrl = `/textures/branchAlphas/leavesPine4_mask_${String(leafStyle).padStart(2, '0')}.png`
  const alphaTexture = useLoader(THREE.TextureLoader, alphaTextureUrl)

  useMemo(() => {
    if (alphaTexture) {
      alphaTexture.flipY = false
      alphaTexture.wrapS = THREE.ClampToEdgeWrapping
      alphaTexture.wrapT = THREE.ClampToEdgeWrapping
      alphaTexture.minFilter = THREE.LinearMipmapLinearFilter
      alphaTexture.magFilter = THREE.LinearFilter
      alphaTexture.needsUpdate = true
    }
  }, [alphaTexture])

  // ── Materials ─────────────────────────────────────────────────────────────
  const trunkMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: barkColor,
        roughnessMap,
        normalMap,
        normalScale: new THREE.Vector2(1, 1),
        aoMap,
        aoMapIntensity: 2,
        map,
      }),
    [barkColor, map, normalMap, aoMap, roughnessMap],
  )

  const branchGeo = useMemo(
    () =>
      buildBranchGeo({
        colorStem: foliageColorStem,
        colorMid: foliageColorMid,
        colorTip: foliageColorTip,
        stemStop,
        midStop,
      }),
    [foliageColorStem, foliageColorMid, foliageColorTip, stemStop, midStop],
  )

  const branchMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.85,
        side: THREE.DoubleSide,
        alphaTest: 0.1,
        alphaMap: alphaTexture ?? undefined,
        transparent: false,
        vertexColors: true,
      }),
    [alphaTexture],
  )

  // ── Geometry & transforms (pure CPU — no Three.js scene objects) ──────────
  const forestData = useMemo(
    () => generateForest(placements, sharedParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placements, JSON.stringify(sharedParams)],
  )

  // Convert quadrant indices (0-3) to [u,v] pairs for InstancedLayer
  const branchUvOffsets = useMemo(
    () => forestData.branchUvQuadrants.map((q: number) => UV_OFFSETS[q]),
    [forestData.branchUvQuadrants],
  )

  return {
    branchTransforms: forestData.branchTransforms,
    trunkSlots: forestData.trunkSlots,
    branchColors: forestData.branchColors,
    branchUvOffsets,
    branchGeo,
    branchMat,
    trunkMat,
  }
}
