import * as THREE from 'three'

// ---------------------------------------------------------------------------
// GrassGroundMaterial
//
// Raymarched grass shader adapted from a Shadertoy technique.
// A ray is cast from the camera through each surface fragment into a noise
// height field to find where the grass top surface is, giving natural
// per-blade occlusion and depth. All time/wind animation removed.
//
// Technique:
//   1. Terrain height from 3-octave FBM noise.
//   2. Grass height = terrain height + per-position noise layer.
//   3. Ray from camera → surface fragment, march upward through grass volume.
//   4. Occlusion derived from how deep inside the grass volume the hit is.
//   5. Color patches via type masks (fnoise at different scales).
//   6. Fog applied at the end.
// ---------------------------------------------------------------------------

const vertexShader = /* glsl */ `
precision mediump float;

varying vec3  vWorldPos;
varying float vFogDepth;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;

  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vFogDepth  = -mvPos.z;

  gl_Position = projectionMatrix * mvPos;
}
`

const fragmentShader = /* glsl */ `
precision highp float;

// ── Uniforms ─────────────────────────────────────────────────────────────────
uniform vec3  uCameraPos;

uniform vec3  uCol1;      // base grass colour
uniform vec3  uCol2;      // dry/warm patch colour
uniform vec3  uCol3;      // bright highlight patch
uniform vec3  uCol4;      // accent patch (flower-like)

uniform float uAmbient;       // ambient brightness (0–1)
uniform float uGScale;        // noise frequency for grass height variation
uniform float uGHeight;       // max grass blade height in world units
uniform float uTerrainScale;  // noise frequency for terrain undulation
uniform float uTerrainHeight; // peak terrain height variation

uniform float uFogNear;
uniform float uFogFar;
uniform vec3  uFogColor;

// ── Varyings ─────────────────────────────────────────────────────────────────
varying vec3  vWorldPos;
varying float vFogDepth;

// ── Hash & noise ─────────────────────────────────────────────────────────────
float hash(in float p) { return fract(sin(p) * 43758.2317); }
float hash(in vec2 p)  { return hash(dot(p, vec2(87.1, 313.7))); }

float noise(in vec2 p) {
  vec2 F = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(F),              hash(F + vec2(1.0, 0.0)), f.x),
    mix(hash(F + vec2(0.0, 1.0)), hash(F + vec2(1.0)), f.x), f.y);
}

float fnoise(in vec2 p) {
  return 0.5 * noise(p) + 0.25 * noise(p * 2.03) + 0.125 * noise(p * 3.99);
}

// ── Height fields ─────────────────────────────────────────────────────────────
float terrainHeight(in vec2 p) {
  float n = fnoise(p * uTerrainScale);
  return (n - 0.5) * uTerrainHeight;
}

float grassHeight(in vec3 p) {
  float baseH = terrainHeight(p.xz);
  return baseH - noise(p.xz * uGScale) * uGHeight;
}

// ── Grass color ───────────────────────────────────────────────────────────────
vec3 shadeGrass(in vec3 pos, float occlusion) {
  float typemask1 = fnoise(2.5  * pos.xz);
  float typemask2 = pow(fnoise(0.4 * pos.xz), 3.0);
  float typemask3 = step(0.71, fnoise(0.8 * pos.xz));
  vec3 color = mix(mix(mix(uCol1, uCol2, typemask1), uCol3, typemask2), uCol4, typemask3);
  color *= uAmbient * occlusion;
  return color;
}

void main() {
  // Ray from camera to this surface fragment
  vec3 rayOrigin = uCameraPos;
  vec3 rayDir    = normalize(vWorldPos - uCameraPos);

  // March from the terrain surface upward through the grass volume.
  // Start at the terrain hit (vWorldPos) and step along the ray.
  float cGrassMaxDist = uGHeight * 2.0;
  float cRGSlope = 1.0 / (uGScale * uGHeight);
  int   cSteps   = 32;

  float L    = 0.0;
  float Lmax = cGrassMaxDist;
  vec3  hitPos = vWorldPos;

  for (int i = 0; i < cSteps; ++i) {
    vec3 pos = vWorldPos + rayDir * L;
    float h = grassHeight(pos);
    float dh = pos.y - h;
    if (dh < 0.005 * max(L, 0.1)) break;
    L += dh * cRGSlope;
    if (L > Lmax) break;
    hitPos = pos;
  }

  float occlusion = 1.0 - 2.0 * (terrainHeight(hitPos.xz) - hitPos.y) / uGHeight;
  occlusion = (L > Lmax) ? 1.0 : min(1.0, occlusion);

  vec3 color = shadeGrass(hitPos, occlusion);

  // ── Fog ─────────────────────────────────────────────────────────────────
  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
  color = mix(color, uFogColor, fogFactor);

  gl_FragColor = vec4(color, 1.0);
}
`

// ---------------------------------------------------------------------------
// Uniforms factory
// ---------------------------------------------------------------------------
export interface GrassGroundUniforms {
  uCameraPos: { value: THREE.Vector3 }
  uCol1: { value: THREE.Color }
  uCol2: { value: THREE.Color }
  uCol3: { value: THREE.Color }
  uCol4: { value: THREE.Color }
  uAmbient: { value: number }
  uGScale: { value: number }
  uGHeight: { value: number }
  uTerrainScale: { value: number }
  uTerrainHeight: { value: number }
  uFogNear: { value: number }
  uFogFar: { value: number }
  uFogColor: { value: THREE.Color }
}

export function createGrassGroundUniforms(
  overrides: Partial<{
    col1: string
    col2: string
    col3: string
    col4: string
    ambient: number
    gScale: number
    gHeight: number
    terrainScale: number
    terrainHeight: number
    fogNear: number
    fogFar: number
    fogColor: string
  }> = {},
): GrassGroundUniforms {
  return {
    uCameraPos: { value: new THREE.Vector3() },
    uCol1: { value: new THREE.Color(overrides.col1 ?? '#99de80') },
    uCol2: { value: new THREE.Color(overrides.col2 ?? '#373d0d') },
    uCol3: { value: new THREE.Color(overrides.col3 ?? '#ffff19') },
    uCol4: { value: new THREE.Color(overrides.col4 ?? '#ff66b3') },
    uAmbient: { value: overrides.ambient ?? 0.8 },
    uGScale: { value: overrides.gScale ?? 15.0 },
    uGHeight: { value: overrides.gHeight ?? 1.5 },
    uTerrainScale: { value: overrides.terrainScale ?? 0.05 },
    uTerrainHeight: { value: overrides.terrainHeight ?? 6.0 },
    uFogNear: { value: overrides.fogNear ?? 60 },
    uFogFar: { value: overrides.fogFar ?? 300 },
    uFogColor: { value: new THREE.Color(overrides.fogColor ?? '#06080e') },
  }
}

export function createGrassGroundMaterial(uniforms: GrassGroundUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: uniforms as unknown as { [key: string]: THREE.IUniform },
    side: THREE.FrontSide,
    depthWrite: true,
    depthTest: true,
  })
}
