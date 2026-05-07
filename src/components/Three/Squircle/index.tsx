import { FC, useEffect, useMemo } from 'react'
import * as THREE from 'three'

interface SquircleProps {
  width?: number
  height?: number
  radius?: number
  segments?: number
  barrelDistortion?: boolean
  children?: React.ReactNode
}

const Squircle: FC<SquircleProps> = ({
  width = 1,
  height = 1,
  radius = 0.2,
  segments = 128,
  barrelDistortion: isBarrelDistortion = true,
  children,
}) => {
  const barrelDistortion = isBarrelDistortion ? radius * 0.08 : 0

  const geometry = useMemo(() => {
    const hw = width / 2
    const hh = height / 2
    const r = Math.max(0, Math.min(radius, hw - 0.001, hh - 0.001))
    const exp = 0.5 // L4-norm squircle: x^4 + y^4 = 1 → x^0.5 parameterization

    const vertices: number[] = []
    const uvs: number[] = []

    // Corner definitions: [centreX, centreY, t0, t1]
    const corners = [
      [hw - r, hh - r, 0, Math.PI / 2], // TR
      [-hw + r, hh - r, Math.PI / 2, Math.PI], // TL
      [-hw + r, -hh + r, Math.PI, (Math.PI * 3) / 2], // BL
      [hw - r, -hh + r, (Math.PI * 3) / 2, Math.PI * 2], // BR
    ]

    // Edge definitions: [startX, startY, endX, endY]
    const edges = [
      [hw - r, hh, -hw + r, hh], // top
      [-hw, hh - r, -hw, -hh + r], // left
      [-hw + r, -hh, hw - r, -hh], // bottom
      [hw, -hh + r, hw, hh - r], // right
    ]

    const segPerSection = Math.floor(segments / 4)
    const cornerSegs = Math.ceil(segPerSection * 0.8)
    const edgeSegs = Math.floor(segPerSection * 0.2)
    const peakFrac = (cornerSegs + edgeSegs / 2) / (cornerSegs + edgeSegs)

    // Generate perimeter: 4 sections of corner + edge
    for (let section = 0; section < 4; section++) {
      const [cx, cy, t0, t1] = corners[section]

      // Corner arc: cornerSegs+1 points (including both endpoints)
      for (let j = 0; j <= cornerSegs; j++) {
        const t = t0 + (j / cornerSegs) * (t1 - t0)
        let x = cx + r * Math.sign(Math.cos(t)) * Math.pow(Math.abs(Math.cos(t)), exp)
        let y = cy + r * Math.sign(Math.sin(t)) * Math.pow(Math.abs(Math.sin(t)), exp)

        if (barrelDistortion !== 0) {
          const localFrac = j / (cornerSegs + edgeSegs)
          const factor = 0.5 * (1 + Math.cos(2 * Math.PI * (localFrac - peakFrac)))
          const len = Math.sqrt(x * x + y * y)
          if (len > 0) {
            x += (x / len) * barrelDistortion * factor
            y += (y / len) * barrelDistortion * factor
          }
        }

        vertices.push(x, y, 0)
        uvs.push((x + hw) / width, (y + hh) / height)
      }

      // Edge: straight line with edgeSegs+1 points (including both endpoints)
      const [sx, sy, ex, ey] = edges[section]
      for (let k = 1; k <= edgeSegs; k++) {
        const v = k / edgeSegs
        let x = sx + (ex - sx) * v
        let y = sy + (ey - sy) * v

        if (barrelDistortion !== 0) {
          const localFrac = (cornerSegs + k) / (cornerSegs + edgeSegs)
          const factor = 0.5 * (1 + Math.cos(2 * Math.PI * (localFrac - peakFrac)))
          const len = Math.sqrt(x * x + y * y)
          if (len > 0) {
            x += (x / len) * barrelDistortion * factor
            y += (y / len) * barrelDistortion * factor
          }
        }

        vertices.push(x, y, 0)
        uvs.push((x + hw) / width, (y + hh) / height)
      }
    }

    // Center vertex for fan triangulation
    const centerIdx = vertices.length / 3
    vertices.push(0, 0, 0)
    uvs.push(0.5, 0.5)

    // Fan triangulation from center
    const indices: number[] = []
    const perimeterCount = centerIdx
    for (let i = 0; i < perimeterCount; i++) {
      indices.push(centerIdx, i, (i + 1) % perimeterCount)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    geo.computeVertexNormals()

    return geo
  }, [width, height, radius, segments, barrelDistortion])

  useEffect(() => () => geometry.dispose(), [geometry])

  return <mesh geometry={geometry}>{children}</mesh>
}

export default Squircle
