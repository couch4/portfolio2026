'use client'
import React from 'react'
import type { Page } from '@/payload-types'

type Props = {
  page: Page
}

const r3fBlockComponents: Record<string, React.FC<any>> = {
  // e.g. heroBlock: HeroR3FBlock,
}

const RenderR3FBlocks: React.FC<Props> = ({ page }) => {
  const { layout } = page

  if (!layout || !Array.isArray(layout) || layout.length === 0) return null

  return (
    <>
      {layout.map((block, index) => {
        const { blockType } = block as { blockType: string }
        const Block = r3fBlockComponents[blockType]
        if (!Block) return null
        return <Block key={index} {...block} />
      })}
    </>
  )
}

export default RenderR3FBlocks
