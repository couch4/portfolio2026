/**
 * Forked from @react-three/drei MeshPortalMaterial v10.7.7
 *
 * Fixes:
 * 1. FullScreenQuad + ShaderMaterial in ManagePortalScene now disposed on unmount
 * 2. Blend buffers (buffer1/buffer2) only allocated when blur > 0
 * 3. SDF generator render-targets + quads disposed after use
 * 4. Supports both WebGL and WebGPU renderers via runtime detection
 */
import * as THREE from 'three'
import * as React from 'react'
import {
  extend,
  useThree,
  useFrame,
  type ThreeElements,
  type ReactThreeFiber,
} from '@react-three/fiber'
import { useIntersect, useFBO, RenderTexture } from '@react-three/drei'
import {
  PortalMaterialImpl as PortalMaterialWebGL,
  makeSDFGenerator as makeSDFGeneratorWebGL,
  createBlendQuad as createBlendQuadWebGL,
} from './PortalMaterialWebGL'
import {
  PortalMaterialImpl as PortalMaterialWebGPU,
  makeSDFGenerator as makeSDFGeneratorWebGPU,
  createBlendQuad as createBlendQuadWebGPU,
} from './PortalMaterialWebGPU'

/** Returns true when the active Three.js renderer is the WebGPU backend. */
function isWebGPU(gl: any): boolean {
  return gl?.isWebGPURenderer === true
}

declare module '@react-three/fiber' {
  interface ThreeElements {
    portalMaterialImpl: ThreeElements['shaderMaterial'] & {
      resolution: ReactThreeFiber.Vector2
      blur: number
      blend: number
      size?: number
      sdf?: THREE.Texture
      map?: THREE.Texture
    }
  }
}

export type PortalProps = Omit<ThreeElements['portalMaterialImpl'], 'ref' | 'blend'> & {
  blend?: number
  blur?: number
  resolution?: number
  worldUnits?: boolean
  eventPriority?: number
  renderPriority?: number
  events?: boolean
}

// ---------------------------------------------------------------------------
// ManagePortalScene – FIX #1 + #2
// ---------------------------------------------------------------------------
function ManagePortalScene({
  blur,
  events,
  rootScene,
  material,
  priority,
  worldUnits,
}: {
  blur: number
  events: boolean | undefined
  rootScene: THREE.Scene
  material: React.RefObject<any>
  priority: number
  worldUnits: boolean
}) {
  const scene = useThree((s) => s.scene)
  const setEvents = useThree((s) => s.setEvents)
  const gl = useThree((s) => s.gl)

  // FIX #2 — only allocate blend buffers when blur > 0 (portal-enter transition)
  // samples: 0 for WebGPU — Metal only supports 1 and 4, useFBO default (0) is safe
  const fboOpts = { samples: 0 }
  const buffer1 = useFBO(blur > 0 ? undefined : 1, blur > 0 ? undefined : 1, fboOpts)
  const buffer2 = useFBO(blur > 0 ? undefined : 1, blur > 0 ? undefined : 1, fboOpts)

  React.useLayoutEffect(() => {
    scene.matrixAutoUpdate = false
  }, [scene])

  React.useEffect(() => {
    if (events !== undefined) setEvents({ enabled: events })
  }, [events, setEvents])

  const [quad, blend] = React.useMemo(
    () =>
      (isWebGPU(gl) ? createBlendQuadWebGPU : createBlendQuadWebGL)(
        buffer1.texture,
        buffer2.texture,
      ),
    [buffer1.texture, buffer2.texture, gl],
  )

  // FIX #1 — dispose FullScreenQuad + material on unmount
  React.useEffect(() => {
    return () => {
      const q = quad as any
      if (q.material) {
        if (Array.isArray(q.material)) q.material.forEach((m: any) => m.dispose())
        else q.material.dispose()
      }
      // FullScreenQuad has dispose(); QuadMesh (extends Mesh) needs geometry.dispose()
      if (typeof q.dispose === 'function') q.dispose()
      else q.geometry?.dispose()
    }
  }, [quad])

  useFrame((state) => {
    const parent = material.current?.__r3f?.parent?.object
    if (!parent) return

    if (!worldUnits) {
      if (priority && material.current?.blend === 1) parent.updateWorldMatrix(true, false)
      scene.matrixWorld.copy(parent.matrixWorld)
    } else {
      scene.matrixWorld.identity()
    }

    if (priority) {
      const b = material.current?.blend ?? 0
      if (b > 0 && b < 1) {
        blend.value = b
        state.gl.setRenderTarget(buffer1)
        state.gl.render(scene, state.camera)
        state.gl.setRenderTarget(buffer2)
        state.gl.render(rootScene, state.camera)
        state.gl.setRenderTarget(null)
        quad.render(state.gl as any)
      } else if (b === 1) {
        state.gl.render(scene, state.camera)
      }
    }
  }, priority)

  return null
}

