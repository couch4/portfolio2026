/**
 * WebGPU-specific shader code for MeshPortalMaterial
 *
 * TSL (Three Shading Language) counterpart to PortalMaterialWebGL.
 * Uses NodeMaterial + QuadMesh + RenderTarget instead of
 * ShaderMaterial + FullScreenQuad + WebGLRenderTarget.
 */
import * as THREE from 'three'
import { NodeMaterial, QuadMesh, type Renderer } from 'three/webgpu'
import type Node from 'three/src/nodes/core/Node.js'
import {
  Fn,
  clamp,
  distance,
  float,
  mix,
  round,
  select,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec4,
  screenCoordinate,
} from 'three/tsl'

// TextureNode.uv() exists at runtime in r170 but is absent from the TS defs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const texUv = (node: any, uvNode: any) => node.uv(uvNode) as ReturnType<typeof texture>

// ---------------------------------------------------------------------------
// Portal material  (NodeMaterial with TSL fragment)
// ---------------------------------------------------------------------------
export class PortalMaterialImpl extends NodeMaterial {
  readonly blurUniform = uniform(0)
  readonly sizeUniform = uniform(0)
  readonly blendUniform = uniform(0)
  readonly resolutionUniform = uniform(new THREE.Vector2())
  readonly mapTex = texture(new THREE.Texture())
  readonly sdfTex = texture(new THREE.Texture())

  // Public accessors matching the WebGL interface
  get blur() {
    return this.blurUniform.value as number
  }
  set blur(v: number) {
    this.blurUniform.value = v
  }

  get size() {
    return this.sizeUniform.value as number
  }
  set size(v: number) {
    this.sizeUniform.value = v
  }

  get blend() {
    return this.blendUniform.value as number
  }
  set blend(v: number) {
    this.blendUniform.value = v
  }

  get resolution() {
    return this.resolutionUniform.value as THREE.Vector2
  }
  set resolution(v: THREE.Vector2) {
    this.resolutionUniform.value = v
  }

  get map() {
    return this.mapTex.value as THREE.Texture | null
  }
  set map(v: THREE.Texture | null) {
    this.mapTex.value = v ?? new THREE.Texture()
  }

  get sdf() {
    return this.sdfTex.value as THREE.Texture | null
  }
  set sdf(v: THREE.Texture | null) {
    this.sdfTex.value = v ?? new THREE.Texture()
  }

  constructor() {
    super()
    this.transparent = true

    const blurU = this.blurUniform
    const sizeU = this.sizeUniform
    const mapU = this.mapTex
    const sdfU = this.sdfTex
    const resU = this.resolutionUniform

    // NodeMaterial applies tonemapping + colorspace automatically
    this.fragmentNode = Fn(() => {
      const sUV = screenCoordinate.xy.div(resU)
      const t = texUv(mapU, sUV)
      const k = float(blurU)
      const d = texUv(sdfU, uv()).r.div(sizeU)
      const alpha = float(1).sub(smoothstep(float(0), float(1), clamp(d.div(k).add(1), 0, 1)))
      const finalAlpha = select(k.equal(0), t.a, t.a.mul(alpha))
      return vec4(t.r, t.g, t.b, finalAlpha)
    })()
  }
}

// ---------------------------------------------------------------------------
// SDF generator – TSL / WebGPU render-target version
//
// Uses RenderTarget + QuadMesh + NodeMaterial instead of
// WebGLRenderTarget + FullScreenQuad + ShaderMaterial.
//
// Instead of pack2HalfToRGBA / unpackRGBATo2Half we write to RGFloat
// render targets directly – WebGPU supports float textures natively.
// ---------------------------------------------------------------------------

/** Helper: create a NodeMaterial whose fragmentNode is the given TSL Fn. */
function nodeMat(fragmentFn: () => Node) {
  const mat = new NodeMaterial()
  mat.fragmentNode = fragmentFn()
  return mat
}

