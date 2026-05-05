/**
 * WebGL-specific shader code for MeshPortalMaterial
 *
 * Contains the GLSL portal material, SDF generator, and blend-quad factory —
 * everything that relies on WebGLRenderer / ShaderMaterial / FullScreenQuad.
 */
import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { FullScreenQuad } from 'three-stdlib'

// Three.js revision ≥ 154 uses colorspace_fragment
const COLORSPACE_FRAG = 'colorspace_fragment'

// ---------------------------------------------------------------------------
// Shader material
// ---------------------------------------------------------------------------
export const PortalMaterialImpl = shaderMaterial(
  {
    blur: 0,
    map: null,
    sdf: null,
    blend: 0,
    size: 0,
    resolution: new THREE.Vector2(),
  },
  /* vertex */ `
    varying vec2 vUv;
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vUv = uv;
    }
  `,
  /* fragment */ `
    uniform sampler2D sdf;
    uniform sampler2D map;
    uniform float blur;
    uniform float size;
    uniform float time;
    uniform vec2 resolution;
    varying vec2 vUv;
    #include <packing>
    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec4 t = texture2D(map, uv);
      float k = blur;
      float d = texture2D(sdf, vUv).r / size;
      float alpha = 1.0 - smoothstep(0.0, 1.0, clamp(d / k + 1.0, 0.0, 1.0));
      gl_FragColor = vec4(t.rgb, blur == 0.0 ? t.a : t.a * alpha);
      #include <tonemapping_fragment>
      #include <${COLORSPACE_FRAG}>
    }
  `,
)

