import { useThree } from '@react-three/fiber'

const BREAKPOINT_MD = 768
const BREAKPOINT_3XL = 1920
const MAX_W_DEFAULT = 1440
const MAX_W_3XL = 1800
const PADDING_SM = 16 * 2
const PADDING_MD = 32 * 2

export function useCardSize() {
  const { viewport, size } = useThree()

  const maxW = size.width >= BREAKPOINT_3XL ? MAX_W_3XL : MAX_W_DEFAULT
  const padding = size.width >= BREAKPOINT_MD ? PADDING_MD : PADDING_SM
  const containerWidthPx = Math.min(size.width, maxW) - padding

  const pxToWorld = viewport.width / size.width
  const cardWidth = containerWidthPx * pxToWorld
  const cardHeight = viewport.height * 0.6

  return { cardWidth, cardHeight }
}
