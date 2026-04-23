// Water.js — local copy of three/examples/jsm/objects/Water.js
// Adds `reflectivity` uniform (0–1) to scale the Fresnel reflection blend.
// reflectivity=1.0 → full mirror reflections (default). reflectivity=0.0 → waterColor only.

import {
  Color,
  FrontSide,
  Matrix4,
  MeshDepthMaterial,
  Mesh,
  NearestFilter,
  NoBlending,
  PerspectiveCamera,
  Plane,
  RGBADepthPacking,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
} from 'three'

class Water extends Mesh {
  constructor(geometry, options = {}) {
    super(geometry)

    this.isWater = true

    const scope = this

    const textureWidth = options.textureWidth !== undefined ? options.textureWidth : 512
    const textureHeight = options.textureHeight !== undefined ? options.textureHeight : 512
    const clipBias = options.clipBias !== undefined ? options.clipBias : 0.0
    const alpha = options.alpha !== undefined ? options.alpha : 1.0
    const time = options.time !== undefined ? options.time : 0.0
    const normalSampler = options.waterNormals !== undefined ? options.waterNormals : null
    const sunDirection =
      options.sunDirection !== undefined ? options.sunDirection : new Vector3(0.70707, 0.70707, 0.0)
    const sunColor = new Color(options.sunColor !== undefined ? options.sunColor : 0xffffff)
    const waterColor = new Color(options.waterColor !== undefined ? options.waterColor : 0x7f7f7f)
    const eye = options.eye !== undefined ? options.eye : new Vector3(0, 0, 0)
    const distortionScale = options.distortionScale !== undefined ? options.distortionScale : 20.0
    const side = options.side !== undefined ? options.side : FrontSide
    const fog = options.fog !== undefined ? options.fog : false
    const reflectivity = options.reflectivity !== undefined ? options.reflectivity : 1.0

    const mirrorPlane = new Plane()
    const normal = new Vector3()
    const mirrorWorldPosition = new Vector3()
    const cameraWorldPosition = new Vector3()
    const rotationMatrix = new Matrix4()
    const lookAtPosition = new Vector3(0, 0, -1)
    const clipPlane = new Vector4()
    const view = new Vector3()
    const target = new Vector3()
    const q = new Vector4()
    const textureMatrix = new Matrix4()
    const mirrorCamera = new PerspectiveCamera()
    const renderTarget = new WebGLRenderTarget(textureWidth, textureHeight)

    // Depth pre-pass render target — RGBA color buffer stores packed depth from MeshDepthMaterial.
    // Sized to screen pixels; caller must call water.depthRenderTarget.setSize(w,h) on resize.
    const depthRT = new WebGLRenderTarget(textureWidth, textureHeight)
    depthRT.texture.minFilter = NearestFilter
    depthRT.texture.magFilter = NearestFilter
    depthRT.texture.generateMipmaps = false
    depthRT.stencilBuffer = false

    // Material used during depth pre-pass — RGBADepthPacking writes packed depth into the COLOR buffer
    const depthMat = new MeshDepthMaterial()
    depthMat.depthPacking = RGBADepthPacking
    depthMat.blending = NoBlending

    // Expose the depth render target so callers can resize it
    scope.depthRenderTarget = depthRT

    const mirrorShader = {
      name: 'MirrorShader',

      uniforms: UniformsUtils.merge([
        UniformsLib['fog'],
        UniformsLib['lights'],
        {
          normalSampler: { value: null },
          mirrorSampler: { value: null },
          alpha: { value: 1.0 },
          time: { value: 0.0 },
          size: { value: 1.0 },
          distortionScale: { value: 20.0 },
          textureMatrix: { value: new Matrix4() },
          sunColor: { value: new Color(0x7f7f7f) },
          sunDirection: { value: new Vector3(0.70707, 0.70707, 0) },
          eye: { value: new Vector3() },
          waterColor: { value: new Color(0x555555) },
          reflectivity: { value: 1.0 },
          flowDirection: { value: new Vector2(0.0, -1.0) },
          uShoreMask: { value: null },
          uFoamIntensity: { value: 0.8 },
          // Depth-intersection foam
          tDepth: { value: null },
          cameraNear: { value: 0.1 },
          cameraFar: { value: 1000.0 },
          resolution: { value: new Vector2(512, 512) },
          foamColor: { value: new Color(0xffffff) },
          foamThreshold: { value: 0.0 },
        },
      ]),

      vertexShader: /* glsl */ `
        uniform mat4 textureMatrix;
        uniform float time;

        varying vec4 mirrorCoord;
        varying vec4 worldPosition;

        #include <common>
        #include <fog_pars_vertex>
        #include <shadowmap_pars_vertex>
        #include <logdepthbuf_pars_vertex>

        void main() {
          mirrorCoord = modelMatrix * vec4( position, 1.0 );
          worldPosition = mirrorCoord.xyzw;
          mirrorCoord = textureMatrix * mirrorCoord;
          vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
          gl_Position = projectionMatrix * mvPosition;

          #include <beginnormal_vertex>
          #include <defaultnormal_vertex>
          #include <logdepthbuf_vertex>
          #include <fog_vertex>
          #include <shadowmap_vertex>
        }
      `,

      fragmentShader: /* glsl */ `
        uniform sampler2D mirrorSampler;
        uniform float alpha;
        uniform float time;
        uniform float size;
        uniform float distortionScale;
        uniform sampler2D normalSampler;
        uniform vec3 sunColor;
        uniform vec3 sunDirection;
        uniform vec3 eye;
        uniform vec3 waterColor;
        uniform float reflectivity;
        uniform vec2 flowDirection;
        uniform sampler2D uShoreMask;
        uniform float uFoamIntensity;
        // Depth-intersection foam
        uniform sampler2D tDepth;
        uniform float cameraNear;
        uniform float cameraFar;
        uniform vec2 resolution;
        uniform vec3 foamColor;
        uniform float foamThreshold;
        varying vec4 mirrorCoord;
        varying vec4 worldPosition;

        vec4 getNoise( vec2 uv ) {
          uv += flowDirection * time;
          vec2 uv0 = ( uv / 103.0 ) + vec2( time / 17.0, time / 29.0 );
          vec2 uv1 = uv / 107.0 - vec2( time / -19.0, time / 31.0 );
          vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );
          vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );
          vec4 noise = texture2D( normalSampler, uv0 ) +
                       texture2D( normalSampler, uv1 ) +
                       texture2D( normalSampler, uv2 ) +
                       texture2D( normalSampler, uv3 );
          return noise * 0.5 - 1.0;
        }

        void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {
          vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );
          float direction = max( 0.0, dot( eyeDirection, reflection ) );
          specularColor += pow( direction, shiny ) * sunColor * spec;
          diffuseColor  += max( dot( sunDirection, surfaceNormal ), 0.0 ) * sunColor * diffuse;
        }

        #include <common>
        #include <packing>
        #include <bsdfs>
        #include <fog_pars_fragment>
        #include <logdepthbuf_pars_fragment>
        #include <lights_pars_begin>
        #include <shadowmap_pars_fragment>
        #include <shadowmask_pars_fragment>

        void main() {
          #include <logdepthbuf_fragment>
          vec4 noise = getNoise( worldPosition.xz * size );
          vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );

          vec3 diffuseLight  = vec3( 0.0 );
          vec3 specularLight = vec3( 0.0 );

          vec3 worldToEye   = eye - worldPosition.xyz;
          vec3 eyeDirection = normalize( worldToEye );
          sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );

          float distance = length( worldToEye );

          vec2 distortion     = surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale;
          vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) );

          float theta      = max( dot( eyeDirection, surfaceNormal ), 0.0 );
          float rf0        = 0.3;
          float reflectance = ( rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 ) ) * reflectivity;

          vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;
          vec3 albedo  = mix(
            ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask(),
            ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight ),
            reflectance
          );

          // Shore foam — sampled from a baked top-down mask texture.
          // UV maps water plane world XZ [-250..250, -102..398] → [0..1, 0..1].
          if (uFoamIntensity > 0.0) {
            vec2 shoreUV = (worldPosition.xz - vec2(-250.0, -102.0)) / 500.0;
            float shore = texture2D(uShoreMask, shoreUV).r;
            if (shore > 0.01) {
              // Two slow noise layers break up the edge organically
              float ft = time * 0.18;
              float n1 = texture2D(normalSampler, worldPosition.xz * 0.06 + vec2(ft * 0.5, ft * 0.3)).r;
              float n2 = texture2D(normalSampler, worldPosition.xz * 0.09 - vec2(ft * 0.3, ft * 0.6)).g;
              float foamNoise = n1 * 0.6 + n2 * 0.4;
              // Rings in shore-distance space → ripples that follow the shoreline contour
              float ring = sin(shore * 9.42 - time * 1.1) * 0.5 + 0.5; // 9.42 ≈ 3π → ~3 rings
              ring = smoothstep(0.25, 0.85, ring);
              float foamAmt = shore * mix(foamNoise * 0.65, ring * foamNoise, 0.55);
              albedo = mix(albedo, vec3(1.0), foamAmt * uFoamIntensity * alpha);
            }
          }

          // Depth-intersection foam — detects meshes cutting through the water surface,
          // then expands the foam zone outward using screen-space ring probes (8 dirs × 2 radii).
          if (foamThreshold > 0.0) {
            vec2 screenUV = gl_FragCoord.xy / resolution;
            vec2 texelSize = 1.0 / resolution;

            float sceneNDC    = unpackRGBAToDepth( texture2D( tDepth, screenUV ) );
            float sceneLinear = -perspectiveDepthToViewZ( sceneNDC, cameraNear, cameraFar );
            float waterLinear = -perspectiveDepthToViewZ( gl_FragCoord.z, cameraNear, cameraFar );
            float diff = sceneLinear - waterLinear;

            // Noise for threshold perturbation and foam breakup.
            float ft2 = time * 0.22;
            float na = texture2D(normalSampler, worldPosition.xz * 0.08 + vec2(ft2 * 0.4, ft2 * 0.25)).r;
            float nb = texture2D(normalSampler, worldPosition.xz * 0.12 - vec2(ft2 * 0.2, ft2 * 0.5)).g;
            float foamN = na * 0.55 + nb * 0.45;

            // Noise-perturbed threshold prevents the foam cutoff from aligning with
            // terrain triangle edges, breaking up any wireframe-like artifacts.
            float edgeThresh = 0.7 + foamN * 0.6;
            float atEdge = diff > 0.0 ? smoothstep(edgeThresh, 0.0, diff) : 0.0;

            // Screen-space ring dilation: sample tDepth at neighboring screen positions
            // to detect whether this pixel is near an intersection edge.
            // Neighbors use current waterLinear as approximate water depth (valid nearby).
            float iR = 22.0; // inner ring radius, pixels
            float oR = 55.0; // outer ring radius, pixels
            float pT = 0.8 + foamN * 0.4; // noise-perturbed probe threshold
            float screenDist = atEdge > 0.15 ? 0.0 : 1.0;

            #define PROBE(off, dv) { \
              vec2 _uv = clamp(screenUV + (off) * texelSize, vec2(0.001), vec2(0.999)); \
              float _d = -perspectiveDepthToViewZ(unpackRGBAToDepth(texture2D(tDepth, _uv)), cameraNear, cameraFar) - waterLinear; \
              if (_d > 0.0 && _d < pT) screenDist = min(screenDist, dv); \
            }

            PROBE(vec2( iR,       0.0),       0.35)
            PROBE(vec2( iR*0.71,  iR*0.71),   0.35)
            PROBE(vec2( 0.0,      iR),         0.35)
            PROBE(vec2(-iR*0.71,  iR*0.71),   0.35)
            PROBE(vec2(-iR,       0.0),        0.35)
            PROBE(vec2(-iR*0.71, -iR*0.71),   0.35)
            PROBE(vec2( 0.0,     -iR),         0.35)
            PROBE(vec2( iR*0.71, -iR*0.71),   0.35)

            PROBE(vec2( oR,       0.0),        0.70)
            PROBE(vec2( oR*0.71,  oR*0.71),   0.70)
            PROBE(vec2( 0.0,      oR),         0.70)
            PROBE(vec2(-oR*0.71,  oR*0.71),   0.70)
            PROBE(vec2(-oR,       0.0),        0.70)
            PROBE(vec2(-oR*0.71, -oR*0.71),   0.70)
            PROBE(vec2( 0.0,     -oR),         0.70)
            PROBE(vec2( oR*0.71, -oR*0.71),   0.70)

            #undef PROBE

            if (screenDist < 1.0) {
              float edge = atEdge;

              // Ripple rings animating outward: sin peaks advance to larger screenDist over time
              float ripple = sin(screenDist * 12.566 - time * 2.0) * 0.5 + 0.5;
              ripple = smoothstep(0.35, 0.9, ripple);
              ripple *= smoothstep(0.0, 0.15, screenDist); // clear gap at hard edge
              ripple *= (1.0 - screenDist);                 // fade with distance
              ripple *= foamN;

              float foamAmt = max(edge, ripple) * uFoamIntensity;
              albedo = mix(albedo, foamColor, foamAmt);
            }
          }

          gl_FragColor = vec4( albedo, alpha );

          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `,
    }

    const material = new ShaderMaterial({
      name: mirrorShader.name,
      uniforms: UniformsUtils.clone(mirrorShader.uniforms),
      vertexShader: mirrorShader.vertexShader,
      fragmentShader: mirrorShader.fragmentShader,
      lights: true,
      side: side,
      fog: fog,
    })

    material.uniforms['mirrorSampler'].value = renderTarget.texture
    material.uniforms['textureMatrix'].value = textureMatrix
    material.uniforms['alpha'].value = alpha
    material.uniforms['time'].value = time
    material.uniforms['normalSampler'].value = normalSampler
    material.uniforms['sunColor'].value = sunColor
    material.uniforms['waterColor'].value = waterColor
    material.uniforms['sunDirection'].value = sunDirection
    material.uniforms['distortionScale'].value = distortionScale
    material.uniforms['eye'].value = eye
    material.uniforms['reflectivity'].value = reflectivity

    scope.material = material

    scope.onBeforeRender = function (renderer, scene, camera) {
      mirrorWorldPosition.setFromMatrixPosition(scope.matrixWorld)
      cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld)
      rotationMatrix.extractRotation(scope.matrixWorld)

      normal.set(0, 0, 1)
      normal.applyMatrix4(rotationMatrix)

      view.subVectors(mirrorWorldPosition, cameraWorldPosition)
      if (view.dot(normal) > 0) return

      view.reflect(normal).negate()
      view.add(mirrorWorldPosition)

      rotationMatrix.extractRotation(camera.matrixWorld)

      lookAtPosition.set(0, 0, -1)
      lookAtPosition.applyMatrix4(rotationMatrix)
      lookAtPosition.add(cameraWorldPosition)

      target.subVectors(mirrorWorldPosition, lookAtPosition)
      target.reflect(normal).negate()
      target.add(mirrorWorldPosition)

      mirrorCamera.position.copy(view)
      mirrorCamera.up.set(0, 1, 0)
      mirrorCamera.up.applyMatrix4(rotationMatrix)
      mirrorCamera.up.reflect(normal)
      mirrorCamera.lookAt(target)
      mirrorCamera.far = camera.far
      mirrorCamera.updateMatrixWorld()
      mirrorCamera.projectionMatrix.copy(camera.projectionMatrix)

      textureMatrix.set(
        0.5,
        0.0,
        0.0,
        0.5,
        0.0,
        0.5,
        0.0,
        0.5,
        0.0,
        0.0,
        0.5,
        0.5,
        0.0,
        0.0,
        0.0,
        1.0,
      )
      textureMatrix.multiply(mirrorCamera.projectionMatrix)
      textureMatrix.multiply(mirrorCamera.matrixWorldInverse)

      mirrorPlane.setFromNormalAndCoplanarPoint(normal, mirrorWorldPosition)
      mirrorPlane.applyMatrix4(mirrorCamera.matrixWorldInverse)

      clipPlane.set(
        mirrorPlane.normal.x,
        mirrorPlane.normal.y,
        mirrorPlane.normal.z,
        mirrorPlane.constant,
      )

      const projectionMatrix = mirrorCamera.projectionMatrix
      q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0]
      q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5]
      q.z = -1.0
      q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14]

      clipPlane.multiplyScalar(2.0 / clipPlane.dot(q))
      projectionMatrix.elements[2] = clipPlane.x
      projectionMatrix.elements[6] = clipPlane.y
      projectionMatrix.elements[10] = clipPlane.z + 1.0 - clipBias
      projectionMatrix.elements[14] = clipPlane.w

      eye.setFromMatrixPosition(camera.matrixWorld)

      const currentRenderTarget = renderer.getRenderTarget()
      const currentXrEnabled = renderer.xr.enabled
      const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate

      scope.visible = false
      renderer.xr.enabled = false
      renderer.shadowMap.autoUpdate = false

      // Keep depthRT and resolution uniform in sync with the renderer's actual output size
      const rendererSize = renderer.getSize(new Vector2())
      const pixelRatio = renderer.getPixelRatio()
      const rtW = Math.floor(rendererSize.x * pixelRatio)
      const rtH = Math.floor(rendererSize.y * pixelRatio)
      if (depthRT.width !== rtW || depthRT.height !== rtH) {
        depthRT.setSize(rtW, rtH)
        scope.material.uniforms['resolution'].value.set(rtW, rtH)
      }

      // Depth pre-pass — capture scene depth (excluding water) from the main camera
      scene.overrideMaterial = depthMat
      renderer.setRenderTarget(depthRT)
      renderer.state.buffers.depth.setMask(true)
      renderer.clearColor()
      renderer.clearDepth()
      renderer.render(scene, camera)
      scene.overrideMaterial = null

      // Update depth-foam uniforms each frame (near/far may change)
      // tDepth is the RGBA color buffer where RGBADepthPacking wrote packed depth
      scope.material.uniforms['tDepth'].value = depthRT.texture
      scope.material.uniforms['cameraNear'].value = camera.near
      scope.material.uniforms['cameraFar'].value = camera.far

      // Mirror reflection pass
      renderer.setRenderTarget(renderTarget)
      renderer.state.buffers.depth.setMask(true)
      if (renderer.autoClear === false) renderer.clear()
      renderer.render(scene, mirrorCamera)
      scope.visible = true

      renderer.xr.enabled = currentXrEnabled
      renderer.shadowMap.autoUpdate = currentShadowAutoUpdate
      renderer.setRenderTarget(currentRenderTarget)

      const viewport = camera.viewport
      if (viewport !== undefined) renderer.state.viewport(viewport)
    }
  }
}

export { Water }
