import { useEffect, useMemo, useRef } from 'react'
import { usePointCloud } from '@/hooks/usePointCloud'
import { extend, useFrame, useThree } from '@react-three/fiber'
import { Sky } from '../../Shaders/Sky.js'
import { MathUtils, PMREMGenerator, Scene } from 'three'
import { useControls } from 'leva'
import { sunDirection } from '../../../../lib/sunDirection'
import { useSceneStore } from '@/store/sceneStore'

extend({ Sky })

declare module '@react-three/fiber' {
  interface ThreeElements {
    sky: any
  }
}

const Atmos = () => {
  const skyRef = useRef<InstanceType<typeof Sky>>(null)
  const progress = usePointCloud()
  const { gl, scene } = useThree()
  const isDevView = useSceneStore((s) => s.isDevView)

  const pmrem = useMemo(() => new PMREMGenerator(gl), [gl])
  // Separate Sky instance used only for PMREM baking — never added to main scene
  const bakeSky = useMemo(() => new Sky(), [])
  const prevRt = useRef<ReturnType<PMREMGenerator['fromScene']> | null>(null)

  const {
    elevation,
    azimuth,
    turbidity,
    rayleigh,
    mieCoefficient,
    mieDirectionalG,
    exposure,
    cloudCoverage,
    cloudDensity,
    cloudElevation,
    cloudScale,
    cloudSpeed,
  } = useControls(
    'Sky',
    {
      elevation: { value: 14, min: 0, max: 90, step: 0.1 },
      azimuth: { value: 140, min: -180, max: 180, step: 1 },
      turbidity: { value: 0.3, min: 0, max: 20 },
      rayleigh: { value: 0.28, min: 0, max: 4 },
      mieCoefficient: { value: 0.005, min: 0, max: 0.1 },
      mieDirectionalG: { value: 0.8, min: 0, max: 1 },
      exposure: { value: 0.5, min: 0, max: 1 },
      cloudCoverage: { value: 0.4, min: 0, max: 1 },
      cloudDensity: { value: 0.4, min: 0, max: 1 },
      cloudElevation: { value: 0.5, min: 0, max: 1 },
      cloudScale: { value: 0.0002, min: 0, max: 0.002, step: 0.0001 },
      cloudSpeed: { value: 0.00003, min: 0, max: 0.002, step: 0.0001 },
    },
    { collapsed: true },
  )

  // Re-bake IBL + update sun/atmosphere uniforms when static params change
  useEffect(() => {
    const sky = skyRef.current

    if (!sky) return

    const phi = MathUtils.degToRad(90 - elevation)
    const theta = MathUtils.degToRad(azimuth)
    sunDirection.setFromSphericalCoords(1, phi, theta)

    // @ts-ignore
    const u = sky.material.uniforms
    u['sunPosition'].value.copy(sunDirection)
    u['turbidity'].value = turbidity
    u['rayleigh'].value = rayleigh
    u['mieCoefficient'].value = mieCoefficient
    u['mieDirectionalG'].value = mieDirectionalG
    u['cloudCoverage'].value = cloudCoverage
    u['cloudDensity'].value = cloudDensity
    u['cloudElevation'].value = cloudElevation
    u['cloudScale'].value = cloudScale
    u['cloudSpeed'].value = cloudSpeed

    // @ts-ignore Mirror atmosphere-only uniforms on the bake sky (clouds excluded from IBL bake)
    const bu = bakeSky.material.uniforms
    bu['sunPosition'].value.copy(sunDirection)
    bu['turbidity'].value = turbidity
    bu['rayleigh'].value = rayleigh
    bu['mieCoefficient'].value = mieCoefficient
    bu['mieDirectionalG'].value = mieDirectionalG
    bu['cloudCoverage'].value = 0 // no clouds in IBL bake — avoids seams

    const envScene = new Scene()
    bakeSky.scale.setScalar(1000)
    envScene.add(bakeSky)

    if (prevRt.current) prevRt.current.dispose()
    prevRt.current = pmrem.fromScene(envScene)
    scene.environment = prevRt.current.texture

    gl.toneMappingExposure = exposure
  }, [
    elevation,
    azimuth,
    turbidity,
    rayleigh,
    mieCoefficient,
    mieDirectionalG,
    exposure,
    cloudCoverage,
    cloudDensity,
    cloudElevation,
    cloudScale,
    cloudSpeed,
    gl,
    // scene,
    pmrem,
    bakeSky,
  ])

  // Advance cloud time + fade sky in dev view — cheap uniform writes, no re-render
  useFrame(({ clock }) => {
    if (skyRef.current) {
      // @ts-ignore
      skyRef.current.material.uniforms['time'].value = clock.elapsedTime
      // @ts-ignore
      skyRef.current.material.uniforms['uFade'].value = progress.current
    }
  })

  useEffect(
    () => () => {
      pmrem.dispose()
    },
    [pmrem],
  )

  return (
    <>
      <sky ref={skyRef} scale={10000} />
      <directionalLight
        castShadow
        position={sunDirection}
        intensity={elevation / 10}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0005}
      />
    </>
  )
}

export default Atmos
