'use client'
import React, { useEffect } from 'react'
import type { Page } from '@/payload-types'
import { useSceneStore } from '@/store/sceneStore'
import RenderR3FBlocks from '@/blocks/RenderR3FBlocks'

type Props = {
  page: Page
}

const PageClient: React.FC<Props> = ({ page }) => {
  const setSceneContent = useSceneStore((s) => s.setSceneContent)

  useEffect(() => {
    setSceneContent(<RenderR3FBlocks page={page} />)
    return () => setSceneContent(null)
  }, [page, setSceneContent])

  return null
}

export default PageClient
