import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion, useCarouselSlot } from 'r3f-motion'
import { MeshPortalMaterial } from '@/components/Three/MeshPortalMaterial'
import { useFrame } from '@react-three/fiber'
import type { BufferGeometry, Material, Texture } from 'three'
import { Plane, PlaneHelper, Vector3 } from 'three'
import type { Group } from 'three'
import PortalScene from './PortalScene'
import ProjectHero from './ProjectHero'
import ProjectDetails from './ProjectDetails'
import { spring } from '@/styles/motion'
import { useCardSize } from '@/hooks'
import { useSceneStore } from '@/store/sceneStore'
import Squircle from '@/components/Three/Squircle'

const ProjectItem = ({
  data,
  debug = false,
  isActive = false,
  isZoomed = false,
  projectIndex = 1,
  onClick,
  index,
  envMap,
  totalItems,
  activeIndex,
  sharedGeo,
  placeholderMat,
  getBackdropResources,
  ...props
}: {
  data: any
  debug?: boolean
  isActive?: boolean
  isZoomed?: boolean
  projectIndex?: number
  onClick?: (index: number) => void
  index: number
  envMap?: Texture
  totalItems?: number
  activeIndex?: number
  sharedGeo?: BufferGeometry
  placeholderMat?: Material
  getBackdropResources?: (url: string) => {
    material: Material | null
    blurredDataUrl: string | null
  }
}) => {
  const { modelSettings, align } = data
  const { cardWidth, cardHeight } = useCardSize()
  const outerRef = useRef<Group>(null)
  const portalRef = useRef<Group>(null)
  const rootRef = useRef<Group>(null)

  let posX = 0
  if (modelSettings?.position) {
    posX = align === 'left' ? -modelSettings.position[0] : modelSettings.position[0]
  }

  // Spring state runs entirely inside useFrame — no external rAF, no restDelta snap.
  const heroZ = useRef({ cur: 0, vel: 0, target: 0 })
  const heroX = useRef({ cur: 0, vel: 0, target: 0 })

  useEffect(() => {
    heroZ.current.target = isActive ? 5 : 0
    heroX.current.target = isActive ? posX * 2 : 0
  }, [isActive, posX])

  const isSwiping = useSceneStore((s) => s.isSwiping)

  const currIndexRef = useRef(projectIndex)

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

  let carouselSlot
  try {
    carouselSlot = useCarouselSlot()
  } catch {
    carouselSlot = {
      itemIndex: projectIndex,
      slotIndex: 0,
      isNearby: true,
      distance: 0,
      currIndex: currIndexRef,
    }
  }

  const { itemIndex, slotIndex, isNearby, distance, currIndex } = carouselSlot
  const isPre = distance <= 2
  const isCentral = distance === 0 || isActive

  useEffect(() => {
    return () => {
      planeHelpers.forEach((h) => {
        h.geometry.dispose()
        ;(h.material as Material).dispose()
      })
    }
  }, [planeHelpers])

  const handleClick = useCallback(() => {
    console.log('CLICKED', itemIndex)

    if (distance === 0 && !isZoomed) {
      onClick?.(itemIndex)
    }
  }, [onClick, itemIndex, distance, isZoomed])

  const handleExit = useCallback(() => {
    onClick?.(itemIndex)
  }, [onClick])

  const isRightSide = useMemo(() => {
    if (activeIndex === undefined || !totalItems) return false
    const clockwiseDist = (index - activeIndex + totalItems) % totalItems
    const counterClockwiseDist = (activeIndex - index + totalItems) % totalItems
    return clockwiseDist < counterClockwiseDist
  }, [index, activeIndex, totalItems])

  useFrame(({ clock }, delta) => {
    if (!isNearby) return
    const dt = Math.min(delta, 0.05)
    const step = (s: { cur: number; vel: number; target: number }) => {
      const acc = -600 * (s.cur - s.target) - 100 * s.vel
      s.vel += acc * dt
      s.cur += s.vel * dt
      if (Math.abs(s.cur - s.target) < 0.0005 && Math.abs(s.vel) < 0.001) {
        s.cur = s.target
        s.vel = 0
      }
    }
    // step(heroZ.current)
    // step(heroX.current)
    const fy = isActive && modelSettings?.floatY ? Math.sin(clock.getElapsedTime() * 0.5) * 0.15 : 0
    const sy = isActive && modelSettings?.spinY ? Math.sin(clock.getElapsedTime() * 0.3) * 0.1 : 0
    const apply = (g: Group | null) => {
      if (!g) return
      g.position.set(heroX.current.cur, fy, heroZ.current.cur)
      g.rotation.y = sy
    }
    apply(outerRef.current)
    apply(portalRef.current)
  })

  // Flick-aware fboRes ladder: idle/drag keeps full quality, high-velocity swipes drop res
  const fboRes = isSwiping
    ? isActive
      ? 768
      : isNearby
        ? 192
        : 0
    : isActive
      ? 1024
      : isNearby
        ? 384
        : 0

  return (
    <motion.group
      ref={rootRef}
      {...props}
      initial={false}
      onClick={handleClick}
      animate={{
        z: isActive ? 4 : 0,
        x: isNearby && isZoomed && !isActive ? (isRightSide ? 20 : -20) : 0,
      }}
      transition={spring}
    >
      {isNearby && (
        <>
          <ProjectHero data={data} heroGroupRef={outerRef} posX={posX} />
          {planeHelpers.map((helper, i) => (
            <primitive key={i} object={helper} />
          ))}
        </>
      )}

      <Squircle width={cardWidth * 0.98} height={cardHeight} radius={1}>
        {isPre ? (
          <MeshPortalMaterial resolution={fboRes} blur={0}>
            <PortalScene
              data={data}
              heroGroupRef={portalRef}
              posX={posX}
              isCentral={isCentral}
              envMap={envMap}
              getBackdropResources={getBackdropResources}
            />
          </MeshPortalMaterial>
        ) : (
          <primitive object={placeholderMat!} attach="material" />
        )}
      </Squircle>
      {isNearby && (
        <ProjectDetails
          data={data}
          index={itemIndex + 1}
          isActive={isZoomed && isActive}
          onClick={handleClick}
          onExit={handleExit}
        />
      )}
    </motion.group>
  )
}

export default memo(ProjectItem)
