import { memo, useMemo, useRef } from 'react'
import type { MotionValue } from 'motion/react'
import { motion } from 'r3f-motion'
import { Environment, MeshPortalMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import { Plane, PlaneHelper, Vector3 } from 'three'
import type { Group } from 'three'
import Project from '@/components/Three/Project'
import ProjectHero from './ProjectHero'
import ProjectItemContent from './ProjectItemCopy'
import { geometry } from 'maath'
import { spring } from '@/styles/motion'
import { useCardSize } from '@/components/Three/Carousel/useCardSize'
import '../Project.css'

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
  projectIndex = 1,
  ...props
}: {
  currXMotion?: MotionValue<number>
  data: any
  index?: number
  currItem?: number
  debug?: boolean
  isActive?: boolean
  projectIndex?: number
  onClick?: () => void
}) => {
  const { modelSettings } = data
  const { viewport } = useThree()
  const { dpr } = viewport
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
      dispose={null}
      animate={{ z: isActive ? 4 : 0 }}
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
          <MeshPortalMaterial resolution={2048 * dpr} blur={0}>
            <Project
              data={data}
              floatY={floatY}
              spinY={spinY}
              inPortal
              outerRef={outerRef}
              isActive={isActive}
            />
            <Environment preset="warehouse" />
          </MeshPortalMaterial>
        ) : (
          <meshBasicMaterial color="#05080F" />
        )}
      </mesh>
      {isNearby && <ProjectItemContent data={data} index={projectIndex} isActive={isActive} />}
    </motion.group>
  )
}

export default memo(ProjectItem)
