import { shaderMaterial } from '@react-three/drei'
import { Vector2 } from 'three'

export const InkMaterial = shaderMaterial(
  {
    iResolution: new Vector2(0.5, 1),
  },
  // vertex shader
  /*glsl*/ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // fragment shader
  /*glsl*/ `    


  `,
)
