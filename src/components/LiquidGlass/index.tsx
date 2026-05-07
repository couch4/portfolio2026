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

    const loop = () => {
      const rect = wrapper.getBoundingClientRect()
      const srcRect = src.getBoundingClientRect()
      const scale = src.width / srcRect.width
      const bleed = blurRadius * 2

      const sx = rect.left - srcRect.left - bleed
      const sy = rect.top - srcRect.top - bleed
      const sw = rect.width + bleed * 2
      const sh = rect.height + bleed * 2

      const dw = Math.ceil(sw)
      const dh = Math.ceil(sh)
      if (dst.width !== dw || dst.height !== dh) {
        dst.width = dw
        dst.height = dh
      }

      ctx.clearRect(0, 0, dw, dh)
      ctx.drawImage(src, sx * scale, sy * scale, sw * scale, sh * scale, 0, 0, dw, dh)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [glCanvas, blurRadius])

  return (
    <Motion
      ref={wrapperRef}
      {...props}
      className={clsx(base, className)}
      style={{ '--blur-radius': `${blurRadius}px` } as React.CSSProperties}
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
