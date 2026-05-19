'use client'

import { FC, useEffect, useMemo, useRef } from 'react'
import { Motion } from '@/components/waywardUI'
import { useSceneStore } from '@/store/sceneStore'
import clsx from 'clsx'

interface LiquidGlassProps {
  children?: React.ReactNode
  abberation?: number
  turbulence?: number
  blurRadius?: number
  className?: string
}

const base = 'liquid-glass'

const LiquidGlass: FC<LiquidGlassProps> = ({
  children,
  abberation = 5,
  turbulence = 10,
  blurRadius = 40,
  className,
  ...props
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const backingRef = useRef<HTMLCanvasElement>(null)
  const glCanvas = useSceneStore((s) => s.glCanvas)
  const rafRef = useRef<number>(0)

  // Offscreen snapshot of the full source canvas. Captured once on mount /
  // glCanvas change / source resize. The per-frame blit reads from this static
  // buffer, never from the live WebGL canvas — so the expensive readback is
  // paid exactly once per capture, not per frame.
  const snapshot = useMemo(() => {
    if (typeof document === 'undefined') return null
    return document.createElement('canvas')
  }, [])

  // Effect 1 — Capture-once: snapshot the entire source canvas into the
  // offscreen snapshot buffer. On initial mount the WebGL canvas often has
  // not rendered its first frame yet, so we retry across the next several
  // rAFs until the snapshot reads non-empty pixels.
  useEffect(() => {
    const src = glCanvas
    if (!src || !snapshot) return

    const sctx = snapshot.getContext('2d')
    if (!sctx) return

    const capture = () => {
      if (snapshot.width !== src.width) snapshot.width = src.width
      if (snapshot.height !== src.height) snapshot.height = src.height
      sctx.clearRect(0, 0, snapshot.width, snapshot.height)
      sctx.drawImage(src, 0, 0)
    }

    const hasContent = () => {
      if (snapshot.width === 0 || snapshot.height === 0) return false
      const px = sctx.getImageData(snapshot.width >> 1, snapshot.height >> 1, 1, 1).data
      return px[0] !== 0 || px[1] !== 0 || px[2] !== 0 || px[3] !== 0
    }

    let rafId = 0
    let attempts = 0
    const tryCapture = () => {
      capture()
      attempts++
      if (!hasContent() && attempts < 30) {
        rafId = requestAnimationFrame(tryCapture)
      }
    }
    tryCapture()

    const ro = new ResizeObserver(capture)
    ro.observe(src)
    window.addEventListener('resize', capture, { passive: true })

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      ro.disconnect()
      window.removeEventListener('resize', capture)
    }
  }, [glCanvas, snapshot])

  // Effect 2 — Per-frame slice: copy the wrapper's region of the static
  // snapshot into the small display canvas (which carries the SVG filter).
  // Buffer dimensions are reused across frames (no per-frame reallocation),
  // and the source is a fast in-memory canvas, not the live WebGL surface.
  useEffect(() => {
    const src = glCanvas
    const dst = backingRef.current
    const wrapper = wrapperRef.current
    if (!src || !dst || !wrapper || !snapshot) return

    const ctx = dst.getContext('2d')
    if (!ctx) return

    const bleed = blurRadius * 2

    const tick = () => {
      const srcRect = src.getBoundingClientRect()
      const wrapperRect = wrapper.getBoundingClientRect()
      const scale = srcRect.width > 0 ? snapshot.width / srcRect.width : 1

      const dw = Math.ceil(wrapperRect.width + bleed * 2)
      const dh = Math.ceil(wrapperRect.height + bleed * 2)
      if (dw > 0 && dh > 0 && (dst.width !== dw || dst.height !== dh)) {
        dst.width = dw
        dst.height = dh
      }

      const sx = (wrapperRect.left - srcRect.left - bleed) * scale
      const sy = (wrapperRect.top - srcRect.top - bleed) * scale
      const sw = (wrapperRect.width + bleed * 2) * scale
      const sh = (wrapperRect.height + bleed * 2) * scale

      ctx.clearRect(0, 0, dst.width, dst.height)
      if (sw > 0 && sh > 0) {
        ctx.drawImage(snapshot, sx, sy, sw, sh, 0, 0, dst.width, dst.height)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [glCanvas, snapshot, blurRadius])

  const { style: callerStyle, ...restProps } = props as {
    style?: React.CSSProperties
    [k: string]: unknown
  }

  return (
    <Motion
      ref={wrapperRef}
      {...restProps}
      style={{ ...callerStyle, '--blur-radius': `${blurRadius}px` } as React.CSSProperties}
      className={clsx(base, className)}
    >
      <svg className={`${base}__svg`}>
        <defs>
          <filter
            id="glass-distortion"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation={blurRadius * 0.25} result="blurred" />
            <feTurbulence
              type="fractalNoise"
              baseFrequency={`${turbulence * 0.0001} ${turbulence * 0.0001}`}
              numOctaves="2"
              seed="5"
              result="turbulence"
            />
            <feGaussianBlur in="turbulence" stdDeviation="4" result="softMap" />
            <feDisplacementMap
              in="blurred"
              in2="softMap"
              scale={turbulence * 0.5}
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            <feOffset in="displaced" result="red" dx={-abberation} dy="0" />
            <feColorMatrix
              in="red"
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="red"
            />
            <feOffset in="displaced" result="green" dx="0" dy={abberation} />
            <feColorMatrix
              in="green"
              type="matrix"
              values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="green"
            />
            <feOffset in="displaced" result="blue" dx={abberation} dy="0" />
            <feColorMatrix
              in="blue"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
              result="blue"
            />
            <feBlend in="red" in2="green" mode="screen" result="rg" />
            <feBlend in="rg" in2="blue" mode="screen" />
          </filter>
        </defs>
      </svg>
      <canvas
        ref={backingRef}
        className={`${base}__backing`}
        style={{ filter: 'url(#glass-distortion)' }}
      />
      <div className={`${base}__tint`} />
      <div className={`${base}__content`}>{children}</div>
    </Motion>
  )
}

export default LiquidGlass
