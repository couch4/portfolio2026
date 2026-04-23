import { Color, ShaderMaterial, Texture } from 'three'

// Replicates Water.js getNoise using textureLod (WebGL2 vertex shader sampling)
// so wave displacement matches the visible water surface exactly.
const WAVE_FN = /* glsl */ `
uniform float uTime;
uniform float uWaveSize;
uniform float uWaveAmplitude;
uniform sampler2D uNormalSampler;

float waveDisplacement(vec2 worldXZ) {
  vec2 uv  = worldXZ * uWaveSize;
  vec2 uv0 = uv / 103.0            + vec2( uTime / 17.0,    uTime / 29.0  );
  vec2 uv1 = uv / 107.0            - vec2( uTime / -19.0,   uTime / 31.0  );
  vec2 uv2 = uv / vec2(8907., 9803.) + vec2( uTime / 101.0,  uTime / 97.0  );
  vec2 uv3 = uv / vec2(1091., 1027.) - vec2( uTime / 109.0,  uTime / -113.0);
  vec4 n = textureLod(uNormalSampler, uv0, 0.0)
         + textureLod(uNormalSampler, uv1, 0.0)
         + textureLod(uNormalSampler, uv2, 0.0)
         + textureLod(uNormalSampler, uv3, 0.0);
  n = n * 0.5 - 1.0;
  // noise.xzy replicates Water.js surfaceNormal swizzle; .y is the vertical component
  return normalize(n.xzy * vec3(1.5, 1.0, 1.5)).y * uWaveAmplitude;
}
`

// Plane is rotation=[-PI/2,0,0], so local Z → world Y
const POINTS_VERT = /* glsl */ `
uniform float uProgress;
${WAVE_FN}
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  float disp    = waveDisplacement(worldPos.xz);
  float r       = fract(sin(dot(position.xy, vec2(127.1, 311.7))) * 43758.5453);
  float localP  = smoothstep(r * 0.5, 1.0, uProgress);
  vec3  pos     = vec3(position.x, position.y, position.z + disp);
  gl_Position   = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize  = localP * 3.0;
}
`

const POINTS_FRAG = /* glsl */ `
uniform float uProgress;
uniform vec3  uColor;
void main() {
  float dist   = length(gl_PointCoord - 0.5);
  if (dist > 0.5) discard;
  float r      = fract(sin(dot(gl_FragCoord.xy, vec2(127.1, 311.7))) * 43758.5453);
  float localP = smoothstep(r * 0.5, 1.0, uProgress);
  gl_FragColor = vec4(uColor, smoothstep(0.5, 0.05, dist) * localP);
}
`

const WIRE_VERT = /* glsl */ `
uniform float uProgress;
${WAVE_FN}
varying float vLocalProgress;
void main() {
  vec4 worldPos  = modelMatrix * vec4(position, 1.0);
  float disp     = waveDisplacement(worldPos.xz);
  float r        = fract(sin(dot(position.xy, vec2(127.1, 311.7))) * 43758.5453);
  vLocalProgress = smoothstep(r * 0.4, 1.0, uProgress);
  vec3 pos       = vec3(position.x, position.y, position.z + disp);
  gl_Position    = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

const WIRE_FRAG = /* glsl */ `
uniform vec3  uColor;
varying float vLocalProgress;
void main() {
  gl_FragColor = vec4(uColor, vLocalProgress * 0.45);
}
`

function makeUniforms(color: string, normalMap: Texture | null) {
  return {
    uProgress:      { value: 0 },
    uColor:         { value: new Color(color) },
    uTime:          { value: 0 },
    uWaveSize:      { value: 1.0 },
    uWaveAmplitude: { value: 2.0 },
    uNormalSampler: { value: normalMap },
  }
}

export function createWaterPointsMaterial(color: string, normalMap: Texture): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: makeUniforms(color, normalMap),
    vertexShader: POINTS_VERT,
    fragmentShader: POINTS_FRAG,
    transparent: true,
    depthWrite: false,
  })
}

export function createWaterWireframeMaterial(color: string, normalMap: Texture): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: makeUniforms(color, normalMap),
    vertexShader: WIRE_VERT,
    fragmentShader: WIRE_FRAG,
    transparent: true,
    depthWrite: false,
  })
}
