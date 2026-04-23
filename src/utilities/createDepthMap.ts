/**
 * Depth map generation utility using Depth Anything V2 (MiDaS-inspired).
 * Runs entirely in-browser via ONNX Runtime — no API key required.
 *
 * Lazy-loads the model on first call and caches it for subsequent calls.
 * Safe to use in PayloadCMS custom components or any React context.
 */

import type { DepthEstimationPipeline, Tensor } from '@huggingface/transformers'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DepthModelId =
  | 'Xenova/depth-anything-small-hf'
  | 'Xenova/depth-anything-base-hf'
  | 'Xenova/dpt-hybrid-midas'

export interface DepthMapResult {
  /** Grayscale RGBA ImageData (R=G=B=depth, A=255) at the model's output resolution */
  imageData: ImageData
  /** Depth values normalised to 0–1, row-major */
  depthValues: Float32Array
  /** Dimensions of the depth map (may differ from input) */
  width: number
  height: number
  /** PNG Blob of the grayscale depth map */
  blob: Blob
  /** Object URL for the blob — call URL.revokeObjectURL when done */
  url: string
}

export interface DepthMapOptions {
  /** Model to use. Defaults to depth-anything-v2-small (~99 MB, cached after first load). */
  model?: DepthModelId
  /** Called with a 0–1 progress value while the model is being downloaded. */
  onProgress?: (progress: number) => void
}

// ---------------------------------------------------------------------------
// Singleton pipeline cache
// ---------------------------------------------------------------------------

let cachedModelId: DepthModelId | null = null
let pipelinePromise: Promise<DepthEstimationPipeline> | null = null

async function getPipeline(
  modelId: DepthModelId,
  onProgress?: (progress: number) => void,
): Promise<DepthEstimationPipeline> {
  if (pipelinePromise && cachedModelId === modelId) return pipelinePromise

  const { pipeline, env } = await import('@huggingface/transformers')

  // Disable WASM multi-threading so SharedArrayBuffer is not required.
  // This removes the need for Cross-Origin-Opener/Embedder-Policy headers,
  // which would otherwise block fetches from external origins like HuggingFace CDN.
  // @ts-ignore
  env.backends.onnx.wasm.numThreads = 1
  env.allowLocalModels = false

  cachedModelId = modelId
  pipelinePromise = pipeline('depth-estimation', modelId, {
    progress_callback: (info: { progress?: number; status: string }) => {
      if (onProgress && typeof info.progress === 'number') {
        onProgress(info.progress / 100)
      }
    },
  }) as Promise<DepthEstimationPipeline>

  return pipelinePromise
}

// ---------------------------------------------------------------------------
// Main utility
// ---------------------------------------------------------------------------

/**
 * Generate a depth map from an image source.
 *
 * @param source  File, object URL, data URL, or HTMLImageElement
 * @param options Model selection and progress callback
 *
 * @example
 * const { url, blob } = await createDepthMap(file, {
 *   onProgress: (p) => setProgress(p),
 * })
 * img.src = url
 */
export async function createDepthMap(
  source: File | string | HTMLImageElement,
  options: DepthMapOptions = {},
): Promise<DepthMapResult> {
  const modelId: DepthModelId = options.model ?? 'Xenova/depth-anything-small-hf'

  // Resolve source to a URL string the pipeline can consume
  let imageUrl: string
  let localUrl: string | null = null

  if (source instanceof File) {
    localUrl = URL.createObjectURL(source)
    imageUrl = localUrl
  } else if (source instanceof HTMLImageElement) {
    imageUrl = source.src
  } else {
    imageUrl = source
  }

  try {
    const estimator = await getPipeline(modelId, options.onProgress)
    const result = await estimator(imageUrl)

    // predicted_depth is the raw Tensor [H, W]; depth is an already-processed RawImage
    const tensor = result.predicted_depth as Tensor
    const [height, width] = tensor.dims as [number, number]
    const rawValues = tensor.data as unknown as Float32Array

    // Normalise to 0–1
    let min = Infinity
    let max = -Infinity
    for (let i = 0; i < rawValues.length; i++) {
      if (rawValues[i] < min) min = rawValues[i]
      if (rawValues[i] > max) max = rawValues[i]
    }
    const range = max - min || 1

    const depthValues = new Float32Array(rawValues.length)
    const rgba = new Uint8ClampedArray(width * height * 4)

    for (let i = 0; i < rawValues.length; i++) {
      const normalised = (rawValues[i] - min) / range
      depthValues[i] = normalised
      const byte = Math.round(normalised * 255)
      const offset = i * 4
      rgba[offset] = byte
      rgba[offset + 1] = byte
      rgba[offset + 2] = byte
      rgba[offset + 3] = 255
    }

    const imageData = new ImageData(rgba, width, height)
    const blob = await imageDataToBlob(imageData, width, height)
    const url = URL.createObjectURL(blob)

    return { imageData, depthValues, width, height, blob, url }
  } finally {
    if (localUrl) URL.revokeObjectURL(localUrl)
  }
}

/**
 * Dispose the cached pipeline and free WASM memory.
 * Call this if you no longer need depth estimation (e.g., on page unload).
 */
export async function disposeDepthPipeline(): Promise<void> {
  if (pipelinePromise) {
    const pipe = await pipelinePromise
    await pipe.dispose()
    pipelinePromise = null
    cachedModelId = null
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function imageDataToBlob(imageData: ImageData, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('canvas.toBlob returned null'))
    }, 'image/png')
  })
}
