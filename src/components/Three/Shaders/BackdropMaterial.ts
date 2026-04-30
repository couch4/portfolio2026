import { shaderMaterial } from '@react-three/drei'
import { Texture, UniformsLib, UniformsUtils } from 'three'

export const BackdropMaterial = shaderMaterial(
  {
    uTime: 0,
    uTexture: null as unknown as Texture,
  },
  /*glsl*/ `
    #include <fog_pars_vertex>
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }
  `,
  /*glsl*/ `
    #include <fog_pars_fragment>
    uniform float uTime;
    uniform sampler2D uTexture;
    varying vec2 vUv;

    // Trig-free hash
    float hash(vec2 p) {
      p = fract(p * vec2(443.8975, 397.2973));
      p += dot(p, p + 19.19);
      return fract(p.x * p.y);
    }

    // Smooth value noise
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i),                  hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    void main() {
      float t = uTime * 0.08;

      // Two independent noise fields offset in different directions — gives
      // the bulging/waving feel without any rotational symmetry
      float dx = noise(vUv * 2.5 + vec2(t * 0.15, t * 0.07)) - 0.5;
      float dy = noise(vUv * 2.5 + vec2(t * 0.09, t * 0.13)) - 0.5;

      // Keep displacement very subtle so it reads as gentle motion, not distortion
      vec2 distortedUv = vUv + vec2(dx, dy) * 0.3;

      gl_FragColor = texture2D(uTexture, distortedUv);
      #include <fog_fragment>
    }
  `,
  (self) => {
    if (!self) return
    ;(self as any).fog = true
    Object.assign(self.uniforms, UniformsUtils.clone(UniformsLib.fog))
  },
)
