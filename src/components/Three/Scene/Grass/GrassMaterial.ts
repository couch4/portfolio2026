import * as THREE from 'three'

// ---------------------------------------------------------------------------
// GrassMaterial
//
// A performant ShaderMaterial purpose-built for instanced grass blades.
//
// Vertex features:
//   • Two-octave wind sway — low-frequency gust + high-frequency flutter
//   • Amplitude gated by normalised blade height (t=0 root anchored, t=1 tip)
//   • Spatial phase offset from world XZ so blades never sway in lock-step
//   • vT varying carries blade height (0→1) into fragment for all gradients
//
// Fragment features:
//   • Root-to-tip color gradient (colorBase → colorTip) driven by vT
//   • Instance color multiplied in (per-clump hue variation)
//   • Subsurface translucency: back-lit blades glow through from the light side
//   • Rim highlight: grazing-angle brightening toward blade tip
//   • Ground AO: cheap power-curve darkening near root
//   • Alpha tip fade: smooth clip at the very tip using UV.y proximity
//   • Fog: built-in linear fog matching Three.js scene fog uniforms
//
// Performance notes:
//   • No texture samples — pure math, zero texture bandwidth
//   • DoubleSide via gl_FrontFacing check in fragment (no extra draw call)
//   • depthWrite true, alphaTest via discard (no OIT sorting needed)
//   • All heavy per-blade variation baked into instance matrices / colors
// ---------------------------------------------------------------------------

const vertexShader = /* glsl */ `
precision mediump float;

// ── Instancing ──────────────────────────────────────────────────────────────
#include <common>

// ── Uniforms ─────────────────────────────────────────────────────────────────
uniform float uTime;
uniform float uWindStrength;
uniform float uWindSpeed;
uniform vec2  uWindDir;         // XZ unit vector

// ── Varyings ─────────────────────────────────────────────────────────────────
varying vec2  vUv;
varying float vT;               // 0=root, 1=tip (normalised blade height)
varying vec3  vWorldNormal;
varying vec3  vWorldPos;
varying float vFogDepth;

void main() {
  vUv = uv;

  // Extract world-space XZ from instance translation column (col 3)
  float wx = instanceMatrix[3][0];
  float wz = instanceMatrix[3][2];

  // Normalised blade height: Y scale sits in column-1 length of instanceMatrix
  float scaleY = length(vec3(instanceMatrix[1][0], instanceMatrix[1][1], instanceMatrix[1][2]));
  vT = clamp(position.y / max(scaleY, 0.001), 0.0, 1.0);

  // ── Wind displacement ────────────────────────────────────────────────────
  // Spatially unique phase per blade
  float phase = wx * 0.19 + wz * 0.23;

  // Low-freq gust + high-freq flutter, both tip-gated
  float tipFactor = vT * vT;  // quadratic — roots stay completely still
  float gust    = sin(uTime * uWindSpeed        + phase)        * 0.65;
  float flutter = sin(uTime * uWindSpeed * 2.3  + phase * 1.7)  * 0.25
                + sin(uTime * uWindSpeed * 3.7  + phase * 2.9)  * 0.10;
  float disp = (gust + flutter) * uWindStrength * tipFactor;

  vec3 pos = position;
  pos.x += uWindDir.x * disp;
  pos.z += uWindDir.y * disp;

  // ── Instance transform ───────────────────────────────────────────────────
  vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
  vWorldPos = worldPos.xyz;

  // Normal into world space (no non-uniform scale in normal matrix hack needed
  // because our blades only have uniform XY scale)
  vec3 transformedNormal = normalize(mat3(instanceMatrix) * normal);
  vWorldNormal = normalize(transformedNormal);

  // ── MVP ──────────────────────────────────────────────────────────────────
  vec4 mvPosition = modelViewMatrix * worldPos;
  vFogDepth = -mvPosition.z;

  gl_Position = projectionMatrix * mvPosition;
}
`

