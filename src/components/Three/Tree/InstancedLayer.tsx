import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { applyTransforms, applyTransformsDirect } from './treeGeometry'

// ---------------------------------------------------------------------------
// Wind shader injection
// Displaces foliage vertices using a sine wave:
//   - uTime drives the animation clock
//   - Instance world XZ position (column 3 of instanceMatrix) seeds the phase
//     so adjacent trees don't sway in lock-step
//   - Local geometry Z (0=stem, 1=tip) gates amplitude — stems stay anchored
//   - uWindDir is a 2D unit vector (XZ) for wind direction
// ---------------------------------------------------------------------------
const windShader = {
  onBeforeCompile: (shader: { vertexShader: string; uniforms: Record<string, any> }) => {
    shader.uniforms.uTime = { value: 0 }
    shader.uniforms.uWindStrength = { value: 0.08 }
    shader.uniforms.uWindSpeed = { value: 1.0 }
    shader.uniforms.uWindDir = { value: new THREE.Vector2(1.0, 0.0) }

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
uniform float uTime;
uniform float uWindStrength;
uniform float uWindSpeed;
uniform vec2  uWindDir;`,
    )

    // Inject after instanceMatrix is applied (end of begin_vertex chunk)
    // transformed is the local vertex position already in model space.
    // instanceMatrix col3 (elements 12,13,14) is the world translation.
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
{
  // World-space XZ from instance translation column
  float wx = instanceMatrix[3][0];
  float wz = instanceMatrix[3][2];
  // Phase: spatially unique per instance
  float phase = wx * 0.13 + wz * 0.17;
  // Amplitude gated by local Z (stem=0, tip=1)
  float tipFactor = clamp(transformed.z, 0.0, 1.0);
  float wave = sin(uTime * uWindSpeed + phase) * 0.6
             + sin(uTime * uWindSpeed * 1.7 + phase * 1.3) * 0.4;
  float disp = wave * uWindStrength * tipFactor * tipFactor;
  transformed.x += uWindDir.x * disp;
  transformed.z += uWindDir.y * disp;
}`,
    )
  },
}

const _pos = new THREE.Vector3()
const _scale = new THREE.Vector3()
const _dummy = new THREE.Object3D()

// Shader injection for per-instance UV offset (2x2 atlas).
// UVs scaled to 0.5 (one quadrant) then shifted by the per-instance offset.
// Patches vMapUv which is what alphaMap uses in Three.js r152+.
const uvOffsetShader = {
  onBeforeCompile: (shader: { vertexShader: string; fragmentShader: string }) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nattribute vec2 instanceUvOffset;',
    )
    // After uv_vertex sets all the vXxxUv varyings, remap them to the quadrant.
    // alphaMap and map both use vMapUv when they share the same UV channel.
    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      `#include <uv_vertex>
#ifdef USE_MAP
  vMapUv = vMapUv * 0.5 + instanceUvOffset;
#endif
#ifdef USE_ALPHAMAP
  vAlphaMapUv = vAlphaMapUv * 0.5 + instanceUvOffset;
#endif`,
    )
  },
}

interface InstancedLayerProps {
  transforms: { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }[]
  geometry: THREE.BufferGeometry
  material: THREE.Material
  opacity?: number
  castShadow?: boolean
  receiveShadow?: boolean
  billboard?: boolean
  uvOffsets?: number[][] | null
  instanceColors?: THREE.Color[] | null
  directMatrix?: boolean
  windEnabled?: boolean
  windStrength?: number
  windSpeed?: number
  windDirection?: [number, number]
}

/**
 * One instanced draw call.
 * geometry + material are passed in so callers can share/cache them.
 * opacity drives a crossfade (used by the LOD transition).
 * When billboard=true, instances rotate to face camera each frame.
 * uvOffsets is array of [u, v] for 2x2 atlas quadrant selection.
 */
