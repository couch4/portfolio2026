import { useRef } from 'react'
import { extend, useFrame, useThree } from '@react-three/fiber'
import { ShaderMaterial, Vector2, Vector3 } from 'three'
import { WaterMaterial } from '../../Shaders/WaterMaterial'
import { useControls } from 'leva'

extend({ WaterMaterial })

// Augment R3F's JSX namespace so <waterMaterial> is typed
declare module '@react-three/fiber' {
  interface ThreeElements {
    waterMaterial: ThreeElements['meshStandardMaterial'] & {
      iTime?: number
      iResolution?: [number, number]
      iHeight?: number
      iPitch?: number
      iSeaHeight?: number
      iSeaChoppy?: number
      iSeaSpeed?: number
      iSeaFreq?: number
      iSeaBase?: [number, number, number]
      iFlySpeed?: number
      iNight?: boolean
    }
  }
}

const Water = ({ props }: { props?: object }) => {
  const matRef = useRef<InstanceType<typeof WaterMaterial>>(null)

  const { viewport } = useThree()

  const [
    {
      iHeight,
      iPitch,
      iSeaHeight,
      iSeaChoppy,
      iSeaSpeed,
      iSeaFreq,
      iNight,
      resolution,
      speed,
      iFlySpeed,
    },
    set,
  ] = useControls(() => ({
    iHeight: { value: 5.6, min: 0, max: 10 },
    iPitch: { value: 0.79, min: 0, max: 3.14 },
    iSeaHeight: { value: 1.4, min: 0, max: 10 },
    iSeaChoppy: { value: 0.33, min: 0, max: 10 },
    iSeaSpeed: { value: 1.5, min: 0, max: 10 },
    iSeaFreq: { value: 0.25, min: 0, max: 1 },
    resolution: { value: 14, min: 1, max: 100 },
    speed: { value: 0.1, min: 0, max: 10 },
    iFlySpeed: { value: -0.1, min: -10, max: 10 },
    iNight: { value: false },
  }))

  let canvasWidth = viewport.width
  let canvasHeight = viewport.height

  useFrame(({ clock }) => {
    if (matRef.current) {
      const view: ShaderMaterial = matRef.current

      view.uniforms.iTime.value = clock.getElapsedTime() * speed
    }
  })

  return (
    <group {...props} dispose={null}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -50, 148]}>
        <planeGeometry args={[500, 500, 64, 64]} />
        <waterMaterial
          ref={matRef}
          iHeight={iHeight}
          iPitch={iPitch}
          iSeaHeight={iSeaHeight}
          iSeaChoppy={iSeaChoppy}
          iSeaSpeed={iSeaSpeed}
          iSeaFreq={iSeaFreq}
          iNight={iNight}
          iFlySpeed={iFlySpeed}
          // @ts-ignore
          iResolution={new Vector2(canvasWidth * resolution, canvasHeight * resolution)}
        />
      </mesh>
    </group>
  )
}

export default Water
