import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { animate, useMotionValue } from 'motion/react'
import { motion } from 'r3f-motion'
import type { Group } from 'three'
import ProjectItem from '@/components/Three/Project/chunks/ProjectItem'
import { useCardSize } from './useCardSize'

export const SPRING = { type: 'spring' as const, stiffness: 600, damping: 100, restDelta: 0.001 }
const DRAG_THRESHOLD_PX = 40

interface CarouselProps {
  items: any[]
  gap?: number
  debug?: boolean
  defaultValue?: number
  onSwitch?: (index: number) => void
}

// Modulo that always returns a non-negative result
const mod = (n: number, m: number) => ((n % m) + m) % m

const Carousel = ({
  items,
  gap = 0.5,
  debug = false,
  defaultValue = 0,
  onSwitch,
}: CarouselProps) => {
  const { viewport } = useThree()
  const { cardWidth } = useCardSize()
  const [zoomed, setZoomed] = useState<number | null>(null)
  const slideWidth = cardWidth + gap
  const count = items.length

  // Double the array so we have 2 physical copies of every slide.
  // Start at the beginning of the second copy — first copy sits at negative
  // "natural" positions relative to starting view, ready to be repositioned.
  const loopedItems = useMemo(() => [...items, ...items], [items])
  const totalSlots = loopedItems.length // 2 * count
  const startIndex = count + defaultValue

  const [currItem, setCurrItem] = useState(startIndex)
  const currItemRef = useRef(startIndex)

  const dragStartX = useRef(0)
  const isDragging = useRef(false)
  const wasDragging = useRef(false)
  const groupRef = useRef<Group>(null)

  const currXMotion = useMotionValue(-startIndex * slideWidth)
  const prevSlideWidth = useRef(slideWidth)

  useEffect(() => {
    const target = -currItem * slideWidth
    // If slideWidth changed (e.g. viewport/DPR resize), snap to the new
    // target instead of springing — otherwise an in-flight spring would
    // visibly desync from the freshly-repositioned slots.
    if (prevSlideWidth.current !== slideWidth) {
      prevSlideWidth.current = slideWidth
      currXMotion.jump(target)
      return
    }
    const controls = animate(currXMotion, target, SPRING)
    return () => controls.stop()
  }, [currItem, slideWidth])

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.x = currXMotion.get()
      groupRef.current.updateMatrixWorld(true)
    }
  })

  const goTo = useCallback(
    (index: number) => {
      currItemRef.current = index
      setCurrItem(index)
      onSwitch?.(mod(index, count))
    },
    [count, onSwitch],
  )

  const handlePointerDown = useCallback(
    (e: any) => {
      if (zoomed !== null) return
      wasDragging.current = false
      dragStartX.current = e.clientX
      isDragging.current = true
      e.target.setPointerCapture(e.pointerId)
    },
    [zoomed],
  )

  const handlePointerUp = useCallback(
    (e: any) => {
      if (!isDragging.current || zoomed !== null) return
      isDragging.current = false
      const delta = dragStartX.current - e.clientX
      if (Math.abs(delta) > DRAG_THRESHOLD_PX) {
        wasDragging.current = true
        goTo(delta > 0 ? currItemRef.current + 1 : currItemRef.current - 1)
      }
    },
    [goTo, zoomed],
  )

  const handleClick = useCallback((wrappedPos: number) => {
    if (wasDragging.current) return
    if (wrappedPos !== currItemRef.current) return
    setZoomed((prev) => (prev === wrappedPos ? null : wrappedPos))
  }, [])

  return (
    <motion.group ref={groupRef}>
      {loopedItems.map((data, i) => {
        // Wrap each slot so its position stays within ±(totalSlots/2) of currItem.
        // When currItem moves right and a slot falls far behind, it jumps forward
        // by totalSlots (and vice versa) — equivalent to "moving the last slide
        // to the end of the other end" — while invisible (far off screen).
        const wrappedPos = i + Math.round((currItem - i) / totalSlots) * totalSlots
        return (
          <group key={`carouselItem-${i}`} position-x={wrappedPos * slideWidth}>
            <ProjectItem
              data={data}
              currXMotion={currXMotion}
              index={wrappedPos}
              currItem={currItem}
              projectIndex={(i % items.length) + 1}
              debug={debug}
              isActive={zoomed === wrappedPos}
              onClick={() => handleClick(wrappedPos)}
            />
            <mesh
              position-z={-0.01}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
            >
              <planeGeometry args={[cardWidth, viewport.height]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        )
      })}
    </motion.group>
  )
}

export default memo(Carousel)
