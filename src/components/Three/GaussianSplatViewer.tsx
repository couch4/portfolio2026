'use client'

/**
 * R3F component that renders a Spark SplatMesh inside an existing R3F Canvas.
 *
 * Usage:
 *   <Canvas>
 *     <GaussianSplatViewer splatMesh={splatMesh} splatSize={0.3} />
 *   </Canvas>
 *
 * - splatSize   live-updates SparkRenderer.blurAmount (no rebuild)
 * - depthScale  is baked into Z positions at build time via createGaussianSplat
 */

import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import type { SplatMesh, SparkRenderer } from '@sparkjsdev/spark'
import * as THREE from 'three'

interface GaussianSplatViewerProps {
  splatMesh: SplatMesh
  /**
   * Gaussian covariance blur added to each splat.
   * Larger = bigger, softer points. Maps to SparkRenderer.blurAmount.
   * @default 0.3
   */
  splatSize?: number
}

export function GaussianSplatViewer({ splatMesh, splatSize = 0.3 }: GaussianSplatViewerProps) {
  const { gl, scene } = useThree()
  const sparkRef = useRef<SparkRenderer | null>(null)

  // Create SparkRenderer once, tied to the R3F WebGLRenderer
  useEffect(() => {
    let spark: SparkRenderer

    import('@sparkjsdev/spark').then(({ SparkRenderer }) => {
      spark = new SparkRenderer({
        renderer: gl as THREE.WebGLRenderer,
        autoUpdate: true,
        blurAmount: splatSize,
      })
      scene.add(spark)
      sparkRef.current = spark
    })

    return () => {
      if (sparkRef.current) {
        scene.remove(sparkRef.current)
        sparkRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene])

  // Live-update splat visual size via renderer blur (no rebuild)
  useEffect(() => {
    if (sparkRef.current) {
      sparkRef.current.blurAmount = splatSize
    }
  }, [splatSize])

  // Track SparkRenderer origin to camera to prevent float16 quantization artifacts
  useFrame(({ camera }) => {
    if (sparkRef.current) {
      sparkRef.current.position.copy(camera.position)
    }
  })

  return <primitive object={splatMesh} />
}
