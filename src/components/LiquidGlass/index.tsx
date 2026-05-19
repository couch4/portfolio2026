'use client'

import { FC, useEffect, useRef } from 'react'
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

  useEffect(() => {
    const src = glCanvas
    const dst = backingRef.current
    const wrapper = wrapperRef.current
    if (!src || !dst || !wrapper) return

    const ctx = dst.getContext('2d')
    if (!ctx) return

    let cachedSrcRect: DOMRect = src.getBoundingClientRect()

    const refreshSrcRect = () => {
      cachedSrcRect = src.getBoundingClientRect()
    }

    const ro = new ResizeObserver(refreshSrcRect)
    ro.observe(src)
    window.addEventListener('resize', refreshSrcRect, { passive: true })

    const blit = () => {
      const srcRect = cachedSrcRect
      const rect = wrapper.getBoundingClientRect()
      const scale = src.width / srcRect.width
      const bleed = blurRadius * 2

      const sx = Math.round((rect.left - srcRect.left - bleed) * scale)
      const sy = Math.round((rect.top - srcRect.top - bleed) * scale)
      const sw = Math.round((rect.width + bleed * 2) * scale)
      const sh = Math.round((rect.height + bleed * 2) * scale)
      const dw = Math.round(rect.width + bleed * 2)
      const dh = Math.round(rect.height + bleed * 2)

      if (dst.width !== dw || dst.height !== dh) {
        dst.width = dw
        dst.height = dh
      }

      ctx.clearRect(0, 0, dw, dh)
      ctx.drawImage(src, sx, sy, sw, sh, 0, 0, dw, dh)
    }

    const loop = () => {
      blit()
      rafRef.current = requestAnimationFrame(loop)
    }

    // Also blit on pointermove so the canvas stays in sync during active drag,
    // which Framer drives from pointermove outside of rAF timing
    const onPointerMove = () => blit()
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      window.removeEventListener('resize', refreshSrcRect)
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [glCanvas, blurRadius])

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
