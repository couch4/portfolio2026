import { memo } from 'react'
import { BankTrees } from './Trees'
import TreePlanes from './TreePlanes'
import Terrain from './Terrain'
import Water from './Water'
import Atmos from './Atmos'
// import { useSceneStore } from '@/store/sceneStore'

const Scene = () => {
  // const isDevView = useSceneStore((s) => s.isDevView)

  return (
    <>
      <fog attach="fog" args={['#7aaaaa', 50, 500]} />
      <Atmos />
      <Terrain />
      <BankTrees windEnabled />
      {/* <TreePlanes /> */}
      <Water />
    </>
  )
}

export default memo(Scene)
