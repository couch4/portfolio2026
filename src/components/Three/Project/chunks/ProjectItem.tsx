import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion } from 'r3f-motion'
import { MeshPortalMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import type { Material } from 'three'
import { Plane, PlaneHelper, Vector3 } from 'three'
import type { Group } from 'three'
import PortalScene from './PortalScene'
import ProjectHero from './ProjectHero'
import ProjectItemCopy from './ProjectItemCopy'
import { geometry } from 'maath'
import { spring } from '@/styles/motion'
import { useCardSize } from '@/components/Three/Carousel/useCardSize'

extend({ RoundedPlaneGeometry: geometry.RoundedPlaneGeometry })

declare module '@react-three/fiber' {
  interface ThreeElements {
    roundedPlaneGeometry: any
  }
}

const ProjectItem = ({
  data,
  index = 0,
  currItem = 0,
  debug = false,
  isActive = false,
  isZoomed = false,
  projectIndex = 1,
  onClick,
  ...props
}: {
  data: any
  index?: number
  currItem?: number
  debug?: boolean
  isActive?: boolean
  isZoomed?: boolean
  projectIndex?: number
  onClick?: (index: number) => void
}) => {
  const { align, modelSettings } = data
  const { cardWidth, cardHeight } = useCardSize()
  const floatY = useRef(0)
  const spinY = useRef(0)
  const outerRef = useRef<Group>(null)
  const rootRef = useRef<Group>(null)

  const bottomY = cardHeight / 2
  const clippingPlanes = useMemo(
    () => [
      new Plane(new Vector3(0, 0, 1), 0),
      ...(modelSettings?.clipBottom
        ? [new Plane(new Vector3(0, 1, 0), bottomY + (modelSettings?.clipBottomOffset || 0))]
        : []),
    ],
    [modelSettings?.clipBottom, bottomY],
  )

  const planeHelpers = useMemo<PlaneHelper[]>(
    () => (debug ? clippingPlanes.map((p) => new PlaneHelper(p, 5, 0xff0000)) : []),
    [debug, clippingPlanes],
  )

  useEffect(() => {
    return () => {
      planeHelpers.forEach((h) => {
        h.geometry.dispose()
        ;(h.material as Material).dispose()
      })
    }
  }, [planeHelpers])

  const handleClick = useCallback(() => onClick?.(index), [onClick, index])

  const isNearby = Math.abs(index - currItem) <= 1

  useFrame(({ clock }) => {
    if (!isNearby) return
    floatY.current = Math.sin(clock.getElapsedTime() * 0.5) * 0.15
    spinY.current = Math.sin(clock.getElapsedTime() * 0.3) * 0.1
  })

  return (
    <motion.group
      ref={rootRef}
      {...props}
      onClick={handleClick}
      animate={{
        z: isActive ? 4 : 0,
        x: isNearby && isZoomed && !isActive ? (index > currItem ? 20 : -20) : 0,
      }}
      transition={spring}
    >
      {isNearby && (
        <>
          <ProjectHero
            data={data}
            floatY={floatY}
            spinY={spinY}
            outerRef={outerRef}
            clippingPlanes={clippingPlanes}
            isActive={isActive}
          />
          {planeHelpers.map((helper, i) => (
            <primitive key={i} object={helper} />
          ))}
        </>
      )}
      <mesh>
        <roundedPlaneGeometry args={[cardWidth, cardHeight, 0.2]} />
        {isNearby || isActive ? (
          <MeshPortalMaterial resolution={1024} blur={0}>
            <PortalScene
              data={data}
              floatY={floatY}
              spinY={spinY}
              outerRef={outerRef}
              isActive={isActive}
            />
          </MeshPortalMaterial>
        ) : (
          <meshBasicMaterial color="#05080F" />
        )}
      </mesh>
      {isNearby && (
        <ProjectItemCopy
          data={data}
          index={projectIndex}
          isActive={isActive}
          onClick={() => onClick?.(index)}
        />
      )}
    </motion.group>
  )
}

export default memo(ProjectItem)
