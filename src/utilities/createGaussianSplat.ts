/**
 * Gaussian Splat generation utility.
 * Converts a color image + depth map (from createDepthMap) into a 3D Gaussian
 * Splat scene using @sparkjsdev/spark — runs entirely in-browser.
 *
 * Lazy-loads the Spark WASM bundle on first call.
 * Safe to use in PayloadCMS custom components or any React context.
 */

import type { SplatMesh } from '@sparkjsdev/spark'
import type { DepthMapResult } from './createDepthMap'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GaussianSplatOptions {
  /** Object URL (or data URL) of the original colour image */
  originalUrl: string
  /** Depth result produced by createDepthMap() */
  depth: Pick<DepthMapResult, 'depthValues' | 'width' | 'height'>
  /**
   * Sample every Nth pixel in each axis.
   * 1 = every pixel, 2 = every other pixel (default).
   * Higher values are faster but less dense.
   */
  subsample?: number
  /**
   * World-space Z range: splats span 0 → depthScale along Z.
   * Defaults to 1 so the viewer can apply a runtime scale without compounding.
   * @default 1
   */
  depthScale?: number
  /**
   * Override the base splat radius in world units.
   * Auto-computed from image width and subsample when omitted.
   */
  splatRadius?: number
  /**
   * Skip pixels whose alpha channel is below this threshold (0–1).
   * @default 0.05
   */
  minAlpha?: number
}

export interface GaussianSplatResult {
  splatMesh: SplatMesh
  /** Release GPU/WASM resources when no longer needed */
  dispose: () => void
}

// ---------------------------------------------------------------------------
// Main utility
// ---------------------------------------------------------------------------

/**
 * Generate a Gaussian Splat mesh from an original image and its depth map.
 *
 * @example
 * const depthResult = await createDepthMap(file)
 * const { splatMesh, dispose } = await createGaussianSplat({
 *   originalUrl: URL.createObjectURL(file),
 *   depth: depthResult,
 * })
 * // Add splatMesh to a Three.js scene
 * scene.add(splatMesh)
 * // When done:
 * dispose()
 */
export async function createGaussianSplat(
  options: GaussianSplatOptions,
): Promise<GaussianSplatResult> {
  const {
    originalUrl,
    depth,
    subsample = 2,
    depthScale = 1,
    minAlpha = 0.05,
  } = options

  const { depthValues, width, height } = depth

  // Step 1 — Decode original image at depth-map resolution for per-pixel colours
  const colorData = await sampleImageAtResolution(originalUrl, width, height)

  // Step 2 — Lazy-load Spark + Three so the heavy WASM bundle stays out of the
  //           initial chunk (same pattern as createDepthMap)
  const [{ SplatMesh }, THREE] = await Promise.all([
    import('@sparkjsdev/spark'),
    import('three'),
  ])

  // World-space dimensions:
  //   X: –0.5 → +0.5  (normalised width = 1 unit)
  //   Y: scaled by aspect ratio, centred at 0
  //   Z: 0 → depthScale  (near → far)
  const aspect = height / width
  const autoRadius = (1 / width) * subsample * 0.65
  const splatRadius = options.splatRadius ?? autoRadius

  // Reuse objects across the tight loop — avoids GC pressure
  const center = new THREE.Vector3()
  const scales = new THREE.Vector3()
  const quat = new THREE.Quaternion() // identity — no rotation
  const color = new THREE.Color()

  // Step 3 — Build the SplatMesh.  constructSplats fires synchronously during
  //           construction, so colorData and depthValues are captured by closure.
  const splatMesh = new SplatMesh({
    constructSplats: (packedSplats) => {
      for (let row = 0; row < height; row += subsample) {
        for (let col = 0; col < width; col += subsample) {
          const idx = row * width + col
          const ci = idx * 4

          const a = colorData[ci + 3]! / 255
          if (a < minAlpha) continue

          const r = colorData[ci]! / 255
          const g = colorData[ci + 1]! / 255
          const b = colorData[ci + 2]! / 255
          const d = depthValues[idx]! // 0 = near, 1 = far

          // Map pixel (col, row) → world (x, y, z)
          const x = col / (width - 1) - 0.5
          const y = -(row / (height - 1) - 0.5) * aspect
          // Centred at z=0. depthScale directly sets the max Z displacement:
          //   d=1 (white) →  depthScale
          //   d=0 (black) → -depthScale
          const z = (d - 0.5) * 2 * depthScale

          center.set(x, y, z)
          // Slightly flatten splats along Z so they tile without large gaps
          scales.set(splatRadius, splatRadius, splatRadius * 0.4)
          color.setRGB(r, g, b)

          packedSplats.pushSplat(center, scales, quat, a, color)
        }
      }
    },
  })

  // Step 4 — Wait for WASM static init + GPU texture upload
  await splatMesh.initialized

  return {
    splatMesh,
    dispose: () => splatMesh.dispose(),
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Draw the image into a hidden canvas at the target resolution and return the
 * raw RGBA Uint8ClampedArray.  This down/up-samples the source to match the
 * depth map dimensions so pixel indices align 1-to-1.
 */
function sampleImageAtResolution(
  url: string,
  width: number,
  height: number,
): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get 2D canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(ctx.getImageData(0, 0, width, height).data)
    }
    img.onerror = () => reject(new Error('Failed to load image for colour sampling'))
    img.src = url
  })
}
