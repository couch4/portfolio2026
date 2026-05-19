import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Vertex shader — Y-axis locked billboard (doesn't tilt with camera pitch)
// ---------------------------------------------------------------------------
const vertexShader = /* glsl */`
  uniform float uAspect;   // width / height of a single atlas frame
  varying vec2 vUv;

  void main() {
    vUv = uv;

    // Extract camera right vector from view matrix (world space)
    vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 camUp    = vec3(0.0, 1.0, 0.0); // Y-locked — no pitch tilt

    // World-space centre of this billboard
    vec3 worldCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;

    // Offset from centre using camera-aligned axes
    vec3 worldPos = worldCenter
      + camRight * position.x
      + camUp    * position.y;

    gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Fragment shader — samples the correct 45° octant from a 4×2 atlas
// Atlas layout:  [N][NE][E][SE]
//                [S][SW][W][NW]
// ---------------------------------------------------------------------------
const fragmentShader = /* glsl */`
  uniform sampler2D uAtlas;
  uniform float     uFrame;   // 0–7
  uniform float     uOpacity;
  varying vec2      vUv;

  void main() {
    float col = mod(uFrame, 4.0);
    float row = floor(uFrame / 4.0);

    vec2 uv = vec2(
      (vUv.x + col) / 4.0,
      (vUv.y + (1.0 - row)) / 2.0   // flip Y so row 0 = top
    );

    vec4 color = texture2D(uAtlas, uv);
    if (color.a < 0.15) discard;
    gl_FragColor = vec4(color.rgb, color.a * uOpacity);
  }
`;

// A placeholder checkerboard atlas used when no real texture is provided.
// 4×2 grid, each cell a different green tint — enough to verify frame selection.
function makePlaceholderAtlas() {
  const W = 512, H = 256, CW = 128, CH = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const colors = [
    '#1a4a1a','#1f5c1f','#245e24','#2a6b2a',
    '#1e5a1e','#245824','#296529','#2e722e',
  ];

  for (let i = 0; i < 8; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    ctx.fillStyle = colors[i];
    ctx.fillRect(col * CW, row * CH, CW, CH);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labels = ['N','NE','E','SE','S','SW','W','NW'];
    ctx.fillText(labels[i], col * CW + CW / 2, row * CH + CH / 2);
    // Simple tree silhouette
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(col * CW + CW / 2, row * CH + 10);
    ctx.lineTo(col * CW + CW * 0.2, row * CH + CH - 20);
    ctx.lineTo(col * CW + CW * 0.8, row * CH + CH - 20);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * ImpostorBillboard
 *
 * Renders a single Y-locked billboard that picks the correct 45° frame
 * based on the camera's horizontal angle to the tree.
 *
 * Props:
 *   atlasTexture  — THREE.Texture (4×2 atlas). Falls back to placeholder.
 *   treeHeight    — world-units height, used to size the quad
 *   treeWidth     — world-units width
 *   opacity       — 0–1, for crossfade
 */
export function ImpostorBillboard({
  atlasTexture,
  treeHeight = 8,
  treeWidth  = 5,
  opacity    = 1,
}) {
  const matRef  = useRef();
  const { camera } = useThree();

  const atlas = useMemo(
    () => atlasTexture ?? makePlaceholderAtlas(),
    [atlasTexture]
  );

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uAtlas  : { value: atlas },
      uFrame  : { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader,
    fragmentShader,
    transparent : true,
    side        : THREE.DoubleSide,
    depthWrite  : false,
  }), [atlas]);

  // Y-locked billboard: just a plane, shader does the camera alignment
  const geometry = useMemo(
    () => new THREE.PlaneGeometry(treeWidth, treeHeight),
    [treeWidth, treeHeight]
  );

  // Lift the quad so its base sits at y=0
  useEffect(() => {
    geometry.translate(0, treeHeight / 2, 0);
  }, [geometry, treeHeight]);

  useFrame(() => {
    if (!matRef.current) return;

    // Angle from tree origin to camera, in XZ plane
    const dx    = camera.position.x;
    const dz    = camera.position.z;
    const angle = Math.atan2(dx, dz); // –PI → PI

    // Map to 0–7 octant index
    const frame = Math.round(((angle + Math.PI) / (Math.PI * 2)) * 8) % 8;
    matRef.current.uniforms.uFrame.value   = frame;
    matRef.current.uniforms.uOpacity.value = opacity;
  });

  return (
    <mesh geometry={geometry} material={material}>
      <primitive object={material} ref={matRef} attach="material" />
    </mesh>
  );
}
