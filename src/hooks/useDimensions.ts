'use client'

import { useState, useEffect } from 'react'
import { getCurrentBreakpoint } from '@/utilities/content'

export default function useDimensions(ref?: any): any {
  const [dimensions, setDimensions] = useState({
    screenWidth: 0,
    screenHeight: 0,
  })
  const [refDimensions, setRefDimensions] = useState({})
  const [breakpoint, setBreakpoint] = useState('base')

  const handleResize = () => {
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    setDimensions({ screenWidth, screenHeight })

    const currBreakpoint = getCurrentBreakpoint(screenWidth)
    setBreakpoint(currBreakpoint)

    if (ref && ref.current) {
      const el = ref.current
      const dims = el.getBoundingClientRect()
      setRefDimensions(domRectToObject(dims))
    }
  }

  useEffect(() => {
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return { ...refDimensions, ...dimensions, breakpoint }
}

const domRectToObject = (rect: DOMRect) => {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
  }
}
