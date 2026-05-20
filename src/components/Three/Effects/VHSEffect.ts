import { Effect } from 'postprocessing'
import { Uniform, Vector2 } from 'three'

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uNoiseStrength;
  uniform float uScanlineIntensity;
  uniform float uChromaShift;
  uniform float uGhostStrength;
  uniform float uTrackingError;
  uniform float uBarrelDistortion;
  uniform float uHandheldStrength;
  uniform float uTapeSpeed;
  uniform vec2  uResolution;

  // --- Helpers ---

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  // --- Stage 1: Lens optics (barrel distortion + tube trails) ---

  vec2 barrelDistort(vec2 uv, float k) {
    vec2 cc = uv - 0.5;
    float r2 = dot(cc, cc);
    return uv + cc * (k * r2);
  }

  // --- Stage 2: YIQ encoding (NTSC color space) ---
  // Separates luma (Y) from chroma (I=orange-cyan axis, Q=green-magenta axis).
  // VHS limited the bandwidth of I and Q independently, causing colour smear.

  vec3 rgbToYiq(vec3 rgb) {
    return vec3(
      dot(rgb, vec3(0.299,  0.587,  0.114)),
      dot(rgb, vec3(0.596, -0.274, -0.322)),
      dot(rgb, vec3(0.211, -0.523,  0.312))
    );
  }

  vec3 yiqToRgb(vec3 yiq) {
    return vec3(
      dot(yiq, vec3(1.0,  0.956,  0.621)),
      dot(yiq, vec3(1.0, -0.272, -0.647)),
      dot(yiq, vec3(1.0, -1.108,  1.705))
    );
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float t     = uTime * uTapeSpeed;
    vec2 texel  = 1.0 / uResolution;

    // ----------------------------------------------------------------
    // Stage 1 — Camera optics: handheld sway + barrel distortion
    // ----------------------------------------------------------------

    vec2 sway = vec2(
      sin(t * 0.13 + 1.3) * 0.0015 + sin(t * 0.41) * 0.0008,
      cos(t * 0.17 + 0.7) * 0.0015 + cos(t * 0.31) * 0.0008
    ) * uHandheldStrength;

    vec2 distUv = barrelDistort(uv + sway, uBarrelDistortion * 0.18);
    distUv = clamp(distUv, 0.001, 0.999);

    // ----------------------------------------------------------------
    // Stage 2 — Tape degradation: VHS tracking errors (horizontal glitch)
    // Manifests as horizontal bands that jump and shift on magnetic failure.
    // ----------------------------------------------------------------

    float trackBand  = step(0.965, noise(vec2(uv.y * 40.0, mod(floor(t * 0.4), 503.0) * 9.7)));
    float trackNoise = noise(vec2(uv.y * 12.0, mod(t * 1.8, 631.0)));
    float trackShift = (trackNoise - 0.5) * trackBand * uTrackingError * 0.055;
    distUv.x = clamp(distUv.x + trackShift, 0.001, 0.999);

    // ----------------------------------------------------------------
    // Stage 3 — Encoding: YIQ chroma shift + limited bandwidth
    // I and Q channels are sampled at laterally offset UVs (chroma bleed).
    // Then each is blurred vertically to simulate bandwidth rolloff.
    // ----------------------------------------------------------------

    float ca  = uChromaShift * texel.x * 5.5;
    vec2 uvI  = vec2(clamp(distUv.x + ca,         0.001, 0.999), distUv.y);
    vec2 uvQ  = vec2(clamp(distUv.x - ca * 0.65,  0.001, 0.999), distUv.y);

    // Luma from distorted position, chroma from bleed positions
    vec3 yiq;
    yiq.r = rgbToYiq(texture2D(inputBuffer, distUv).rgb).r;
    yiq.g = rgbToYiq(texture2D(inputBuffer, uvI).rgb).g;
    yiq.b = rgbToYiq(texture2D(inputBuffer, uvQ).rgb).b;

    // Vertical chroma bandwidth blur (I and Q smear more in Y than luma does)
    yiq.g = (
      yiq.g +
      rgbToYiq(texture2D(inputBuffer, uvI + vec2(0.0,  texel.y)).rgb).g +
      rgbToYiq(texture2D(inputBuffer, uvI - vec2(0.0,  texel.y)).rgb).g
    ) / 3.0;
    yiq.b = (
      yiq.b +
      rgbToYiq(texture2D(inputBuffer, uvQ + vec2(0.0,  texel.y * 2.0)).rgb).b +
      rgbToYiq(texture2D(inputBuffer, uvQ - vec2(0.0,  texel.y * 2.0)).rgb).b
    ) / 3.0;

    vec3 col = yiqToRgb(yiq);

    // ----------------------------------------------------------------
    // Stage 4 — Tape ghosting (magnetic echo from previous frame)
    // A faint, laterally-shifted copy bleeds through as tape degrades.
    // ----------------------------------------------------------------

    vec2 ghostUv = clamp(distUv + vec2(-texel.x * 12.0, texel.y * 1.5) * uGhostStrength, 0.001, 0.999);
    vec3 ghost   = texture2D(inputBuffer, ghostUv).rgb;
    col += ghost * 0.13 * uGhostStrength;

    // ----------------------------------------------------------------
    // Stage 5 — Playback: edge sharpening ringing artifact
    // Analog playback circuitry over-sharpens horizontal edges, creating
    // a bright/dark fringe (Gibbs phenomenon on the video signal).
    // ----------------------------------------------------------------

    vec3 px_right = texture2D(inputBuffer, distUv + vec2(texel.x, 0.0)).rgb;
    vec3 px_left  = texture2D(inputBuffer, distUv - vec2(texel.x, 0.0)).rgb;
    vec3 ringing  = (col * 2.0 - px_left - px_right) * 0.3;
    col += ringing;

    // ----------------------------------------------------------------
    // Stage 6 — Capture: colour noise + luma static
    // ----------------------------------------------------------------

    // Wrap frameId so it never grows large enough to swamp the uv
    // term in the hash dot-product (float32 loses per-pixel entropy once the
    // frameId contribution >> uv contribution in magnitude).
    float frameId  = mod(floor(t * 24.0), 997.0);  // 997 is prime → no visible repeat
    float nA       = hash(uv + vec2(frameId * 137.0, frameId * 61.3) * 0.001);
    float nB       = hash(uv * 0.5 + vec2(frameId * 79.1, frameId * 113.7) * 0.001);
    col           += (nA * nB - 0.2) * uNoiseStrength * 0.28;

    // ----------------------------------------------------------------
    // Stage 7 — CRT output: scanlines + vignette + warm colour grade
    // ----------------------------------------------------------------

    // Scanlines (every other raster line darkened)
    float line = sin(uv.y * uResolution.y * 3.14159265);
    col *= mix(1.0, clamp(line * 0.45 + 0.88, 0.0, 1.0), uScanlineIntensity * 0.55);

    // Warm tape colour temperature (slight yellow-orange cast)
    col.r *= 1.06;
    col.b *= 0.91;

    // CRT edge vignette (stronger than the effect-composer vignette)
    vec2 vigUv = uv * (1.0 - uv);
    float vig  = pow(clamp(vigUv.x * vigUv.y * 18.0, 0.0, 1.0), uBarrelDistortion * 0.5 + 0.2);
    col       *= vig;

    col = clamp(col, 0.0, 1.0);
    outputColor = vec4(mix(inputColor.rgb, col, uIntensity), inputColor.a);
  }