export function makeSDFGenerator(clientWidth: number, clientHeight: number, renderer: Renderer) {
  const targets: THREE.RenderTarget[] = []
  const quads: QuadMesh[] = []

  const mkTarget = (opts?: THREE.RenderTargetOptions) => {
    const rt = new THREE.RenderTarget(clientWidth, clientHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      ...opts,
    })
    targets.push(rt)
    return rt
  }

  const mkQuad = (material: THREE.Material) => {
    const q = new QuadMesh(material)
    quads.push(q)
    return q
  }

  const finalTarget = mkTarget({
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.FloatType,
    format: THREE.RedFormat,
    generateMipmaps: true,
  })

  // RG float targets store UV coords directly (no packing needed)
  const outsideRT = mkTarget({ type: THREE.FloatType, format: THREE.RGFormat })
  const insideRT = mkTarget({ type: THREE.FloatType, format: THREE.RGFormat })
  const outsideRT2 = mkTarget({ type: THREE.FloatType, format: THREE.RGFormat })
  const insideRT2 = mkTarget({ type: THREE.FloatType, format: THREE.RGFormat })
  const outsideFinal = mkTarget({ type: THREE.FloatType, format: THREE.RedFormat })
  const insideFinal = mkTarget({ type: THREE.FloatType, format: THREE.RedFormat })

  // --- UV render (outside): output vUv * round(tex.x)
  const uvTexUniform = texture(new THREE.Texture())
  const uvRenderQuad = mkQuad(
    nodeMat(
      Fn(() => {
        const v = uv()
        const mask = round(texUv(uvTexUniform, v).r)
        return vec4(v.x.mul(mask), v.y.mul(mask), float(0), float(1))
      }),
    ),
  )

  // --- UV render (inside): output vUv * (1 - round(tex.x))
  const uvInsideTexUniform = texture(new THREE.Texture())
  const uvRenderInsideQuad = mkQuad(
    nodeMat(
      Fn(() => {
        const v = uv()
        const mask = float(1).sub(round(texUv(uvInsideTexUniform, v).r))
        return vec4(v.x.mul(mask), v.y.mul(mask), float(0), float(1))
      }),
    ),
  )

  // --- Jump-flood pass
  const jfTexUniform = texture(new THREE.Texture())
  const jfOffsetUniform = uniform(0)
  const jfPixelSize = vec2(float(1 / clientWidth), float(1 / clientHeight))

  const jumpFloodQuad = mkQuad(
    nodeMat(
      Fn(() => {
        const v = uv()
        const closestDist = float(9999999.9).toVar()
        const closestX = float(0).toVar()
        const closestY = float(0).toVar()

        // 3×3 neighbourhood search (unrolled)
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            const off = vec2(float(x), float(y)).mul(jfPixelSize).mul(jfOffsetUniform)
            const sampleUV = v.add(off)
            const s = texUv(jfTexUniform, sampleUV)
            const pos = vec2(s.r, s.g)
            const d = distance(pos, v)
            // If the sample is non-zero and closer, keep it
            const valid = pos.x.notEqual(0).or(pos.y.notEqual(0))
            const closer = d.lessThan(closestDist)
            const pick = valid.and(closer)
            closestDist.assign(select(pick, d, closestDist))
            closestX.assign(select(pick, pos.x, closestX))
            closestY.assign(select(pick, pos.y, closestY))
          }
        }

        return vec4(closestX, closestY, float(0), float(1))
      }),
    ),
  )

  // --- Distance-field pass
  const dfTexUniform = texture(new THREE.Texture())
  const dfSize = vec2(float(clientWidth), float(clientHeight))

  const distFieldQuad = mkQuad(
    nodeMat(
      Fn(() => {
        const v = uv()
        const s = texUv(dfTexUniform, v)
        const pos = vec2(s.r, s.g)
        const d = distance(dfSize.mul(pos), dfSize.mul(v))
        return vec4(d, float(0), float(0), float(1))
      }),
    ),
  )

  // --- Composite pass (inside/outside → signed distance)
  const compTexUniform = texture(new THREE.Texture())
  const compInsideUniform = texture(insideFinal.texture)
  const compOutsideUniform = texture(outsideFinal.texture)

  const compositeQuad = mkQuad(
    nodeMat(
      Fn(() => {
        const v = uv()
        const i = texUv(compInsideUniform, v).r
        const o = texUv(compOutsideUniform, v).r
        const mask = texUv(compTexUniform, v).r
        return select(
          mask.equal(0),
          vec4(o, float(0), float(0), float(1)),
          vec4(i.negate(), float(0), float(0), float(1)),
        )
      }),
    ),
  )

  // --- Generate SDF ---
  const generate = (image: THREE.Texture) => {
    image.minFilter = THREE.NearestFilter
    image.magFilter = THREE.NearestFilter

    uvTexUniform.value = image
    renderer.setRenderTarget(outsideRT)
    uvRenderQuad.render(renderer)

    const passes = Math.ceil(Math.log(Math.max(clientWidth, clientHeight)) / Math.log(2))
    let lastTarget = outsideRT
    let target: THREE.RenderTarget | null = null

    for (let i = 0; i < passes; i++) {
      const offset = Math.pow(2, passes - i - 1)
      target = lastTarget === outsideRT ? outsideRT2 : outsideRT
      jfOffsetUniform.value = offset
      jfTexUniform.value = lastTarget.texture
      renderer.setRenderTarget(target)
      jumpFloodQuad.render(renderer)
      lastTarget = target
    }

    dfTexUniform.value = target!.texture
    renderer.setRenderTarget(outsideFinal)
    distFieldQuad.render(renderer)

    // Inside pass
    uvInsideTexUniform.value = image
    renderer.setRenderTarget(insideRT)
    uvRenderInsideQuad.render(renderer)
    lastTarget = insideRT

    for (let i = 0; i < passes; i++) {
      const offset = Math.pow(2, passes - i - 1)
      target = lastTarget === insideRT ? insideRT2 : insideRT
      jfOffsetUniform.value = offset
      jfTexUniform.value = lastTarget.texture
      renderer.setRenderTarget(target)
      jumpFloodQuad.render(renderer)
      lastTarget = target
    }

    dfTexUniform.value = target!.texture
    renderer.setRenderTarget(insideFinal)
    distFieldQuad.render(renderer)

    // Composite
    compTexUniform.value = image
    renderer.setRenderTarget(finalTarget)
    compositeQuad.render(renderer)
    renderer.setRenderTarget(null)

    return finalTarget
  }

  generate.dispose = () => {
    targets.forEach((t) => t.dispose())
    quads.forEach((q) => {
      const mat = q.material
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else mat?.dispose()
      q.geometry?.dispose()
    })
  }

  return generate
}

// ---------------------------------------------------------------------------
// Blend quad factory – used by ManagePortalScene for cross-fade
// ---------------------------------------------------------------------------
export function createBlendQuad(buffer1Texture: THREE.Texture, buffer2Texture: THREE.Texture) {
  const blendValue = { value: 0 }
  const blendU = uniform(0)
  const aU = texture(buffer1Texture)
  const bU = texture(buffer2Texture)

  const mat = new NodeMaterial()
  mat.fragmentNode = Fn(() => {
    const v = uv()
    const ta = texUv(aU, v)
    const tb = texUv(bU, v)
    return mix(tb, ta, blendU)
  })()

  const q = new QuadMesh(mat)

  // Proxy so the caller can set blendValue.value and it updates the uniform
  return [
    q,
    new Proxy(blendValue, {
      set(obj, prop, value) {
        if (prop === 'value') {
          blendU.value = value
          obj.value = value
        }
        return true
      },
    }),
  ] as const
}
