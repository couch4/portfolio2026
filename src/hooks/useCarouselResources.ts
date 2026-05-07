import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BackdropMaterial } from '@/components/Three/Shaders/BackdropMaterial'
import { createBackdropNodeMaterial } from '@/components/Three/Shaders/BackdropMaterialWebGPU'
import { blurImageToDataURL } from '@/utilities/blurImage'
import { geometry } from 'maath'
import * as THREE from 'three'
import { PMREMGenerator as PMREMGeneratorWebGPU } from 'three/webgpu'
import type { BufferGeometry, Group, Material, Mesh, Plane, Texture } from 'three'

// WebGPU fix: material.clone() can lose texture bindings when the renderer
// converts standard materials to NodeMaterials via fromMaterial(). Re-assign
// every map property after cloning so the node builder picks up the textures.
const MAP_KEYS = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'emissiveMap',
  'bumpMap',
  'displacementMap',
  'alphaMap',
  'envMap',
  'lightMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
  'sheenColorMap',
  'sheenRoughnessMap',
  'transmissionMap',
  'thicknessMap',
  'specularIntensityMap',
  'specularColorMap',
  'iridescenceMap',
  'iridescenceThicknessMap',
  'anisotropyMap',
] as const

function cloneMaterialWebGPUSafe(source: Material): Material {
  const clone = source.clone()
  for (const key of MAP_KEYS) {
    if (key in source) (clone as any)[key] = (source as any)[key]
  }
  return clone
}

interface BackdropResources {
  material: Material | null
  blurredDataUrl: string | null
}

interface ProjectTemplate {
  clipped: Group
  portal: Group
  clippedMaterials: Material[]
  clippingPlanes: Plane[]
  bottomPlane: Plane | null
  clipBottomOffset: number
}

// Module-scope caches survive across hook instances.
const projectTemplateCache = new Map<string, ProjectTemplate>()
const pmremCache = new Map<string, THREE.RenderTarget>()

/**
 * Build (or fetch) the per-project scene template — one clipped clone with
 * cloned materials carrying clippingPlanes, plus a portal clone that shares
 * the original GLTF materials. Called from ProjectHero on first render.
 */
export function getOrBuildProjectTemplate(
  sourceScene: Group,
  gltfUrl: string,
  clipBottom: boolean,
  clipBottomOffset: number,
  bottomY: number,
): ProjectTemplate {
  const cached = projectTemplateCache.get(gltfUrl)
  if (cached) {
    if (cached.bottomPlane) {
      cached.bottomPlane.constant = bottomY + clipBottomOffset
    }
    return cached
  }

  const frontPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const bottomPlane = clipBottom
    ? new THREE.Plane(new THREE.Vector3(0, 1, 0), bottomY + clipBottomOffset)
    : null
  const clippingPlanes = bottomPlane ? [frontPlane, bottomPlane] : [frontPlane]

  const clipped = sourceScene.clone(true) as Group
  const clippedMaterials: Material[] = []
  clipped.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    const mat = mesh.material as Material | Material[]
    if (Array.isArray(mat)) {
      mesh.material = mat.map((m) => {
        const c = cloneMaterialWebGPUSafe(m)
        c.clippingPlanes = clippingPlanes
        c.clipShadows = true
        c.needsUpdate = true
        clippedMaterials.push(c)
        return c
      })
    } else if (mat) {
      const c = cloneMaterialWebGPUSafe(mat)
      c.clippingPlanes = clippingPlanes
      c.clipShadows = true
      c.needsUpdate = true
      clippedMaterials.push(c)
      mesh.material = c
    }
  })

  const portal = sourceScene.clone(true) as Group

  const entry: ProjectTemplate = {
    clipped,
    portal,
    clippedMaterials,
    clippingPlanes,
    bottomPlane,
    clipBottomOffset,
  }
  projectTemplateCache.set(gltfUrl, entry)
  return entry
}

/**
 * Lazily build (or fetch) a PMREM render target for the given envMap on the
 * WebGPU path. Shared across every PortalScene instance — without this, every
 * portal generates its own PMREM each mount.
 */
