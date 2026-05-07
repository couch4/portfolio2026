export async function blurImageToDataURL(url: string, blurPx = 20): Promise<string> {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL: URL must be a non-empty string')
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get 2D context'))
          return
        }
        ctx.filter = `blur(${blurPx}px)`
        ctx.drawImage(
          img,
          -blurPx * 2,
          -blurPx * 2,
          img.width + blurPx * 4,
          img.height + blurPx * 4,
        )
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = (err) => reject(err)
    img.src = url
  })
}
