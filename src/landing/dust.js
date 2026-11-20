// Faint dust for depth. Each mote is a thin ribbon along the path direction that
// stretches with camera speed, so at warp speed it turns into a streak.

import * as THREE from 'three';
import { rng, pointAt } from './path.js';

const vertex = /* glsl */ `
  attribute vec3 aPos;
  attribute float aSeed;
  uniform float uVelocity;
  uniform vec3 uCam;
  varying float vAlpha;
  varying vec3 vViewPos;
  void main() {
    float len = 0.02 + uVelocity * uVelocity * (3.5 + 3.0 * aSeed);
    vec3 dir = vec3(0.0, 0.0, 1.0);
    vec3 toCam = normalize(uCam - aPos);
    vec3 side = normalize(cross(dir, toCam));
    float width = 0.012 + 0.01 * aSeed;
    vec3 p = aPos + side * position.x * width + dir * (position.y + 0.5) * len;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vViewPos = mv.xyz;
    vAlpha = (0.25 + 0.35 * aSeed) * (1.0 - abs(position.x) * 1.2);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  uniform float uFogDensity;
  uniform float uVelocity;
  varying float vAlpha;
  varying vec3 vViewPos;
  void main() {
    float fd = length(vViewPos);
    float fog = exp(-uFogDensity * uFogDensity * fd * fd);
    float a = vAlpha * fog * (0.55 + 0.45 * uVelocity);
    gl_FragColor = vec4(vec3(0.75) * a, 1.0);
    #include <colorspace_fragment>
  }
`;

export function createDust(path, count, shared) {
  const r = rng(314);
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.getAttribute('position'));
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    pointAt(path, -3 + r() * 136, p);
    pos[i * 3] = p.x + (r() - 0.5) * 16;
    pos[i * 3 + 1] = p.y + (r() - 0.5) * 9;
    pos[i * 3 + 2] = p.z + (r() - 0.5) * 2;
    seed[i] = r();
  }
  geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
  geo.instanceCount = count;
  const uniforms = {
    uVelocity: shared.uVelocity,
    uFogDensity: shared.uFogDensity,
    uCam: { value: new THREE.Vector3() },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return {
    mesh,
    uniforms,
    dispose() {
      geo.dispose();
      base.dispose();
      mat.dispose();
    },
  };
}
