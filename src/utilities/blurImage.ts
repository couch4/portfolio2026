export async function blurImageToDataURL(url: string, blurPx = 20): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.filter = `blur(${blurPx}px)`
      ctx.drawImage(img, -blurPx * 2, -blurPx * 2, img.width + blurPx * 4, img.height + blurPx * 4)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = reject
    img.src = url
  })
}