export function InstancedLayer({
  transforms,
  geometry,
  material,
  opacity = 1,
  castShadow = true,
  receiveShadow = false,
  billboard = false,
  uvOffsets = null,
  instanceColors = null,
  directMatrix = false,
  windEnabled = false,
  windStrength = 0.08,
  windSpeed = 1.0,
  windDirection = [1, 0],
}: InstancedLayerProps) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const { camera } = useThree()
  // Stash the compiled shader object so we can update uniforms each frame
  const windShaderRef = useRef<{ uniforms: Record<string, any> } | null>(null)

  // Create UV offset attribute for atlas quadrants (clone geometry to avoid shared attr pollution)
  const localGeometry = useMemo(() => {
    if (!uvOffsets || !transforms.length) return geometry
    const geom = geometry.clone()
    const arr = new Float32Array(transforms.length * 2)
    for (let i = 0; i < transforms.length; i++) {
      const offset = uvOffsets[i] || [0, 0]
      arr[i * 2] = offset[0]
      arr[i * 2 + 1] = offset[1]
    }
    geom.setAttribute('instanceUvOffset', new THREE.InstancedBufferAttribute(arr, 2))
    return geom
  }, [geometry, uvOffsets, transforms.length])

  // Patch shader before first compile — must run during render, not in effect.
  // windShaderRef captures the compiled shader object so useFrame can update uniforms.
  useMemo(() => {
    const mat = material as THREE.MeshStandardMaterial
    const hasUv = !!uvOffsets
    const hasWind = windEnabled

    if (hasUv && hasWind) {
      mat.onBeforeCompile = (shader) => {
        uvOffsetShader.onBeforeCompile(shader)
        windShader.onBeforeCompile(shader as any)
        windShaderRef.current = shader as any
      }
    } else if (hasUv) {
      mat.onBeforeCompile = uvOffsetShader.onBeforeCompile
    } else if (hasWind) {
      mat.onBeforeCompile = (shader) => {
        windShader.onBeforeCompile(shader as any)
        windShaderRef.current = shader as any
      }
    }

    if (hasUv || hasWind) mat.needsUpdate = true
  }, [material, uvOffsets, windEnabled])

  // Sync geometry and transforms whenever either changes
  useEffect(() => {
    if (!ref.current) return
    ref.current.geometry = localGeometry
    if (directMatrix) {
      applyTransformsDirect(ref.current, transforms)
    } else {
      applyTransforms(ref.current, transforms)
    }
  }, [localGeometry, transforms, directMatrix])

  // Wind: update uniforms each frame via the captured shader ref
  useFrame((_, delta) => {
    const s = windShaderRef.current
    if (!windEnabled || !s) return
    s.uniforms.uTime.value += delta
    s.uniforms.uWindStrength.value = windStrength
    s.uniforms.uWindSpeed.value = windSpeed
    s.uniforms.uWindDir.value.set(windDirection[0], windDirection[1])
  })

  // Billboard: update rotations each frame to face camera
  useFrame(() => {
    if (!billboard || !ref.current || !transforms.length) return

    const mesh = ref.current
    const camPos = camera.position

    for (let i = 0; i < transforms.length; i++) {
      const t = transforms[i]
      _pos.copy(t.position)
      _scale.copy(t.scale)

      // Look at camera (billboard), keeping the plane upright
      _dummy.position.copy(_pos)
      _dummy.scale.copy(_scale)
      _dummy.lookAt(camPos.x, _pos.y, camPos.z) // Y-axis constrained
      _dummy.updateMatrix()

      mesh.setMatrixAt(i, _dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  // Sync instance colors whenever they change
  useEffect(() => {
    if (!ref.current || !instanceColors) return
    instanceColors.forEach((c, i) => ref.current!.setColorAt(i, c))
    ref.current.instanceColor!.needsUpdate = true
  }, [instanceColors])

  // Drive opacity for crossfade without cloning the material every frame
  useEffect(() => {
    if (!ref.current) return
    const mat = ref.current.material as THREE.MeshStandardMaterial
    if (opacity < 1) {
      mat.transparent = true
      mat.opacity = opacity
    } else {
      mat.transparent = false
      mat.opacity = 1
    }
  }, [opacity])

  if (!transforms.length) return null

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, transforms.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      onUpdate={(self) => {
        self.geometry = localGeometry
        if (directMatrix) {
          applyTransformsDirect(self, transforms)
        } else {
          applyTransforms(self, transforms)
        }
        if (instanceColors) {
          instanceColors.forEach((c, i) => self.setColorAt(i, c))
          self.instanceColor!.needsUpdate = true
        }
      }}
    />
  )
}
