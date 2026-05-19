'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { PerspectiveCamera } from '@react-three/drei'
import { useControls } from 'leva'
import { useCameraSystem } from './useCameraSystem'
import { useCameraStore } from '@/store/cameraStore'
import { SCENE_POSES, type SceneKey } from './cameraPositions'
import { useFrame, useThree } from '@react-three/fiber'
import { Euler } from 'three'

const CameraRig = () => {
  const { camera: threeCamera } = useThree()

  useCameraSystem()

  const { cameraFOV, cameraX, cameraY, cameraZ, rotationX, rotationY, rotationZ, freeCamera } =
    useControls({
      cameraX: { value: 0, min: -100, max: 100, step: 1 },
      cameraY: { value: -45, min: -100, max: 100, step: 1 },
      cameraZ: { value: 67, min: -100, max: 100, step: 1 },
      rotationX: { value: 0, min: -Math.PI, max: Math.PI, step: 0.01 },
      rotationY: { value: 0, min: -Math.PI, max: Math.PI, step: 0.01 },
      rotationZ: { value: 0, min: -Math.PI, max: Math.PI, step: 0.01 },
      cameraFOV: { value: 50, min: 10, max: 120, step: 1 },
      freeCamera: false,
    })

  useFrame(() => {
    if (!freeCamera) return
    threeCamera.position.set(cameraX, cameraY, cameraZ)
    threeCamera.setRotationFromEuler(new Euler(rotationX, rotationY, rotationZ, 'XYZ'))
  })

  return <PerspectiveCamera makeDefault fov={cameraFOV} far={10000} near={0.1} />
}

const Camera = () => {
  const pathname = usePathname()
  const goTo = useCameraStore((s) => s.goTo)
  const prevSceneRef = useRef<SceneKey>('home')

  useEffect(() => {
    const raw = pathname.split('/')[1] || 'home'
    const nextScene = raw as SceneKey
    if (!(nextScene in SCENE_POSES)) return
    if (nextScene === prevSceneRef.current) return
    prevSceneRef.current = nextScene
    goTo(nextScene)
  }, [pathname, goTo])

  return <CameraRig />
}

export default Camera