// ---------------------------------------------------------------------------
// MeshPortalMaterial
// ---------------------------------------------------------------------------
const MeshPortalMaterial = React.forwardRef<any, PortalProps>(
  (
    {
      children,
      events = undefined,
      blur = 0,
      eventPriority = 0,
      renderPriority = 0,
      worldUnits = false,
      resolution = 512,
      ...props
    },
    fref,
  ) => {
    const ref = React.useRef<any>(null)
    const { scene, gl, size, viewport, setEvents } = useThree()
    const gpu = isWebGPU(gl)
    const PortalMaterialImpl = gpu ? PortalMaterialWebGPU : PortalMaterialWebGL
    extend({ PortalMaterialImpl })
    // WebGPU (Metal) only supports sampleCount 1 and 4 — useFBO defaults to HalfFloatType
    // which is fine, but samples must be 0 (=1) for WebGPU compatibility.
    const maskRenderTarget = useFBO(resolution, resolution, gpu ? { samples: 0 } : undefined)
    const [priority, setPriority] = React.useState(0)
    const sdfGeneratorRef = React.useRef<{
      (image: THREE.Texture): THREE.RenderTarget | THREE.WebGLRenderTarget
      dispose(): void
    } | null>(null)

    useFrame(() => {
      const p = ref.current.blend > 0 ? Math.max(1, renderPriority) : 0
      if (priority !== p) setPriority(p)
    })

    React.useEffect(() => {
      if (events !== undefined) setEvents({ enabled: !events })
    }, [events, setEvents])

    const [visible, setVisible] = React.useState(true)
    const parent = useIntersect(setVisible)

    React.useLayoutEffect(() => {
      parent.current = ref.current?.__r3f?.parent?.object ?? null
    }, [parent])

    React.useLayoutEffect(() => {
      if (!parent.current) return

      if (blur && ref.current.sdf === null) {
        const tempMesh = new THREE.Mesh(
          (parent.current as THREE.Mesh).geometry,
          new THREE.MeshBasicMaterial(),
        )
        const bb = new THREE.Box3().setFromBufferAttribute(
          tempMesh.geometry.attributes.position as THREE.BufferAttribute,
        )
        const pad = 1 + 2 / resolution
        const orthoCam = new THREE.OrthographicCamera(
          bb.min.x * pad,
          bb.max.x * pad,
          bb.max.y * pad,
          bb.min.y * pad,
          0.1,
          1000,
        )
        orthoCam.position.set(0, 0, 1)
        orthoCam.lookAt(0, 0, 0)
        gl.setRenderTarget(maskRenderTarget)
        gl.render(tempMesh, orthoCam)
        const sg = (gpu ? makeSDFGeneratorWebGPU : makeSDFGeneratorWebGL)(
          resolution,
          resolution,
          gl as any,
        )
        sdfGeneratorRef.current = sg
        const sdf = sg(maskRenderTarget.texture)
        const readSdf = new Float32Array(resolution * resolution)
        gl.readRenderTargetPixels(sdf as any, 0, 0, resolution, resolution, readSdf)
        let min = Infinity
        for (let i = 0; i < readSdf.length; i++) {
          if (readSdf[i] < min) min = readSdf[i]
        }
        ref.current.size = -min
        ref.current.sdf = sdf.texture
        gl.setRenderTarget(null)

        // Dispose temp resources
        tempMesh.geometry.dispose()
        ;(tempMesh.material as THREE.Material).dispose()
      }
    }, [resolution, blur, gl, maskRenderTarget, parent])

    // FIX #3 — dispose SDF generator on unmount
    React.useEffect(() => {
      return () => {
        sdfGeneratorRef.current?.dispose()
        sdfGeneratorRef.current = null
      }
    }, [])

    React.useImperativeHandle(fref, () => ref.current)

    const compute = React.useCallback(
      (event: any, state: any, _previous: any) => {
        if (!parent.current) return false
        state.pointer.set(
          (event.offsetX / state.size.width) * 2 - 1,
          -(event.offsetY / state.size.height) * 2 + 1,
        )
        state.raycaster.setFromCamera(state.pointer, state.camera)
        if (ref.current?.blend === 0) {
          const [intersection] = state.raycaster.intersectObject(parent.current)
          if (!intersection) {
            state.raycaster.camera = undefined
            return false
          }
        }
      },
      [parent],
    )

    return (
      <portalMaterialImpl
        ref={ref}
        blur={blur}
        blend={0}
        resolution={[size.width * viewport.dpr, size.height * viewport.dpr]}
        attach="material"
        {...props}
      >
        <RenderTexture
          attach="map"
          samples={gpu ? 4 : 8}
          frames={visible ? Infinity : 0}
          eventPriority={eventPriority}
          renderPriority={renderPriority}
          compute={compute}
        >
          {children}
          <ManagePortalScene
            blur={blur}
            events={events}
            rootScene={scene}
            priority={priority}
            material={ref}
            worldUnits={worldUnits}
          />
        </RenderTexture>
      </portalMaterialImpl>
    )
  },
)

MeshPortalMaterial.displayName = 'MeshPortalMaterial'

export { MeshPortalMaterial }