`

export interface VHSEffectOptions {
  /** 0–1 global blend of the VHS look over the clean render */
  intensity?: number
  /** Luminance + colour static grain */
  noiseStrength?: number
  /** CRT raster line visibility */
  scanlineIntensity?: number
  /** Lateral chroma smear (I/Q bleed) */
  chromaShift?: number
  /** Magnetic tape echo ghost */
  ghostStrength?: number
  /** Horizontal glitch band probability */
  trackingError?: number
  /** CRT barrel / pincushion warp */
  barrelDistortion?: number
  /** Handheld camera sway amplitude */
  handheldStrength?: number
  /** Overall animation speed multiplier */
  tapeSpeed?: number
}

export class VHSEffect extends Effect {
  constructor({
    intensity = 1.0,
    noiseStrength = 0.55,
    scanlineIntensity = 0.65,
    chromaShift = 0.6,
    ghostStrength = 0.4,
    trackingError = 0.5,
    barrelDistortion = 0.6,
    handheldStrength = 0.8,
    tapeSpeed = 1.0,
  }: VHSEffectOptions = {}) {
    super('VHSEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['uTime', new Uniform(0)],
        ['uIntensity', new Uniform(intensity)],
        ['uNoiseStrength', new Uniform(noiseStrength)],
        ['uScanlineIntensity', new Uniform(scanlineIntensity)],
        ['uChromaShift', new Uniform(chromaShift)],
        ['uGhostStrength', new Uniform(ghostStrength)],
        ['uTrackingError', new Uniform(trackingError)],
        ['uBarrelDistortion', new Uniform(barrelDistortion)],
        ['uHandheldStrength', new Uniform(handheldStrength)],
        ['uTapeSpeed', new Uniform(tapeSpeed)],
        ['uResolution', new Uniform(new Vector2(1920, 1080))],
      ]),
    })
  }

  get intensity() {
    return (this.uniforms.get('uIntensity') as Uniform<number>).value
  }
  set intensity(v: number) {
    ;(this.uniforms.get('uIntensity') as Uniform<number>).value = v
  }

  get noiseStrength() {
    return (this.uniforms.get('uNoiseStrength') as Uniform<number>).value
  }
  set noiseStrength(v: number) {
    ;(this.uniforms.get('uNoiseStrength') as Uniform<number>).value = v
  }

  get scanlineIntensity() {
    return (this.uniforms.get('uScanlineIntensity') as Uniform<number>).value
  }
  set scanlineIntensity(v: number) {
    ;(this.uniforms.get('uScanlineIntensity') as Uniform<number>).value = v
  }

  get chromaShift() {
    return (this.uniforms.get('uChromaShift') as Uniform<number>).value
  }
  set chromaShift(v: number) {
    ;(this.uniforms.get('uChromaShift') as Uniform<number>).value = v
  }

  get ghostStrength() {
    return (this.uniforms.get('uGhostStrength') as Uniform<number>).value
  }
  set ghostStrength(v: number) {
    ;(this.uniforms.get('uGhostStrength') as Uniform<number>).value = v
  }

  get trackingError() {
    return (this.uniforms.get('uTrackingError') as Uniform<number>).value
  }
  set trackingError(v: number) {
    ;(this.uniforms.get('uTrackingError') as Uniform<number>).value = v
  }

  get barrelDistortion() {
    return (this.uniforms.get('uBarrelDistortion') as Uniform<number>).value
  }
  set barrelDistortion(v: number) {
    ;(this.uniforms.get('uBarrelDistortion') as Uniform<number>).value = v
  }

  get handheldStrength() {
    return (this.uniforms.get('uHandheldStrength') as Uniform<number>).value
  }
  set handheldStrength(v: number) {
    ;(this.uniforms.get('uHandheldStrength') as Uniform<number>).value = v
  }

  get tapeSpeed() {
    return (this.uniforms.get('uTapeSpeed') as Uniform<number>).value
  }
  set tapeSpeed(v: number) {
    ;(this.uniforms.get('uTapeSpeed') as Uniform<number>).value = v
  }

  override setSize(width: number, height: number): void {
    ;(this.uniforms.get('uResolution') as Uniform<Vector2>).value.set(width, height)
  }

  override update(_renderer: unknown, _inputBuffer: unknown, deltaTime: number): void {
    ;(this.uniforms.get('uTime') as Uniform<number>).value += deltaTime
  }
}
