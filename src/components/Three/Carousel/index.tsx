import { memo, useCallback, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useEnvironment, useGLTF, useTexture } from '@react-three/drei'
import { Carousel as R3FCarousel, motion } from 'r3f-motion'
import { useCardSize } from '@/hooks'
import type { Group } from 'three'
import ProjectItem from '@/components/Three/Project/chunks/ProjectItem'
import { MathUtils } from 'three'
import { useSceneStore } from '@/store/sceneStore'
import './Carousel.css'

interface CarouselProps {
  items?: any[]
  debug?: boolean
  defaultValue?: number
  onSwitch?: (index: number) => void
}

const Carousel = ({ items = [], ...props }: CarouselProps) => {
  const envMap = useEnvironment({ preset: 'warehouse' })
  const { cardWidth = 4, gap = 0.5 } = useCardSize()
  const [zoomed, setZoomed] = useState<number | null>(null)
  const setIsSwiping = useSceneStore((s) => s.setIsSwiping)

  const groupRef = useRef<Group>(null)
  const rotX = useRef(0)

  useFrame((state) => {
    if (groupRef.current) {
      const { y } = state.pointer
      const targetX = -y * 0.02
      rotX.current = MathUtils.lerp(rotX.current, targetX, 0.05)
      groupRef.current.rotation.x = rotX.current
    }
  })

  const handleClick = useCallback((index: number) => {
    console.log('clicked', index)
    setZoomed((prev) => (prev === index ? null : index))
  }, [])

  // Preload all GLTFs and backgrounds as soon as carousel first renders
  items.forEach((item) => {
    if (item.gltf) useGLTF.preload(item.gltf)
    if (item.background) useTexture.preload(item.background)
  })

  const projects = items.map((item, index: number) => (
    <ProjectItem
      key={`carousel-item.${index}`}
      data={item}
      envMap={envMap}
      onClick={handleClick}
      isActive={zoomed === index}
      isZoomed={zoomed !== null}
      index={index}
      totalItems={items.length}
      activeIndex={zoomed !== null ? zoomed : undefined}
    />
  ))

  return (
    <motion.group ref={groupRef} className="carousel">
      <R3FCarousel
        items={projects}
        {...props}
        itemWidth={cardWidth}
        gap={gap}
        disable={zoomed !== null}
        onDragStart={() => setIsSwiping(true)}
        onDragEnd={() => setIsSwiping(false)}
      />
    </motion.group>
  )
}

export default memo(Carousel)
