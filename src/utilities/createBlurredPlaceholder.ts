/**
 * Create a tiny blurred placeholder image for NextImage's blurDataURL.
 * Runs entirely in-browser using canvas — no API required.
 *
 * Matches plaiceholder's approach: downsample to a very small size (default 4px),
 * boost saturation, normalise pixel values, then encode as a tiny base64 string.
 * NextImage / the browser handles smooth upscaling automatically.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlurredPlaceholderResult {
  /** Base64 data URL (e.g., "data:image/webp;base64,...") */
  dataUrl: string
  /** Width of the tiny placeholder */
  width: number
  /** Height of the tiny placeholder */
  height: number
}

export interface BlurredPlaceholderOptions {
  /**
   * Width of the tiny thumbnail (px). Plaiceholder defaults to 4.
   * Range 4–64. Smaller = more blurred / smaller string. Defaults to 4.
   */
  size?: number
  /**
   * Saturation multiplier. Plaiceholder uses 1.2.
   * Values > 1 make colours more vivid. Defaults to 1.2.
   */
  saturation?: number
  /**
   * Brightness multiplier. Defaults to 1 (no change).
   */
  brightness?: number
  /** Output format. Defaults to png (lossless, matches plaiceholder). */
  format?: 'webp' | 'jpeg' | 'png'
  /** Quality for lossy formats (0-1). Defaults to 0.8. */
  quality?: number
}

// ---------------------------------------------------------------------------
// Main utility
// ---------------------------------------------------------------------------

/**
 * Create a smooth blurred placeholder from an image source, suitable for
 * NextImage's `blurDataURL`. Matches plaiceholder's approach:
 *   1. Resize to `size` px (default 4)
 *   2. Boost saturation
 *   3. Normalise (stretch pixel values to full 0-255 range)
 *   4. Encode as tiny base64 — the browser/Next handles smooth upscaling
 *
 * @param source  File, object URL, data URL, or HTMLImageElement
 * @param options Size, saturation, brightness, format options
 *
 * @example
 * const { dataUrl } = await createBlurredPlaceholder(file)
 * // <Image blurDataURL={dataUrl} placeholder="blur" … />
 */
export async function createBlurredPlaceholder(
  source: File | string | HTMLImageElement,
  options: BlurredPlaceholderOptions = {},
): Promise<BlurredPlaceholderResult> {
  const { size = 4, saturation = 1.2, brightness = 1, format = 'png', quality = 0.8 } = options

  const img = await loadImage(source)

  const aspect = img.naturalHeight / img.naturalWidth
  const thumbW = Math.max(1, size)
  const thumbH = Math.max(1, Math.round(size * aspect))

  // --- Step 1: draw at tiny size (browser bilinear does the averaging) ---
  const tiny = makeCanvas(thumbW, thumbH)
  const tinyCtx = tiny.getContext('2d')!
  tinyCtx.imageSmoothingEnabled = true
  tinyCtx.imageSmoothingQuality = 'high'
  tinyCtx.drawImage(img, 0, 0, thumbW, thumbH)

  // --- Step 2: read pixels, apply saturation + brightness, normalise ---
  const imageData = tinyCtx.getImageData(0, 0, thumbW, thumbH)
  const pixels = imageData.data // Uint8ClampedArray, RGBA

  // Find min/max for normalisation (per-channel)
  let rMin = 255,
    rMax = 0
  let gMin = 255,
    gMax = 0
  let bMin = 255,
    bMax = 0

  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] < rMin) rMin = pixels[i]
    if (pixels[i] > rMax) rMax = pixels[i]
    if (pixels[i + 1] < gMin) gMin = pixels[i + 1]
    if (pixels[i + 1] > gMax) gMax = pixels[i + 1]
    if (pixels[i + 2] < bMin) bMin = pixels[i + 2]
    if (pixels[i + 2] > bMax) bMax = pixels[i + 2]
  }

  const rRange = rMax - rMin || 1
  const gRange = gMax - gMin || 1
  const bRange = bMax - bMin || 1

  for (let i = 0; i < pixels.length; i += 4) {
    // Normalise each channel to 0-255
    let r = ((pixels[i] - rMin) / rRange) * 255
    let g = ((pixels[i + 1] - gMin) / gRange) * 255
    let b = ((pixels[i + 2] - bMin) / bRange) * 255

    // Apply brightness
    r *= brightness
    g *= brightness
    b *= brightness

    // Apply saturation via luminance mixing
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    r = lum + saturation * (r - lum)
    g = lum + saturation * (g - lum)
    b = lum + saturation * (b - lum)

    pixels[i] = Math.max(0, Math.min(255, Math.round(r)))
    pixels[i + 1] = Math.max(0, Math.min(255, Math.round(g)))
    pixels[i + 2] = Math.max(0, Math.min(255, Math.round(b)))
  }

  // Write processed pixels back
  tinyCtx.putImageData(imageData, 0, 0)

  const dataUrl = await canvasToDataUrl(tiny, format, quality)

  return { dataUrl, width: thumbW, height: thumbH }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function loadImage(source: File | string | HTMLImageElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (source instanceof HTMLImageElement) {
      resolve(source)
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))

    if (source instanceof File) {
      img.src = URL.createObjectURL(source)
    } else {
      img.src = source
    }
  })
}

function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  format: string,
  quality: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const mimeType = format === 'jpeg' ? 'image/jpeg' : `image/${format}`

    try {
      const dataUrl = canvas.toDataURL(mimeType, quality)
      resolve(dataUrl)
    } catch (err) {
      reject(new Error(`Failed to convert canvas to ${format}: ${err}`))
    }
  })
}
