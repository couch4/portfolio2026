'use client'
import { Three } from './index'

// import dynamic from 'next/dynamic'

// const Three = dynamic(() => import('@/components/Three'), { ssr: false })

export default function ThreeClientWrapper() {
  return <Three />
}
