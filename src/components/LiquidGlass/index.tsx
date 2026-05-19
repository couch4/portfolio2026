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
  /**
   * Bump this value to force a re-capture of the background (e.g. when a
   * parent slide change has redrawn the scene). Between bumps the glass is
   * fully static — no per-frame work, filter raster stays cached.
   */
  recaptureKey?: string | number
}

const base = 'liquid-glass'

const LiquidGlass: FC<LiquidGlassProps> = ({
  children,
  abberation = 5,
  turbulence = 10,
  blurRadius = 40,
  className,
  recaptureKey,
  ...props
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const backingRef = useRef<HTMLCanvasElement>(null)
  const glCanvas = useSceneStore((s) => s.glCanvas)

  // Offscreen snapshot of the full source canvas. Holds the most recent
  // capture of the bg. The display canvas is composed from this buffer.
  const snapshot = useMemo(() => {
    if (typeof document === 'undefined') return null
    return document.createElement('canvas')
  }, [])

  // Capture from WebGL → snapshot → display canvas. The display canvas is
  // sized to the full viewport (matches source canvas) and contains the full
  // backdrop. It stays anchored to viewport (0,0) via a CSS transform that
  // counter-tracks the wrapper's own transform, so the wrapper "windows"
  // through it via overflow:hidden — reveal the right slice as it moves.
  useEffect(() => {
    const src = glCanvas
    const dst = backingRef.current
    const wrapper = wrapperRef.current
    if (!src || !dst || !wrapper || !snapshot) return

    const sctx = snapshot.getContext('2d')
    const dctx = dst.getContext('2d')
    if (!sctx || !dctx) return

    const captureSnapshot = () => {
      if (src.width === 0 || src.height === 0) return
      if (snapshot.width !== src.width) snapshot.width = src.width
      if (snapshot.height !== src.height) snapshot.height = src.height
      sctx.clearRect(0, 0, snapshot.width, snapshot.height)
      sctx.drawImage(src, 0, 0)
    }

    const composeToDisplay = () => {
      if (snapshot.width === 0 || snapshot.height === 0) return
      const srcRect = src.getBoundingClientRect()
      if (srcRect.width === 0 || srcRect.height === 0) return

      // Display canvas covers the full source-canvas region (= viewport).
      if (dst.width !== snapshot.width) dst.width = snapshot.width
      if (dst.height !== snapshot.height) dst.height = snapshot.height
      dst.style.width = `${srcRect.width}px`
      dst.style.height = `${srcRect.height}px`

      dctx.clearRect(0, 0, dst.width, dst.height)
      dctx.drawImage(snapshot, 0, 0)
    }

    const hasContent = () => {
      if (snapshot.width === 0 || snapshot.height === 0) return false
      const px = sctx.getImageData(snapshot.width >> 1, snapshot.height >> 1, 1, 1).data
      return px[0] !== 0 || px[1] !== 0 || px[2] !== 0 || px[3] !== 0
    }

    let scheduledRaf = 0
    const recapture = () => {
      if (scheduledRaf) cancelAnimationFrame(scheduledRaf)
      scheduledRaf = requestAnimationFrame(() => {
        scheduledRaf = 0
        captureSnapshot()
        composeToDisplay()
      })
    }

    // Initial capture: retry until the bg has rendered.
    let initRaf = 0
    let initAttempts = 0
    const tryInit = () => {
      captureSnapshot()
      composeToDisplay()
      initAttempts++
      if (!hasContent() && initAttempts < 600) {
        initRaf = requestAnimationFrame(tryInit)
      }
    }
    tryInit()

    const ro = new ResizeObserver(recapture)
    ro.observe(src)
    window.addEventListener('resize', recapture, { passive: true })

    return () => {
      if (initRaf) cancelAnimationFrame(initRaf)
      if (scheduledRaf) cancelAnimationFrame(scheduledRaf)
      ro.disconnect()
      window.removeEventListener('resize', recapture)
    }
  }, [glCanvas, snapshot, recaptureKey])

  // Per-frame: counter-transform the static display canvas so it stays
  // anchored to viewport (0,0), no matter how the wrapper drags / scales /
  // translates. Also reactively listens to wrapper style mutations so it
  // catches Framer's commits in the same task they happen.
  useEffect(() => {
    const src = glCanvas
    const dst = backingRef.current
    const wrapper = wrapperRef.current
    if (!src || !dst || !wrapper) return

    const update = () => {
      const wrapperRect = wrapper.getBoundingClientRect()
      const srcRect = src.getBoundingClientRect()
      const tx = srcRect.left - wrapperRect.left
      const ty = srcRect.top - wrapperRect.top
      dst.style.transform = `translate3d(${tx}px, ${ty}px, 0)`
    }

    let rafId = 0
    const tick = () => {
      update()
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    // Catch Framer's style writes synchronously (in the same task that
    // commits them) so the canvas inverse-transform updates without
    // waiting for the next rAF tick.
    const mo = new MutationObserver(update)
    mo.observe(wrapper, { attributes: true, attributeFilter: ['style'] })

    return () => {
      cancelAnimationFrame(rafId)
      mo.disconnect()
    }
  }, [glCanvas])

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
            x="0%"
            y="0%"
            width="100%"
            height="100%"
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
