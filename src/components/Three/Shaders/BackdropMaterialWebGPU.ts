import * as THREE from 'three'
import { NodeMaterial } from 'three/webgpu'
import { Fn, dot, float, floor, fract, mix, texture, uniform, uv, vec2 } from 'three/tsl'

function makePlaceholder(): THREE.DataTexture {
  const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat)
  t.needsUpdate = true
  return t
}

const texSample = (node: any, uvNode: any) => node.uv(uvNode)

export function createBackdropNodeMaterial() {
  const uTimeU = uniform(0)
  const texNode = texture(makePlaceholder())

  const colorNode = Fn(() => {
    const t = uTimeU.mul(float(0.08))
    const v = uv()

    // Trig-free hash — TSL port of the GLSL version in BackdropMaterial.ts
    const hashFn = (p: any) => {
      const q = fract(p.mul(vec2(float(443.8975), float(397.2973))))
      const r = q.add(dot(q, q.add(float(19.19))))
      return fract(r.x.mul(r.y))
    }

    const noiseFn = (p: any) => {
      const i = floor(p)
      const f = fract(p)
      const blend = f.mul(f).mul(float(3).sub(f.mul(2)))
      return mix(
        mix(hashFn(i), hashFn(i.add(vec2(float(1), float(0)))), blend.x),
        mix(
          hashFn(i.add(vec2(float(0), float(1)))),
          hashFn(i.add(vec2(float(1), float(1)))),
          blend.x,
        ),
        blend.y,
      )
    }

    // Two independent noise fields offset in different directions — gives
    // the bulging/waving feel without any rotational symmetry
    const dx = noiseFn(v.mul(float(2.5)).add(vec2(t.mul(float(0.15)), t.mul(float(0.07))))).sub(
      float(0.5),
    )
    const dy = noiseFn(v.mul(float(2.5)).add(vec2(t.mul(float(0.09)), t.mul(float(0.13))))).sub(
      float(0.5),
    )

    return texSample(texNode, v.add(vec2(dx, dy).mul(float(0.3))))
  })()

  const mat = new NodeMaterial()
  mat.fog = true
  mat.colorNode = colorNode

  Object.defineProperty(mat, 'uTime', {
    get: () => uTimeU.value as number,
    set: (v: number) => {
      uTimeU.value = v
    },
    configurable: true,
  })

  Object.defineProperty(mat, 'uTexture', {
    get: () => texNode.value as THREE.Texture | null,
    set: (v: THREE.Texture | null) => {
      texNode.value = v ?? makePlaceholder()
    },
    configurable: true,
  })

  return mat
}
