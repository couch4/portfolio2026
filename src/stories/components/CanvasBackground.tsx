import { useEffect, useRef } from 'react'
import { useSceneStore } from '@/store/sceneStore'

const BG_URL =
  'https://images.unsplash.com/photo-1669295384050-a1d4357bd1d7?q=80&w=5070&auto=format&fit=crop'

const CanvasBackground = ({ bg = BG_URL }: { bg?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const setGlCanvas = useSceneStore((s) => s.setGlCanvas)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setGlCanvas(canvas)

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = bg
    img.onload = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }

    return () => setGlCanvas(null)
  }, [setGlCanvas])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full -z-10" />
}

export default CanvasBackground
