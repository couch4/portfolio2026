'use client'

import { CameraControls, PerspectiveCamera } from '@react-three/drei'
import { useControls } from 'leva'

const Camera = () => {
  const { cameraX, cameraY, cameraZ, rotationX, rotationY, rotationZ, freeCamera } = useControls({
    cameraX: { value: 0, min: -100, max: 100, step: 1 },
    cameraY: { value: -43, min: -100, max: 100, step: 1 },
    cameraZ: { value: -1, min: -100, max: 100, step: 1 },
    rotationX: { value: 0.2, min: -Math.PI, max: Math.PI, step: 0.01 },
    rotationY: { value: Math.PI, min: -Math.PI, max: Math.PI, step: 0.01 },
    rotationZ: { value: 0, min: -Math.PI, max: Math.PI, step: 0.01 },
    freeCamera: false,
  })

  if (freeCamera) {
    return <CameraControls makeDefault />
  }

  return (
    <PerspectiveCamera
      makeDefault
      position={[cameraX, cameraY, cameraZ]}
      rotation={[rotationX, rotationY, rotationZ]}
      fov={75}
      far={5000}
      near={0.1}
    />
  )
}

export default Camera