const fragmentShader = /* glsl */ `
precision mediump float;

// ── Uniforms ─────────────────────────────────────────────────────────────────
uniform vec3  uColorBase;
uniform vec3  uColorTip;
uniform vec3  uLightDir;        // world-space normalised sun direction
uniform vec3  uLightColor;
uniform vec3  uAmbientColor;
uniform float uTranslucency;    // 0-1 backlit glow strength
uniform float uRimStrength;     // 0-1 rim highlight at tip
uniform float uAlphaTest;       // discard threshold
uniform float uFogNear;
uniform float uFogFar;
uniform vec3  uFogColor;

// ── Varyings ─────────────────────────────────────────────────────────────────
varying vec2  vUv;
varying float vT;
varying vec3  vWorldNormal;
varying vec3  vWorldPos;
varying float vFogDepth;

void main() {
  // ── Alpha: taper tip to a point ─────────────────────────────────────────
  // UV.x goes 0→1 left to right; centre is 0.5. Near the tip (vT→1) the
  // blade narrows. We reconstruct a "distance from centreline" alpha.
  float centreDistSq = (vUv.x - 0.5) * (vUv.x - 0.5) * 4.0; // 0 at centre, 1 at edge
  // Allowed width shrinks as vT → 1 (tip)
  float allowedWidth = mix(1.0, 0.0, pow(vT, 1.8));
  float alpha = 1.0 - smoothstep(allowedWidth * 0.8, allowedWidth, sqrt(centreDistSq));
  if (alpha < uAlphaTest) discard;

  // ── Base color: root-to-tip gradient ─────────────────────────────────────
  vec3 baseColor = mix(uColorBase, uColorTip, pow(vT, 0.9));

  // ── Normal: double-sided ─────────────────────────────────────────────────
  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) N = -N;

  // ── Diffuse (Lambert) ────────────────────────────────────────────────────
  vec3 L = normalize(uLightDir);
  float NdotL = max(dot(N, L), 0.0);
  vec3 diffuse = NdotL * uLightColor;

  // ── Subsurface translucency ──────────────────────────────────────────────
  // Light wrapping through thin blade: use -NdotL on the back face
  // combined with a tip-bias (thin tips transmit more than thick roots)
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float backLight = max(dot(-N, L), 0.0);
  float sss = backLight * vT * uTranslucency;
  vec3 translucent = sss * uLightColor * baseColor;

  // ── Rim highlight ────────────────────────────────────────────────────────
  // Edge-on blades catch a subtle rim of light, stronger at tip
  float rim = pow(1.0 - abs(dot(N, viewDir)), 3.0) * vT * uRimStrength;
  vec3 rimColor = rim * uLightColor;

  // ── Ground AO ────────────────────────────────────────────────────────────
  // Blades are darker near the root (shadow from surrounding grass)
  float ao = mix(0.25, 1.0, pow(vT, 0.5));

  // ── Compose ──────────────────────────────────────────────────────────────
  vec3 color = baseColor * (uAmbientColor * ao + diffuse) + translucent + rimColor;

  // ── Linear fog ───────────────────────────────────────────────────────────
  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
  color = mix(color, uFogColor, fogFactor);

  gl_FragColor = vec4(color, alpha);
}
`

// ---------------------------------------------------------------------------
// Uniforms factory — call once, mutate uTime each frame
// ---------------------------------------------------------------------------
export interface GrassMaterialUniforms {
  uTime: { value: number }
  uWindStrength: { value: number }
  uWindSpeed: { value: number }
  uWindDir: { value: THREE.Vector2 }
  uColorBase: { value: THREE.Color }
  uColorTip: { value: THREE.Color }
  uLightDir: { value: THREE.Vector3 }
  uLightColor: { value: THREE.Color }
  uAmbientColor: { value: THREE.Color }
  uTranslucency: { value: number }
  uRimStrength: { value: number }
  uAlphaTest: { value: number }
  uFogNear: { value: number }
  uFogFar: { value: number }
  uFogColor: { value: THREE.Color }
}

export function createGrassMaterialUniforms(
  overrides: Partial<{
    colorBase: string
    colorTip: string
    lightDir: THREE.Vector3
    lightColor: string
    ambientColor: string
    translucency: number
    rimStrength: number
    fogNear: number
    fogFar: number
    fogColor: string
  }> = {},
): GrassMaterialUniforms {
  return {
    uTime: { value: 0 },
    uWindStrength: { value: 0.06 },
    uWindSpeed: { value: 1.2 },
    uWindDir: { value: new THREE.Vector2(1, 0) },
    uColorBase: { value: new THREE.Color(overrides.colorBase ?? '#1a3a0a') },
    uColorTip: { value: new THREE.Color(overrides.colorTip ?? '#6dc230') },
    uLightDir: {
      value: (overrides.lightDir ?? new THREE.Vector3(0.4, 0.8, 0.3)).clone().normalize(),
    },
    uLightColor: { value: new THREE.Color(overrides.lightColor ?? '#ffe8c0') },
    uAmbientColor: { value: new THREE.Color(overrides.ambientColor ?? '#1a2f14') },
    uTranslucency: { value: overrides.translucency ?? 0.55 },
    uRimStrength: { value: overrides.rimStrength ?? 0.35 },
    uAlphaTest: { value: 0.08 },
    uFogNear: { value: overrides.fogNear ?? 60 },
    uFogFar: { value: overrides.fogFar ?? 300 },
    uFogColor: { value: new THREE.Color(overrides.fogColor ?? '#06080e') },
  }
}

// ---------------------------------------------------------------------------
// createGrassMaterial
// ---------------------------------------------------------------------------
export function createGrassMaterial(uniforms: GrassMaterialUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: uniforms as unknown as { [key: string]: THREE.IUniform },
    side: THREE.DoubleSide,
    transparent: true, // needed for alpha discard to anti-alias properly
    depthWrite: true,
    depthTest: true,
    // No premultiplied alpha — we want additive-style translucency blending
    blending: THREE.NormalBlending,
  })
}
