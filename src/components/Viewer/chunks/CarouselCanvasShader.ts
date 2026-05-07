export const vertexShader = /* glsl */ `#version 300 es
in vec2 aPosition;
out vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

export const fragmentShader = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D uImageA;
uniform sampler2D uDepthA;
uniform sampler2D uImageB;
uniform sampler2D uDepthB;
uniform float uProgress;
uniform float uDirection;
uniform float uParallax;
uniform float uBlurX;
uniform float uShowDepthMap;
uniform vec2 uAspectImageA;
uniform vec2 uAspectImageB;
uniform vec2 uAspectCanvas;

in vec2 vUv;
out vec4 fragColor;

// Cover-fit: remap canvas UV (0..1) into the image UV that yields object-fit: cover.
// imageAR / canvasAR are (w, h); only the ratio matters.
vec2 coverUV(vec2 uv, vec2 imageAR, vec2 canvasAR) {
  float imageRatio = imageAR.x / max(imageAR.y, 1.0);
  float canvasRatio = canvasAR.x / max(canvasAR.y, 1.0);
  vec2 scale = vec2(1.0);
  if (imageRatio > canvasRatio) {
    // Image is wider than canvas: crop horizontally, sample middle slice of image x.
    scale.x = canvasRatio / imageRatio;
  } else {
    // Image is taller than canvas: crop vertically, sample middle slice of image y.
    scale.y = imageRatio / canvasRatio;
  }
  return (uv - 0.5) * scale + 0.5;
}

// 9-tap horizontal Gaussian blur with fixed weights summing to 1.
vec3 blurSample(sampler2D tex, vec2 uv, float radius) {
  if (radius <= 0.0) {
    return texture(tex, clamp(uv, 0.0001, 0.9999)).rgb;
  }
  vec3 col = vec3(0.0);
  col += texture(tex, clamp(uv + vec2(-4.0 * radius, 0.0), 0.0001, 0.9999)).rgb * 0.0162;
  col += texture(tex, clamp(uv + vec2(-3.0 * radius, 0.0), 0.0001, 0.9999)).rgb * 0.0540;
  col += texture(tex, clamp(uv + vec2(-2.0 * radius, 0.0), 0.0001, 0.9999)).rgb * 0.1216;
  col += texture(tex, clamp(uv + vec2(-1.0 * radius, 0.0), 0.0001, 0.9999)).rgb * 0.1946;
  col += texture(tex, clamp(uv, 0.0001, 0.9999)).rgb * 0.2272;
  col += texture(tex, clamp(uv + vec2(1.0 * radius, 0.0), 0.0001, 0.9999)).rgb * 0.1946;
  col += texture(tex, clamp(uv + vec2(2.0 * radius, 0.0), 0.0001, 0.9999)).rgb * 0.1216;
  col += texture(tex, clamp(uv + vec2(3.0 * radius, 0.0), 0.0001, 0.9999)).rgb * 0.0540;
  col += texture(tex, clamp(uv + vec2(4.0 * radius, 0.0), 0.0001, 0.9999)).rgb * 0.0162;
  return col;
}

// Scalar version of blurSample for depth-map sampling. Smoothing the depth
// field is what turns the per-pixel parallax shift from chaotic noise into
// a coherent organic flow.
float blurSampleR(sampler2D tex, vec2 uv, float radius) {
  if (radius <= 0.0) {
    return texture(tex, clamp(uv, 0.0001, 0.9999)).r;
  }
  float v = 0.0;
  v += texture(tex, clamp(uv + vec2(-4.0 * radius, 0.0), 0.0001, 0.9999)).r * 0.0162;
  v += texture(tex, clamp(uv + vec2(-3.0 * radius, 0.0), 0.0001, 0.9999)).r * 0.0540;
  v += texture(tex, clamp(uv + vec2(-2.0 * radius, 0.0), 0.0001, 0.9999)).r * 0.1216;
  v += texture(tex, clamp(uv + vec2(-1.0 * radius, 0.0), 0.0001, 0.9999)).r * 0.1946;
  v += texture(tex, clamp(uv, 0.0001, 0.9999)).r * 0.2272;
  v += texture(tex, clamp(uv + vec2(1.0 * radius, 0.0), 0.0001, 0.9999)).r * 0.1946;
  v += texture(tex, clamp(uv + vec2(2.0 * radius, 0.0), 0.0001, 0.9999)).r * 0.1216;
  v += texture(tex, clamp(uv + vec2(3.0 * radius, 0.0), 0.0001, 0.9999)).r * 0.0540;
  v += texture(tex, clamp(uv + vec2(4.0 * radius, 0.0), 0.0001, 0.9999)).r * 0.0162;
  return v;
}

// Soft mask: 1 strictly inside [0,1]^2, fades to 0 over 'soft' width on each
// edge. Lets shifted samples that land just past the boundary still contribute,
// so the seam never has a hole even when depth shear pushes pixels off.
float softMask(vec2 uv, float soft) {
  vec2 mIn = smoothstep(vec2(-soft), vec2(0.0), uv);
  vec2 mOut = 1.0 - smoothstep(vec2(1.0), vec2(1.0 + soft), uv);
  vec2 m = mIn * mOut;
  return m.x * m.y;
}

void main() {
  vec2 uvA = coverUV(vUv, uAspectImageA, uAspectCanvas);
  vec2 uvB = coverUV(vUv, uAspectImageB, uAspectCanvas);

  float p = smoothstep(0.0, 1.0, uProgress);
  // Pulse peaks at p=0.5, zero at endpoints — keeps the parallax shear
  // hidden when slides land flush.
  float pulse = 4.0 * p * (1.0 - p);

  const float BLUR_SCALE = 0.02;
  float blurRadius = uBlurX * pulse * BLUR_SCALE;

  // Blur the depth field with the same uBlurX so cranking the slider
  // smooths the per-pixel shift into a coherent flow. Raw depth produces
  // the "mess of pixels" look mid-transition; this is the fix.
  float dA = blurSampleR(uDepthA, uvA, blurRadius);
  float dB = blurSampleR(uDepthB, uvB, blurRadius);

  // Bulk swipe (A leaves in +direction at rate p, B enters from -direction)
  // plus depth-driven shear (near pixels lead, far pixels lag, peaking at
  // p=0.5). Combined, this gives the directional slide motion with a
  // parallax depth feel.
  vec2 offA = vec2(uDirection * (p          + (dA - 0.5) * uParallax * pulse), 0.0);
  vec2 offB = vec2(uDirection * ((p - 1.0)  + (dB - 0.5) * uParallax * pulse), 0.0);

  vec2 sampleA = uvA + offA;
  vec2 sampleB = uvB + offB;

  // Seam softness scales with the depth shift so the overlap zone always
  // covers wherever the shear pushes pixels — no holes at the boundary.
  float seamSoft = clamp(uParallax * pulse + 0.05, 0.05, 0.4);
  float maskA = softMask(sampleA, seamSoft);
  float maskB = softMask(sampleB, seamSoft);

  vec3 colA = blurSample(uImageA, sampleA, blurRadius);
  vec3 colB = blurSample(uImageB, sampleB, blurRadius);

  // A dominates early, B dominates late, both contribute through the
  // overlap so the seam blends instead of cutting.
  float wA = maskA * (1.0 - p);
  float wB = maskB * p;
  float total = max(wA + wB, 0.0001);
  vec3 col = (colA * wA + colB * wB) / total;

  if (uShowDepthMap > 0.5) {
    float dA_render = blurSampleR(uDepthA, sampleA, blurRadius);
    float dB_render = blurSampleR(uDepthB, sampleB, blurRadius);
    float dCol = (dA_render * wA + dB_render * wB) / total;
    col = vec3(dCol);
  }

  fragColor = vec4(col, 1.0);
}
`
