import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion, useCarouselSlot } from 'r3f-motion'
import { MeshPortalMaterial } from '@/components/Three/MeshPortalMaterial'
import { useFrame } from '@react-three/fiber'
import type { BufferAttribute, BufferGeometry, Material, Texture } from 'three'
import { Plane, PlaneHelper, Vector3 } from 'three'
import type { Group } from 'three'
import PortalScene from './PortalScene'
import ProjectHero from './ProjectHero'
import ProjectDetails from './ProjectDetails'
import { geometry } from 'maath'
import { spring } from '@/styles/motion'
import { useCardSize } from '@/hooks'

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
}) => {
  const { modelSettings } = data
  const { cardWidth, cardHeight } = useCardSize()
  const floatY = useRef(0)
  const spinY = useRef(0)
  const outerRef = useRef<Group>(null)
  const rootRef = useRef<Group>(null)

  let carouselSlot
  try {
    carouselSlot = useCarouselSlot()
  } catch {
    carouselSlot = {
      itemIndex: projectIndex,
      slotIndex: 0,
      isNearby: true,
      distance: 0,
      currIndex: useRef(projectIndex),
    }
  }

  const { itemIndex, slotIndex, isNearby, distance, currIndex } = carouselSlot
  const isPre = distance <= 2

  // Stable geometry ref — never let R3F auto-dispose it so the WebGPU index
  // buffer stays alive across React strict-mode remounts and DPR changes.
  // Multiple portal cards share the same NodeMaterial shader/monitor, meaning
  // only the first card per frame gets updateForRender; if geometry is disposed
  // mid-frame the subsequent cards' GPU index buffers are gone → crash.
  const cardGeoRef = useRef<BufferGeometry | null>(null)
  if (!cardGeoRef.current) {
    cardGeoRef.current = new geometry.RoundedPlaneGeometry(
      cardWidth,
      cardHeight,
      0.2,
    ) as unknown as BufferGeometry
  }

  // Update vertex positions/UVs in-place on resize; the index topology is
  // invariant (depends only on `segments`, not width/height) so its GPU
  // buffer never needs to be recreated.
  useEffect(() => {
    const geo = cardGeoRef.current
    if (!geo) return
    const tmp = new geometry.RoundedPlaneGeometry(
      cardWidth,
      cardHeight,
      0.2,
    ) as unknown as BufferGeometry
    const pos = geo.getAttribute('position') as BufferAttribute
    pos.array.set((tmp.getAttribute('position') as BufferAttribute).array)
    pos.needsUpdate = true
    const uv = geo.getAttribute('uv') as BufferAttribute
    uv.array.set((tmp.getAttribute('uv') as BufferAttribute).array)
    uv.needsUpdate = true
    ;(tmp as any).dispose()
  }, [cardWidth, cardHeight])

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

  const handleClick = useCallback(() => {
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

  useFrame(({ clock }) => {
    if (!isNearby) return
    floatY.current = Math.sin(clock.getElapsedTime() * 0.5) * 0.15
    spinY.current = Math.sin(clock.getElapsedTime() * 0.3) * 0.1
  })

  const fboRes = isActive ? 2048 : isNearby ? 1024 : 256

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
        <primitive object={cardGeoRef.current} attach="geometry" />
        {isPre || isActive ? (
          <MeshPortalMaterial resolution={fboRes} blur={0}>
            <PortalScene
              data={data}
              floatY={floatY}
              spinY={spinY}
              outerRef={outerRef}
              isActive={isActive}
              envMap={envMap}
            />
          </MeshPortalMaterial>
        ) : (
          <meshBasicMaterial color="#05080F" />
        )}
      </mesh>
      {isNearby && (
        <ProjectDetails
          data={data}
          index={itemIndex + 1}
          isActive={isZoomed}
          onClick={handleClick}
          onExit={handleExit}
        />
      )}
    </motion.group>
  )
}

export default memo(ProjectItem)
