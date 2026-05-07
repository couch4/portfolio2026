import { useThree } from '@react-three/fiber'
import { getCurrentBreakpoint } from '@/utilities/content'

const paddingBase = 16

const paddingValues: Record<string, number> = {
  md: paddingBase * 3,
  lg: paddingBase * 4,
  xl: paddingBase * 4,
  '2xl': paddingBase * 4,
  '3xl': paddingBase * 4,
}

const getMaxWidth = (breakpoint: string) => (breakpoint === '3xl' ? 1800 : 1440)

const gridGap = paddingBase

// columns[bp] = total column-strides to remove, split symmetrically (n/2 from each side)
const columnInset = (breakpoint: string, colWidth: number) => {
  const columns: Record<string, number> = {
    lg: 2,
    xl: 2,
    '2xl': 2,
    '3xl': 2,
  }
  return (columns[breakpoint] || 0) * (colWidth + gridGap)
}

type HeightConfig = { height: number; minHeight: number; maxHeight: number }

const heightValues: Record<string, HeightConfig> = {
  default: { height: 0.75, minHeight: 450, maxHeight: 550 },
  md: { height: 0.65, minHeight: 500, maxHeight: 600 },
  lg: { height: 0.6, minHeight: 600, maxHeight: 750 },
  xl: { height: 0.55, minHeight: 600, maxHeight: 750 },
  '2xl': { height: 0.55, minHeight: 700, maxHeight: 850 },
  '3xl': { height: 0.65, minHeight: 700, maxHeight: 1000 },
}

const useCardSize = () => {
  const sizeWidth = useThree((s) => s.size.width)
  const sizeHeight = useThree((s) => s.size.height)
  const vpWidth = useThree((s) => s.viewport.width)
  const vpHeight = useThree((s) => s.viewport.height)

  // Derive breakpoint from the actual R3F canvas width, not window.innerWidth,
  // so that resizing the canvas (e.g. in Storybook) keeps everything in sync.
  const breakpoint = getCurrentBreakpoint(sizeWidth)

  const padding = paddingValues[breakpoint] || paddingBase * 2
  const effectiveWidth = Math.min(sizeWidth, getMaxWidth(breakpoint))
  const containerWidth = effectiveWidth - padding
  const colWidth = (containerWidth - 11 * gridGap) / 12

  const inset = columnInset(breakpoint, colWidth)
  const pxToWorld = vpWidth / sizeWidth
  const cardWidthPx = containerWidth - inset
  const cardWidth = cardWidthPx * pxToWorld

  const { height, minHeight, maxHeight } = heightValues[breakpoint] ?? heightValues.default
  const pxToWorldY = vpHeight / sizeHeight
  const cardHeightPx = Math.min(Math.max(sizeHeight * height, minHeight), maxHeight)
  const cardHeight = cardHeightPx * pxToWorldY

  const gap = padding * 0.5 * pxToWorld

  // drei's <Html transform> renders at worldSize = cssSize × distanceFactor/400
  // (see Html.js occlusion mesh ratio). Locking distanceFactor to 400×pxToWorld
  // makes 1 CSS px == 1 world-projected px, so .project-container always maps
  // 1:1 to its 3D card across breakpoints and canvas resizes.
  const distanceFactor = 400 * pxToWorld

  return {
    cardWidth,
    cardHeight,
    contentWidth: containerWidth,
    contentHeight: cardHeightPx,
    distanceFactor,
    gap,
    gapPx: padding * 0.5,
    colWidth,
  }
}

export default useCardSize