// ---------------------------------------------------------------------------
// SDF generator – creates temporary GPU resources & disposes them after use
// ---------------------------------------------------------------------------
export function makeSDFGenerator(
  clientWidth: number,
  clientHeight: number,
  renderer: THREE.WebGLRenderer,
) {
  const targets: THREE.WebGLRenderTarget[] = []
  const quads: FullScreenQuad[] = []

  const mkTarget = (opts?: THREE.RenderTargetOptions) => {
    const rt = new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      ...opts,
    })
    targets.push(rt)
    return rt
  }

  const mkQuad = (material: THREE.ShaderMaterial) => {
    const q = new FullScreenQuad(material)
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
  const outsideRenderTarget = mkTarget()
  const insideRenderTarget = mkTarget()
  const outsideRenderTarget2 = mkTarget()
  const insideRenderTarget2 = mkTarget()
  const outsideRenderTargetFinal = mkTarget({ type: THREE.FloatType, format: THREE.RedFormat })
  const insideRenderTargetFinal = mkTarget({ type: THREE.FloatType, format: THREE.RedFormat })

  const uvRender = mkQuad(
    new THREE.ShaderMaterial({
      uniforms: { tex: { value: null } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tex; varying vec2 vUv;
        #include <packing>
        void main(){gl_FragColor=pack2HalfToRGBA(vUv*(round(texture2D(tex,vUv).x)));}`,
    }),
  )

  const uvRenderInside = mkQuad(
    new THREE.ShaderMaterial({
      uniforms: { tex: { value: null } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tex; varying vec2 vUv;
        #include <packing>
        void main(){gl_FragColor=pack2HalfToRGBA(vUv*(1.0-round(texture2D(tex,vUv).x)));}`,
    }),
  )

  const jumpFloodRender = mkQuad(
    new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: null },
        offset: { value: 0 },
        level: { value: 0 },
        maxSteps: { value: 0 },
      },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv; uniform sampler2D tex; uniform float offset; uniform float level; uniform float maxSteps;
        #include <packing>
        void main(){
          float closestDist=9999999.9; vec2 closestPos=vec2(0.0);
          for(float x=-1.0;x<=1.0;x+=1.0){for(float y=-1.0;y<=1.0;y+=1.0){
            vec2 voffset=vUv+vec2(x,y)*vec2(${1 / clientWidth},${1 / clientHeight})*offset;
            vec2 pos=unpackRGBATo2Half(texture2D(tex,voffset));
            float dist=distance(pos.xy,vUv);
            if(pos.x!=0.0&&pos.y!=0.0&&dist<closestDist){closestDist=dist;closestPos=pos;}
          }}
          gl_FragColor=pack2HalfToRGBA(closestPos);
        }`,
    }),
  )

  const distanceFieldRender = mkQuad(
    new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: null },
        size: { value: new THREE.Vector2(clientWidth, clientHeight) },
      },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv; uniform sampler2D tex; uniform vec2 size;
        #include <packing>
        void main(){gl_FragColor=vec4(distance(size*unpackRGBATo2Half(texture2D(tex,vUv)),size*vUv),0.0,0.0,0.0);}`,
    }),
  )

  const compositeRender = mkQuad(
    new THREE.ShaderMaterial({
      uniforms: {
        inside: { value: insideRenderTargetFinal.texture },
        outside: { value: outsideRenderTargetFinal.texture },
        tex: { value: null },
      },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv; uniform sampler2D inside; uniform sampler2D outside; uniform sampler2D tex;
        #include <packing>
        void main(){
          float i=texture2D(inside,vUv).x; float o=texture2D(outside,vUv).x;
          if(texture2D(tex,vUv).x==0.0){gl_FragColor=vec4(o,0.0,0.0,0.0);}
          else{gl_FragColor=vec4(-i,0.0,0.0,0.0);}
        }`,
    }),
  )

  const generate = (image: THREE.Texture) => {
    image.minFilter = THREE.NearestFilter
    image.magFilter = THREE.NearestFilter
    uvRender.material.uniforms.tex.value = image
    renderer.setRenderTarget(outsideRenderTarget)
    uvRender.render(renderer)
    const passes = Math.ceil(Math.log(Math.max(clientWidth, clientHeight)) / Math.log(2))
    let lastTarget: THREE.WebGLRenderTarget = outsideRenderTarget
    let target: THREE.WebGLRenderTarget | null = null
    for (let i = 0; i < passes; i++) {
      const offset = Math.pow(2, passes - i - 1)
      target = lastTarget === outsideRenderTarget ? outsideRenderTarget2 : outsideRenderTarget
      jumpFloodRender.material.uniforms.level.value = i
      jumpFloodRender.material.uniforms.maxSteps.value = passes
      jumpFloodRender.material.uniforms.offset.value = offset
      jumpFloodRender.material.uniforms.tex.value = lastTarget.texture
      renderer.setRenderTarget(target)
      jumpFloodRender.render(renderer)
      lastTarget = target
    }
    renderer.setRenderTarget(outsideRenderTargetFinal)
    distanceFieldRender.material.uniforms.tex.value = target!.texture
    distanceFieldRender.render(renderer)
    uvRenderInside.material.uniforms.tex.value = image
    renderer.setRenderTarget(insideRenderTarget)
    uvRenderInside.render(renderer)
    lastTarget = insideRenderTarget
    for (let i = 0; i < passes; i++) {
      const offset = Math.pow(2, passes - i - 1)
      target = lastTarget === insideRenderTarget ? insideRenderTarget2 : insideRenderTarget
      jumpFloodRender.material.uniforms.level.value = i
      jumpFloodRender.material.uniforms.maxSteps.value = passes
      jumpFloodRender.material.uniforms.offset.value = offset
      jumpFloodRender.material.uniforms.tex.value = lastTarget.texture
      renderer.setRenderTarget(target)
      jumpFloodRender.render(renderer)
      lastTarget = target
    }
    renderer.setRenderTarget(insideRenderTargetFinal)
    distanceFieldRender.material.uniforms.tex.value = target!.texture
    distanceFieldRender.render(renderer)
    renderer.setRenderTarget(finalTarget)
    compositeRender.material.uniforms.tex.value = image
    compositeRender.render(renderer)
    renderer.setRenderTarget(null)
    return finalTarget
  }

  // Expose dispose so caller can free SDF resources
  generate.dispose = () => {
    targets.forEach((t) => t.dispose())
    quads.forEach((q) => {
      q.material.dispose()
      q.dispose()
    })
  }

  return generate
}

// ---------------------------------------------------------------------------
// Blend quad factory – used by ManagePortalScene for cross-fade
// ---------------------------------------------------------------------------
export function createBlendQuad(buffer1Texture: THREE.Texture, buffer2Texture: THREE.Texture) {
  const blend = { value: 0 }
  const q = new FullScreenQuad(
    new THREE.ShaderMaterial({
      uniforms: {
        a: { value: buffer1Texture },
        b: { value: buffer2Texture },
        blend,
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D a; uniform sampler2D b; uniform float blend; varying vec2 vUv;
        #include <packing>
        void main() {
          vec4 ta = texture2D(a, vUv);
          vec4 tb = texture2D(b, vUv);
          gl_FragColor = mix(tb, ta, blend);
          #include <tonemapping_fragment>
          #include <${COLORSPACE_FRAG}>
        }`,
    }),
  )
  return [q, blend] as const
}
