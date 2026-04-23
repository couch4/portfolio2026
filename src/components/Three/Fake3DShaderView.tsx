'use client'

/**
 * Fake-3D parallax shader view (akella/fake3d technique).
 *
 * Renders the original image on a plane, displaced per-pixel by the depth map
 * in response to mouse movement. Near pixels (white in depth map) shift more
 * than far pixels (black), creating a parallax illusion without any geometry.
 *
 * depthScale controls displacement strength — the same value used by the
 * Gaussian Splat mode so both controls stay in sync.
 */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */ `
uniform sampler2D uImage;
uniform sampler2D uDepth;
// Pre-scaled mouse offset in UV space, updated each frame via lerp
uniform vec2 uMouse;

varying vec2 vUv;

void main() {
  float depth = texture2D(uDepth, vUv).r;

  // Near pixels (white = depth 1.0) displace most; far pixels (black) stay put
  vec2 uv = vUv + uMouse * depth;

  // Soft edge fade to hide the exposed border when UVs drift out of [0,1]
  vec2 border = smoothstep(0.0, 0.03, uv) * (1.0 - smoothstep(0.97, 1.0, uv));
  float edgeMask = border.x * border.y;

  vec3 color = texture2D(uImage, clamp(uv, 0.001, 0.999)).rgb;
  gl_FragColor = vec4(color * edgeMask, 1.0);
}
`

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Fake3DShaderViewProps {
  /** Object URL of the original colour image */
  originalUrl: string
  /** Object URL of the greyscale depth map */
  depthUrl: string
  /**
   * Parallax strength. Matches the depthScale Storybook control.
   * At 0 the image is flat; higher values exaggerate the depth.
   */
  depthScale: number
  /** Image aspect ratio (width / height) — used to size the plane correctly */
  aspect: number
}

export function Fake3DShaderView({ originalUrl, depthUrl, depthScale, aspect }: Fake3DShaderViewProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const depthScaleRef = useRef(depthScale)

  // Keep depthScaleRef in sync for use inside useFrame closure
  useEffect(() => {
    depthScaleRef.current = depthScale
  }, [depthScale])

  // Load both textures imperatively to avoid needing a Suspense boundary
  useEffect(() => {
    const loader = new THREE.TextureLoader()
    let cancelled = false

    Promise.all([
      new Promise<THREE.Texture>((res) => loader.load(originalUrl, res)),
      new Promise<THREE.Texture>((res) => loader.load(depthUrl, res)),
    ]).then(([imageTex, depthTex]) => {
      if (cancelled || !materialRef.current) return
      materialRef.current.uniforms.uImage.value = imageTex
      materialRef.current.uniforms.uDepth.value = depthTex
      materialRef.current.needsUpdate = true
    })

    return () => {
      cancelled = true
    }
  }, [originalUrl, depthUrl])

  // Smooth lerp of mouse position → uMouse uniform each frame
  useFrame(({ pointer }) => {
    if (!materialRef.current) return
    const mouse = materialRef.current.uniforms.uMouse.value as THREE.Vector2
    // Scale NDC pointer (-1..1) → UV-space offset, gated by depthScale
    // Factor of 0.1 keeps displacement subtle at depthScale=1
    const targetX = pointer.x * depthScaleRef.current * 0.1
    const targetY = pointer.y * depthScaleRef.current * 0.1
    mouse.x += (targetX - mouse.x) * 0.06
    mouse.y += (targetY - mouse.y) * 0.06
  })

  const uniforms = useMemo(
    () => ({
      uImage: { value: null },
      uDepth: { value: null },
      uMouse: { value: new THREE.Vector2(0, 0) },
    }),
    [],
  )

  // Plane: width=2 units, height scaled by inverse aspect so it fills the viewport
  const planeArgs: [number, number] = [2, 2 / aspect]

  return (
    <mesh>
      <planeGeometry args={planeArgs} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  )
}
