import { Color, ShaderMaterial } from 'three'

// Per-vertex random offset creates a staggered sweep reveal — no positional displacement
const pointsVert = /* glsl */ `
uniform float uProgress;
void main() {
  float r = fract(sin(dot(position.xy, vec2(127.1, 311.7))) * 43758.5453);
  float localP = smoothstep(r * 0.5, 1.0, uProgress);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = localP * 3.5;
}
`

const pointsFrag = /* glsl */ `
uniform float uProgress;
uniform vec3 uColor;
void main() {
  float dist = length(gl_PointCoord - 0.5);
  if (dist > 0.5) discard;
  float r = fract(sin(dot(gl_FragCoord.xy, vec2(127.1, 311.7))) * 43758.5453);
  float localP = smoothstep(r * 0.5, 1.0, uProgress);
  float alpha = smoothstep(0.5, 0.05, dist) * localP;
  gl_FragColor = vec4(uColor, alpha);
}
`

// Wireframe: vRandom interpolated across each segment gives per-edge stagger
const wireVert = /* glsl */ `
uniform float uProgress;
varying float vRandom;
varying float vLocalProgress;
void main() {
  float r = fract(sin(dot(position.xy, vec2(127.1, 311.7))) * 43758.5453);
  vRandom = r;
  vLocalProgress = smoothstep(r * 0.4, 1.0, uProgress);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const wireFrag = /* glsl */ `
uniform float uProgress;
uniform vec3 uColor;
varying float vRandom;
varying float vLocalProgress;
void main() {
  gl_FragColor = vec4(uColor, vLocalProgress * 0.5);
}
`

function makeUniforms(color: string) {
  return {
    uProgress: { value: 0 },
    uColor: { value: new Color(color) },
  }
}

export function createPointsMaterial(color: string): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: makeUniforms(color),
    vertexShader: pointsVert,
    fragmentShader: pointsFrag,
    transparent: true,
    depthWrite: false,
  })
}

export function createWireframeMaterial(color: string): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: makeUniforms(color),
    vertexShader: wireVert,
    fragmentShader: wireFrag,
    transparent: true,
    depthWrite: false,
  })
}
