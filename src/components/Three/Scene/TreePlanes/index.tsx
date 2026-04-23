import { FC } from 'react'
import TreePlane from './TreePlane'

const urls = ['textures/leftTreePlane.png', 'textures/rightTreePlane.png']
const positions = [
  [145, 50, 280],
  [-185, 50, 250],
]

const TreePlanes: FC = () => {
  return urls.map((url, index) => (
    <TreePlane
      key={`treePlane${index}`}
      url={url}
      position={positions[index]}
      rotation={[0, Math.PI, 0]}
      scale={[40, 20, 0]}
    />
  ))
}

export default TreePlanes
