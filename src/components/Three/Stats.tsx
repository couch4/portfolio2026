import { useThree } from '@react-three/fiber'
import { Html, StatsGl } from '@react-three/drei'
import { Text } from '@/components/waywardUI'

const Stats = ({ isStats = false, isWebGPU = false }) => {
  const dpr = useThree((s) => s.viewport.dpr)

  if (!isStats) return null

  const statsInfo = `
    <span>Renderer:</span>
    ${isWebGPU ? 'WebGPU' : 'WebGL'} 
    <span>DPR:</span> 
    ${dpr.toFixed(1)}
  `

  return (
    <>
      <StatsGl trackGPU={!isWebGPU} className="stats" />
      <Html fullscreen className="renderer-label pointer-events-none">
        <Text>{statsInfo}</Text>
      </Html>
    </>
  )
}

export default Stats
