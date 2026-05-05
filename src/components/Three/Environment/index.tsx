'use client'

import { useThree } from '@react-three/fiber'
import { Environment as DreiEnvironment } from '@react-three/drei'
import type { EnvironmentProps } from '@react-three/drei'
import EnvironmentWebGPU from './EnvironmentWebGPU'

const Environment = (props: EnvironmentProps) => {
  const gl = useThree((s) => s.gl)
  const isWebGPU = (gl as any)?.isWebGPURenderer === true

  if (isWebGPU) return <EnvironmentWebGPU {...props} />
  return <DreiEnvironment {...props} />
}

export default Environment
export type { EnvironmentProps }
