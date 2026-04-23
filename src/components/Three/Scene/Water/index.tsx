import { useEffect, useMemo, useRef } from 'react'
import { extend, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Water } from '../../Shaders/Water.js'
import {
  Color,
  LinearFilter,
  OrthographicCamera,
  PlaneGeometry,
  RepeatWrapping,
  RGBAFormat,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  WebGLRenderTarget,
  WireframeGeometry,
} from 'three'
import { sunDirection } from '../../../../lib/sunDirection'
import { useControls } from 'leva'
import {
  createWaterPointsMaterial,
  createWaterWireframeMaterial,
} from '../../Shaders/WaterDevMaterial'
import { usePointCloud } from '@/hooks/usePointCloud'

extend({ Water })

declare module '@react-three/fiber' {
  interface ThreeElements {
    water: any
  }
}

// Denser plane for dev wireframe — same footprint, higher vertex count for visible grid
const DEV_PLANE = new PlaneGeometry(500, 500, 50, 50)
const DEV_WIRE_GEO = new WireframeGeometry(DEV_PLANE)

// Water plane world-space bounds (position=[0,-50,148], size=500x500):
//   X: -250 → 250,  Z: -102 → 398
// The ortho camera covers this exact footprint from directly above.
const WATER_Y = -50
const SHORE_BAND = 5 // world units above/below waterline that count as shore

// Custom material that outputs how close a surface is to the waterline.
// Sky/atmosphere naturally output 0 — their world Y is far from WATER_Y.
const shoreMat = new ShaderMaterial({
  vertexShader: /* glsl */ `
    varying float vWorldY;
    void main() {
      vWorldY = (modelMatrix * vec4(position, 1.0)).y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying float vWorldY;
    void main() {
      float dist = abs(vWorldY - ${WATER_Y.toFixed(1)});
      float mask = 1.0 - smoothstep(0.0, ${SHORE_BAND.toFixed(1)}, dist);
      gl_FragColor = vec4(mask, mask, mask, 1.0);
    }
  `,
})

// Top-down orthographic camera covering the water plane footprint.
// Camera at Y=50 (100 units above water), looking straight down.
// OrthographicCamera(left, right, top, bottom, near, far) in camera-local space:
//   when up=(0,0,1) and looking in -Y, local X=world X, local Y=world Z offset from camera Z.
const orthoCamera = new OrthographicCamera(-250, 250, 250, -250, 1, 220)
orthoCamera.position.set(0, 50, 148)
orthoCamera.up.set(0, 0, 1)
orthoCamera.lookAt(0, WATER_Y, 148)
orthoCamera.updateMatrixWorld()

const WaterComponent = () => {
  const ref = useRef<Water>(null)
  const progress = usePointCloud()
  const waterTime = useRef(0)
  const { gl, scene } = useThree()

  // 1024×1024 is ~0.49 world units per pixel over the 500×500 plane — enough for foam detail
  const shoreRT = useMemo(
    () =>
      new WebGLRenderTarget(1024, 1024, {
        format: RGBAFormat,
        minFilter: LinearFilter,
        magFilter: LinearFilter,
      }),
    [],
  )

  const waterNormals = useLoader(TextureLoader, '/textures/waternormals.jpg')
  waterNormals.wrapS = waterNormals.wrapT = RepeatWrapping

  const geom = useMemo(() => new PlaneGeometry(500, 500), [])

  const {
    color,
    distortionScale,
    reflectivity,
    flowSpeed,
    foamIntensity,
    foamColor,
    foamThreshold,
  } = useControls('Water', {
    color: '#006266',
    distortionScale: { value: 1.5, min: 0, max: 5, step: 0.1 },
    reflectivity: { value: 0.6, min: 0, max: 1, step: 0.01 },
    flowSpeed: { value: -15, min: -20, max: 20, step: 0.05 },
    foamIntensity: { value: 0, min: 0, max: 1, step: 0.05 },
    foamColor: '#ffffff',
    foamThreshold: { value: 3.0, min: 0.5, max: 15.0, step: 0.5 },
  })

  // Dev materials — kept alive alongside water material; created once after texture loads
  const devPoints = useMemo(
    () => createWaterPointsMaterial('#4fc3f7', waterNormals),
    [waterNormals],
  )
  const devWire = useMemo(
    () => createWaterWireframeMaterial('#4fc3f7', waterNormals),
    [waterNormals],
  )

  // Bake the shore mask once after mount.
  // By this point all geometry in the Suspense boundary is loaded.
  // We defer one rAF so the scene has settled before we render to the RT.
  useEffect(() => {
    requestAnimationFrame(() => {
      if (!ref.current) return

      ref.current.visible = false
      const prevOverride = scene.overrideMaterial
      scene.overrideMaterial = shoreMat

      gl.setRenderTarget(shoreRT)
      gl.clear()
      gl.render(scene, orthoCamera)
      gl.setRenderTarget(null)

      scene.overrideMaterial = prevOverride
      ref.current.visible = true

      // Hand the baked texture to the water shader — set-once, never updated
      const mat = ref.current?.material as ShaderMaterial | undefined
      if (mat && !Array.isArray(mat)) {
        mat.uniforms['uShoreMask'].value = shoreRT.texture
      }
    })
  }, [gl, scene, shoreRT])

  // Water.js doesn't set transparent — enable for alpha fade without modifying Water.js
  useEffect(() => {
    const mat = ref.current?.material
    if (mat && !Array.isArray(mat)) {
      mat.transparent = true
      mat.needsUpdate = true
    }
  }, [])

  // Keep depthRT and resolution uniform in sync with the canvas size
  useEffect(() => {
    const onResize = () => {
      const w = gl.domElement.width
      const h = gl.domElement.height
      const water = ref.current
      if (!water) return
      water.depthRenderTarget?.setSize(w, h)
      const mat = water.material as ShaderMaterial
      if (mat && !Array.isArray(mat)) {
        mat.uniforms['resolution'].value.set(w, h)
      }
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [gl])

  useEffect(
    () => () => {
      devPoints.dispose()
      devWire.dispose()
      shoreRT.dispose()
    },
    [devPoints, devWire, shoreRT],
  )

  useFrame((_, delta) => {
    if (!ref.current) return
    waterTime.current += delta * 0.2

    const u = (ref.current.material as ShaderMaterial).uniforms
    u['time'].value = waterTime.current
    u['sunDirection'].value.copy(sunDirection)
    u['reflectivity'].value = reflectivity
    u['flowDirection'].value.set(-10, -flowSpeed)
    u['uFoamIntensity'].value = foamIntensity
    u['foamColor'].value.set(foamColor)
    u['foamThreshold'].value = foamThreshold

    const p = progress.current
    u['alpha'].value = 1 - p

    devPoints.uniforms.uProgress.value = p
    devWire.uniforms.uProgress.value = p
    devPoints.uniforms.uTime.value = waterTime.current
    devWire.uniforms.uTime.value = waterTime.current
  })

  return (
    <>
      <water
        ref={ref}
        args={[
          geom,
          {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals,
            sunDirection: sunDirection.clone(),
            sunColor: 0xffffff,
            waterColor: color,
            distortionScale,
            fog: true,
          },
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -50, 148]}
      />
      {/* Dev view — animated waving wireframe grid matching water surface */}
      <points
        geometry={DEV_PLANE}
        material={devPoints}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -50, 148]}
      />
      <lineSegments
        geometry={DEV_WIRE_GEO}
        material={devWire}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -50, 148]}
      />
    </>
  )
}

export default WaterComponent
