import { FC, useEffect, useRef } from 'react'
import { vertexShader, fragmentShader } from './CarouselCanvasShader'

export interface Slide {
  image: { src: string; alt: string; blurred: string; depth: string }
  video?: null | unknown
}

interface CarouselCanvasProps {
  data: Slide[]
  activeIndex?: number
  slideFadeDuration?: number
  depthIntensity?: number
  blurXIntensity?: number
  showDepthMap?: boolean
  /** Toggle the akella-style fake-3D pointer parallax effect. */
  mouseInteraction?: boolean
  /** Strength of the pointer parallax in UV space (matches Fake3DShaderView's depthScale * 0.1). */
  mouseIntensity?: number
}

interface SlideTextures {
  color: WebGLTexture
  depth: WebGLTexture
  aspect: [number, number]
  ready: boolean
  disposed: boolean
}

function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile failed: ${log}`)
  }
  return shader
}

function createProgram(gl: WebGL2RenderingContext, vsSource: string, fsSource: string) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource)
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource)
  const program = gl.createProgram()!
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(`Program link failed: ${log}`)
  }
  return program
}

function createTexture(gl: WebGL2RenderingContext) {
  const tex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 0]),
  )
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  return tex
}

function uploadImage(
  gl: WebGL2RenderingContext,
  tex: WebGLTexture,
  img: HTMLImageElement,
  mipmap: boolean,
) {
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
  if (mipmap) {
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
    img.src = src
  })
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

const CarouselCanvas: FC<CarouselCanvasProps> = ({
  data,
  activeIndex = 0,
  slideFadeDuration = 700,
  depthIntensity = 0.4,
  blurXIntensity = 0,
  showDepthMap = false,
  mouseInteraction = false,
  mouseIntensity = 0.1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGL2RenderingContext | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)
  const vaoRef = useRef<WebGLVertexArrayObject | null>(null)
  const posBufferRef = useRef<WebGLBuffer | null>(null)
  const uniformsRef = useRef<Record<string, WebGLUniformLocation | null>>({})
  const slidesRef = useRef<SlideTextures[]>([])
  const transitionRef = useRef<{
    from: number
    to: number
    direction: number
    startTime: number
  } | null>(null)
  const activeIndexRef = useRef(activeIndex)
  const prevIndexRef = useRef(activeIndex)
  const rafRef = useRef(0)

  const slideFadeDurationRef = useRef(slideFadeDuration)
  const depthIntensityRef = useRef(depthIntensity)
  const blurXIntensityRef = useRef(blurXIntensity)
  const showDepthMapRef = useRef(showDepthMap)
  const mouseInteractionRef = useRef(mouseInteraction)
  const mouseIntensityRef = useRef(mouseIntensity)
  // Target pointer in normalised device coords (-1..1). Updated on pointermove.
  const mouseTargetRef = useRef<[number, number]>([0, 0])
  // Smoothed (lerped) pointer offset already scaled by intensity, fed to uMouse.
  const mouseLerpedRef = useRef<[number, number]>([0, 0])

  const drawFrameRef = useRef<() => boolean>(() => false)
  const requestDrawRef = useRef<() => void>(() => {})

  drawFrameRef.current = (): boolean => {
    const gl = glRef.current
    const program = programRef.current
    const vao = vaoRef.current
    const canvas = canvasRef.current
    if (!gl || !program || !vao || !canvas) return false

    const slides = slidesRef.current
    if (slides.length === 0) {
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      return false
    }

    const t = transitionRef.current
    let progress = 1
    let from = activeIndexRef.current
    let to = activeIndexRef.current
    let direction = 0
    if (t) {
      const elapsed = performance.now() - t.startTime
      const raw = Math.min(1, elapsed / slideFadeDurationRef.current)
      progress = easeInOutCubic(raw)
      from = t.from
      to = t.to
      direction = t.direction
      if (raw >= 1) transitionRef.current = null
    }

    const slideA = slides[from] ?? slides[0]
    const slideB = slides[to] ?? slideA

    // Lerp the smoothed mouse offset toward the target each frame. When
    // mouseInteraction is off the target is forced back to (0,0) so the
    // effect glides out instead of snapping.
    const intensity = mouseIntensityRef.current
    const targetX = mouseInteractionRef.current ? mouseTargetRef.current[0] * intensity : 0
    const targetY = mouseInteractionRef.current ? mouseTargetRef.current[1] * intensity : 0
    const lerped = mouseLerpedRef.current
    lerped[0] += (targetX - lerped[0]) * 0.08
    lerped[1] += (targetY - lerped[1]) * 0.08
    const mouseSettled =
      Math.abs(targetX - lerped[0]) < 0.0001 && Math.abs(targetY - lerped[1]) < 0.0001
    if (mouseSettled) {
      lerped[0] = targetX
      lerped[1] = targetY
    }

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindVertexArray(vao)

    const u = uniformsRef.current
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, slideA.color)
    gl.uniform1i(u.uImageA, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, slideA.depth)
    gl.uniform1i(u.uDepthA, 1)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, slideB.color)
    gl.uniform1i(u.uImageB, 2)
    gl.activeTexture(gl.TEXTURE3)
    gl.bindTexture(gl.TEXTURE_2D, slideB.depth)
    gl.uniform1i(u.uDepthB, 3)
    gl.uniform1f(u.uProgress, progress)
    gl.uniform1f(u.uDirection, direction)
    gl.uniform1f(u.uParallax, depthIntensityRef.current)
    gl.uniform1f(u.uBlurX, blurXIntensityRef.current)
    gl.uniform1f(u.uShowDepthMap, showDepthMapRef.current ? 1 : 0)
    gl.uniform2f(u.uAspectImageA, slideA.aspect[0], slideA.aspect[1])
    gl.uniform2f(u.uAspectImageB, slideB.aspect[0], slideB.aspect[1])
    gl.uniform2f(u.uAspectCanvas, canvas.width, canvas.height)
    gl.uniform2f(u.uMouse, lerped[0], lerped[1])

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null)

    return transitionRef.current !== null || !mouseSettled
  }

  requestDrawRef.current = () => {
    if (rafRef.current) return
    const tick = () => {
      rafRef.current = 0
      const live = drawFrameRef.current()
      if (live) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl2', {
      antialias: true,
      premultipliedAlpha: false,
      alpha: true,
    })
    if (!gl) {
      console.error('CarouselCanvas: WebGL2 not supported')
      return
    }
    glRef.current = gl

    let program: WebGLProgram
    try {
      program = createProgram(gl, vertexShader, fragmentShader)
    } catch (e) {
      console.error('CarouselCanvas: shader setup failed', e)
      return
    }
    programRef.current = program

    uniformsRef.current = {
      uImageA: gl.getUniformLocation(program, 'uImageA'),
      uDepthA: gl.getUniformLocation(program, 'uDepthA'),
      uImageB: gl.getUniformLocation(program, 'uImageB'),
      uDepthB: gl.getUniformLocation(program, 'uDepthB'),
      uProgress: gl.getUniformLocation(program, 'uProgress'),
      uDirection: gl.getUniformLocation(program, 'uDirection'),
      uParallax: gl.getUniformLocation(program, 'uParallax'),
      uBlurX: gl.getUniformLocation(program, 'uBlurX'),
      uShowDepthMap: gl.getUniformLocation(program, 'uShowDepthMap'),
      uAspectImageA: gl.getUniformLocation(program, 'uAspectImageA'),
      uAspectImageB: gl.getUniformLocation(program, 'uAspectImageB'),
      uAspectCanvas: gl.getUniformLocation(program, 'uAspectCanvas'),
      uMouse: gl.getUniformLocation(program, 'uMouse'),
    }

    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)
    const posBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)
    vaoRef.current = vao
    posBufferRef.current = posBuffer

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
      requestDrawRef.current()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    return () => {
      ro.disconnect()
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      gl.deleteProgram(program)
      gl.deleteBuffer(posBuffer)
      gl.deleteVertexArray(vao)
      programRef.current = null
      vaoRef.current = null
      posBufferRef.current = null
      glRef.current = null
    }
  }, [])

  useEffect(() => {
    const gl = glRef.current
    if (!gl || !data || data.length === 0) {
      slidesRef.current = []
      return
    }

    const slides: SlideTextures[] = data.map((slide) => {
      const color = createTexture(gl)
      const depth = createTexture(gl)
      const entry: SlideTextures = {
        color,
        depth,
        aspect: [1, 1],
        ready: false,
        disposed: false,
      }

      loadImage(slide.image.blurred)
        .then((img) => {
          if (entry.disposed || !glRef.current) return
          if (entry.ready) return
          uploadImage(glRef.current, color, img, false)
          entry.aspect = [img.naturalWidth, img.naturalHeight]
          requestDrawRef.current()
        })
        .catch(() => {})

      loadImage(slide.image.src)
        .then((img) => {
          if (entry.disposed || !glRef.current) return
          uploadImage(glRef.current, color, img, true)
          entry.aspect = [img.naturalWidth, img.naturalHeight]
          entry.ready = true
          requestDrawRef.current()
        })
        .catch((err) => console.error('CarouselCanvas: failed to load image', slide.image.src, err))

      loadImage(slide.image.depth)
        .then((img) => {
          if (entry.disposed || !glRef.current) return
          uploadImage(glRef.current, depth, img, false)
          requestDrawRef.current()
        })
        .catch((err) =>
          console.error('CarouselCanvas: failed to load depth', slide.image.depth, err),
        )

      return entry
    })

    slidesRef.current = slides
    requestDrawRef.current()

    return () => {
      slides.forEach((s) => {
        s.disposed = true
        const ctx = glRef.current
        if (ctx) {
          ctx.deleteTexture(s.color)
          ctx.deleteTexture(s.depth)
        }
      })
    }
  }, [data])

  useEffect(() => {
    slideFadeDurationRef.current = slideFadeDuration
    depthIntensityRef.current = depthIntensity
    blurXIntensityRef.current = blurXIntensity
    showDepthMapRef.current = showDepthMap
    mouseInteractionRef.current = mouseInteraction
    mouseIntensityRef.current = mouseIntensity
    requestDrawRef.current()
  }, [
    slideFadeDuration,
    depthIntensity,
    blurXIntensity,
    showDepthMap,
    mouseInteraction,
    mouseIntensity,
  ])

  // Pointer tracking: only attach listeners when mouse interaction is active.
  // Coords are normalised to (-1..1) inside the canvas; (0,0) is the centre.
  useEffect(() => {
    if (!mouseInteraction) {
      // Glide back to centre when toggled off.
      mouseTargetRef.current[0] = 0
      mouseTargetRef.current[1] = 0
      requestDrawRef.current()
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return

    const handleMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      // Invert Y so up = positive (matches NDC convention used in Fake3DShaderView).
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      mouseTargetRef.current[0] = Math.max(-1, Math.min(1, nx))
      mouseTargetRef.current[1] = Math.max(-1, Math.min(1, ny))
      requestDrawRef.current()
    }
    const handleLeave = () => {
      mouseTargetRef.current[0] = 0
      mouseTargetRef.current[1] = 0
      requestDrawRef.current()
    }

    canvas.addEventListener('pointermove', handleMove)
    canvas.addEventListener('pointerleave', handleLeave)
    return () => {
      canvas.removeEventListener('pointermove', handleMove)
      canvas.removeEventListener('pointerleave', handleLeave)
    }
  }, [mouseInteraction])

  useEffect(() => {
    const prev = prevIndexRef.current
    activeIndexRef.current = activeIndex
    if (prev === activeIndex) {
      requestDrawRef.current()
      return
    }
    // Pick the shorter direction around the ring so wrap (last → first) reads
    // as "next" rather than a long backwards sweep.
    const len = data.length
    const diff = activeIndex - prev
    const wrapped = len > 0 && Math.abs(diff) > len / 2
    const direction = wrapped ? (diff > 0 ? -1 : 1) : diff > 0 ? 1 : -1
    transitionRef.current = {
      from: prev,
      to: activeIndex,
      direction,
      startTime: performance.now(),
    }
    prevIndexRef.current = activeIndex
    requestDrawRef.current()
  }, [activeIndex, data])

  return <canvas ref={canvasRef} className="viewer__canvas" />
}

export default CarouselCanvas