export function getOrBuildPMREM(envMap: Texture, gl: any): THREE.RenderTarget {
  const key = (envMap as any).uuid
  const existing = pmremCache.get(key)
  if (existing) return existing
  const pmremGen = new PMREMGeneratorWebGPU(gl)
  const rt = (envMap as any).isCubeTexture
    ? pmremGen.fromCubemap(envMap as any)
    : pmremGen.fromEquirectangular(envMap)
  pmremGen.dispose()
  pmremCache.set(key, rt)
  return rt
}

export function useCarouselResources(items: any[], cardWidth: number, cardHeight: number) {
  const gl = useThree((s) => s.gl)
  const gpu = (gl as any)?.isWebGPURenderer === true

  // Shared card geometry
  const sharedGeoRef = useRef<BufferGeometry | null>(null)
  if (!sharedGeoRef.current) {
    sharedGeoRef.current = new geometry.RoundedPlaneGeometry(
      cardWidth,
      cardHeight,
      0.2,
    ) as unknown as BufferGeometry
  }

  // Update geometry in-place on resize
  useEffect(() => {
    const geo = sharedGeoRef.current
    if (!geo) return
    const tmp = new geometry.RoundedPlaneGeometry(
      cardWidth,
      cardHeight,
      0.2,
    ) as unknown as BufferGeometry
    const pos = geo.getAttribute('position')
    pos.array.set(tmp.getAttribute('position').array)
    pos.needsUpdate = true
    const uv = geo.getAttribute('uv')
    uv.array.set(tmp.getAttribute('uv').array)
    uv.needsUpdate = true
    ;(tmp as any).dispose()
  }, [cardWidth, cardHeight])

  // On cardHeight change, walk every cached project template and update its
  // bottomPlane.constant so all clipped materials follow the new card height.
  useEffect(() => {
    const bottomY = cardHeight / 2
    projectTemplateCache.forEach((entry) => {
      if (entry.bottomPlane) {
        entry.bottomPlane.constant = bottomY + entry.clipBottomOffset
      }
    })
  }, [cardHeight])

  // Shared placeholder material
  const placeholderMatRef = useRef<Material | null>(null)
  if (!placeholderMatRef.current) {
    placeholderMatRef.current = new THREE.MeshBasicMaterial({
      color: '#05080F',
    })
  }

  // Backdrop material cache
  const backdropCacheRef = useRef<Map<string, BackdropResources>>(new Map())

  useEffect(() => {
    if (!Array.isArray(items)) return
    const uniqueUrls = new Set<string>()
    items.forEach((item) => {
      if (item.background) uniqueUrls.add(item.background)
    })

    uniqueUrls.forEach((textureUrl) => {
      if (!textureUrl) return
      if (!backdropCacheRef.current.has(textureUrl)) {
        const material = gpu ? createBackdropNodeMaterial() : new BackdropMaterial()
        backdropCacheRef.current.set(textureUrl, {
          material,
          blurredDataUrl: null,
        })

        blurImageToDataURL(textureUrl, 5)
          .then((blurredDataUrl) => {
            const entry = backdropCacheRef.current.get(textureUrl)
            if (entry && blurredDataUrl) {
              entry.blurredDataUrl = blurredDataUrl
              const texture = new THREE.TextureLoader().load(blurredDataUrl)
              texture.flipY = false
              ;(material as any).uTexture = texture
            }
          })
          .catch((err) => {
            console.error('Failed to blur backdrop image:', textureUrl, err)
          })
      }
    })

    return () => {
      backdropCacheRef.current.clear()
    }
  }, [items, gpu])

  const getBackdropResources = (textureUrl: string): BackdropResources => {
    return (
      backdropCacheRef.current.get(textureUrl) || {
        material: null,
        blurredDataUrl: null,
      }
    )
  }

  return {
    sharedGeo: sharedGeoRef.current,
    placeholderMat: placeholderMatRef.current,
    getBackdropResources,
  }
}
