import { useThree } from '@react-three/fiber'

const BREAKPOINT_MD = 768
const BREAKPOINT_3XL = 1920
const MAX_W_DEFAULT = 1440
const MAX_W_3XL = 1800
const PADDING_SM = 16 * 2
const PADDING_MD = 32 * 2

export function useCardSize() {
  const sizeWidth = useThree((s) => s.size.width)
  const vpWidth = useThree((s) => s.viewport.width)
  const vpHeight = useThree((s) => s.viewport.height)

  const maxW = sizeWidth >= BREAKPOINT_3XL ? MAX_W_3XL : MAX_W_DEFAULT
  const padding = sizeWidth >= BREAKPOINT_MD ? PADDING_MD : PADDING_SM
  const containerWidthPx = Math.min(sizeWidth, maxW) - padding

  const pxToWorld = vpWidth / sizeWidth
  const cardWidth = containerWidthPx * pxToWorld
  const cardHeight = vpHeight * 0.6

  return { cardWidth, cardHeight }
}
