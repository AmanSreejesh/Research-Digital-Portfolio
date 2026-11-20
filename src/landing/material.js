// Shared geometry and shaders for every chat bubble (readable and filler).
//
// The slab is a rounded rectangle extruded with a small bevel. It's built tiny,
// and the vertex shader pushes each vertex outward by the instance's size, so
// every bubble keeps the same corner radius whatever its size.
//
// Status glow is drawn by a separate "halo" quad behind each AI bubble with a
// soft falloff, instead of a bloom pass, so the green and red stay exact.

import * as THREE from 'three';
import { status } from '../config.js';

export const RADIUS = 0.17;
export const BEVEL = 0.022;
const E = 0.002;
const DEPTH = 0.05;

export const COLORS = {
  userBg: '#ededed',
  userInk: '#111111',
  aiBg: '#1a1a1a',
  aiInk: '#ededed',
  bg: '#060606',
};

export function slabGeometry() {
  const hb = RADIUS + E;
  const s = new THREE.Shape();
  s.moveTo(-E, -hb);
  s.lineTo(E, -hb);
  s.absarc(E, -E, RADIUS, -Math.PI / 2, 0, false);
  s.lineTo(hb, E);
  s.absarc(E, E, RADIUS, 0, Math.PI / 2, false);
  s.lineTo(-E, hb);
  s.absarc(-E, E, RADIUS, Math.PI / 2, Math.PI, false);
  s.lineTo(-hb, -E);
  s.absarc(-E, -E, RADIUS, Math.PI, Math.PI * 1.5, false);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: BEVEL,
    bevelSegments: 2,
    curveSegments: 6,
  });
  g.translate(0, 0, -DEPTH / 2);
  g.deleteAttribute('uv');
  return { geometry: g, baseHalf: hb + BEVEL };
}

const common = /* glsl */ `
  float sdRR(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
`;

const vertex = /* glsl */ `
  attribute vec2 aSize;
  attribute vec4 aInfo;   // side (0 user, 1 ai), status (-1 none, 0 stays green, 1 turns red), slot, seed
  attribute vec2 aExtra;  // red strength, has thumbnail
  uniform float uBaseHalf;
  uniform float uVelocity;
  uniform float uStretch;
  uniform float uWave;
  uniform float uFocus;
  varying vec3 vViewPos;
  varying vec3 vNormalV;
  varying vec2 vLocal;
  varying vec2 vHalf;
  varying float vFront;
  varying vec4 vInfo;
  varying vec2 vExtra;
  varying float vRedOn;
  varying float vPulse;
  varying float vDim;

  // Bubbles the camera has passed swing outward and up, out of the way.
  vec2 passPush(vec4 info) {
    float passed = max(uFocus - 1.2 - info.z, 0.0);
    float side = info.x > 0.5 ? -1.0 : 1.0;
    return vec2(side * (2.2 * passed + 2.5 * passed * passed), 1.6 * passed);
  }

  void main() {
    vec3 p = position;
    vec2 grow = max(aSize * 0.5 - uBaseHalf, 0.0);
    p.xy += sign(p.xy) * grow;
    vFront = step(0.95, normal.z);
    // Velocity streak: the back of the slab stretches away from the camera.
    float st = uVelocity * uVelocity * uStretch * (0.55 + 0.45 * fract(aInfo.w * 13.7));
    if (p.z < 0.0) p.z -= st;
    vLocal = p.xy;
    vHalf = aSize * 0.5;
    vInfo = aInfo;
    vExtra = aExtra;
    float canRed = step(0.5, aInfo.y);
    vRedOn = canRed * smoothstep(aInfo.z - 0.4, aInfo.z + 0.8, uWave);
    vPulse = canRed * exp(-pow((uWave - aInfo.z - 1.5) / 2.4, 2.0));
    vDim = smoothstep(0.6, 3.2, aInfo.z - uFocus);
    vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
    #ifndef SINGLE
      wp.xy += passPush(aInfo);
    #endif
    vec4 mv = viewMatrix * wp;
    vViewPos = mv.xyz;
    vNormalV = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uUserBg;
  uniform vec3 uUserInk;
  uniform vec3 uAiBg;
  uniform vec3 uAiInk;
  uniform vec3 uGreen;
  uniform vec3 uRed;
  uniform vec3 uOrange;
  uniform vec3 uKeyDir;
  uniform vec3 uRim;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uVelocity;
  uniform float uBevel;
  uniform float uRadius;
  #ifdef SINGLE
    uniform sampler2D uMap;
    uniform sampler2D uMapRed;
    uniform float uWipe;
    uniform vec2 uWipeOrigin;
    uniform float uOutlineRed;
    uniform float uStatusOn;
  #endif
  varying vec3 vViewPos;
  varying vec3 vNormalV;
  varying vec2 vLocal;
  varying vec2 vHalf;
  varying float vFront;
  varying vec4 vInfo;
  varying vec2 vExtra;
  varying float vRedOn;
  varying float vPulse;
  varying float vDim;

  ${common}

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  float box(vec2 p, vec2 lo, vec2 hi, float aa) {
    vec2 a = smoothstep(lo - aa, lo + aa, p) * (1.0 - smoothstep(hi - aa, hi + aa, p));
    return a.x * a.y;
  }

  // Unreadable stand-in content: gray text lines, and sometimes a small site preview.
  vec3 fakeFace(vec2 local, vec2 hs, bool ai, float seed, float thumb) {
    vec3 bg = ai ? uAiBg : uUserBg;
    vec3 ink = ai ? uAiInk : uUserInk;
    float pad = 0.18;
    float x = local.x - (-hs.x + pad);
    float y = (hs.y - pad) - local.y;
    float cw = 2.0 * hs.x - 2.0 * pad;
    float thumbH = thumb > 0.5 ? 1.0 : 0.0;
    float textH = 2.0 * hs.y - 2.0 * pad - (thumb > 0.5 ? thumbH + 0.16 : 0.0);
    float lh = 0.19;
    float th = 0.07;
    float n = max(1.0, floor((textH - th) / lh + 1.02));
    float li = floor(y / lh);
    float yin = y - li * lh;
    float aa = max(fwidth(y), 1e-4);
    float inBar = smoothstep(-aa, aa, yin) * (1.0 - smoothstep(th - aa, th + aa, yin));
    float len = li >= n - 1.0 ? 0.3 + 0.45 * hash(seed * 7.0 + li) : 0.8 + 0.2 * hash(seed * 3.0 + li);
    float inX = smoothstep(-aa, aa, x) * (1.0 - smoothstep(cw * len - aa, cw * len + aa, x));
    float valid = step(0.0, y) * step(li, n - 1.0);
    vec3 col = mix(bg, ink, inBar * inX * valid * (ai ? 0.42 : 0.5));
    if (thumb > 0.5) {
      float ty = y - (textH + 0.16);
      float tw = min(cw, thumbH * 1.39);
      vec2 q = vec2(x, ty);
      float page = box(q, vec2(0.0), vec2(tw, thumbH), aa);
      vec3 pc = vec3(0.0035);
      pc = mix(pc, uOrange, box(q, vec2(0.0), vec2(tw, thumbH * 0.11), aa));
      pc = mix(pc, vec3(0.028), box(q, vec2(tw * 0.06, thumbH * 0.2), vec2(tw * 0.3, thumbH * 0.46), aa));
      pc = mix(pc, vec3(0.05), box(q, vec2(tw * 0.36, thumbH * 0.22), vec2(tw * 0.9, thumbH * 0.28), aa));
      pc = mix(pc, vec3(0.03), box(q, vec2(tw * 0.36, thumbH * 0.34), vec2(tw * 0.78, thumbH * 0.39), aa));
      pc = mix(pc, vec3(0.022), box(q, vec2(tw * 0.06, thumbH * 0.58), vec2(tw * 0.94, thumbH * 0.86), aa));
      col = mix(col, pc, page);
    }
    return col;
  }

  void main() {
    vec3 N = normalize(vNormalV);
    vec3 V = normalize(-vViewPos);
    float ndl = clamp(dot(N, normalize(uKeyDir)), 0.0, 1.0);
    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
    bool ai = vInfo.x > 0.5;
    float hasStatus = (ai && vInfo.y > -0.5) ? 1.0 : 0.0;
    float redMix = vRedOn;
    #ifdef SINGLE
      redMix = uOutlineRed;
      hasStatus *= uStatusOn;
    #endif
    vec3 statusCol = mix(uGreen, uRed, redMix);
    vec3 bg = ai ? uAiBg : uUserBg;
    vec3 col;

    if (vFront > 0.5) {
      #ifdef SINGLE
        vec2 uv = vLocal / (2.0 * vHalf) + 0.5;
        vec3 a = texture2D(uMap, uv).rgb;
        vec3 b = texture2D(uMapRed, uv).rgb;
        vec2 asp = vec2(vHalf.x / vHalf.y, 1.0);
        float d = length((uv - uWipeOrigin) * asp);
        float m = (1.0 - smoothstep(uWipe * 2.2 - 0.25, uWipe * 2.2, d)) * step(0.0001, uWipe);
        col = mix(a, b, m);
      #else
        col = fakeFace(vLocal, vHalf, ai, vInfo.w, vExtra.y);
      #endif
      col *= 0.93 + 0.07 * ndl;
      float sd = sdRR(vLocal, vHalf - uBevel, max(uRadius - uBevel, 0.02));
      float aa2 = max(fwidth(sd), 1e-4);
      float ring = 1.0 - smoothstep(0.011 - aa2, 0.011 + aa2, abs(sd + 0.018));
      col = mix(col, statusCol, ring * hasStatus);
    } else {
      col = bg * (0.5 + 0.5 * ndl) + uRim * fres * 0.3;
      col = mix(col, statusCol, hasStatus * 0.3);
      float v2 = uVelocity * uVelocity;
      col += statusCol * hasStatus * v2 * 1.6 * (0.6 + 0.4 * vExtra.x);
      col += vec3(0.5) * (ai ? 0.0 : 1.0) * v2 * 0.12;
    }
    // At warp speed the student's bubbles fade back so the green and red carry the scene.
    if (!ai) col *= 1.0 - 0.7 * uVelocity * uVelocity;

    col += uRed * vPulse * hasStatus * 0.35;
    col *= 1.0 - 0.42 * vDim;
    float fd = length(vViewPos);
    float fogF = 1.0 - exp(-uFogDensity * uFogDensity * fd * fd);
    col = mix(col, uFogColor, clamp(fogF, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const haloVertex = /* glsl */ `
  attribute vec2 aSize;
  attribute vec4 aInfo;
  attribute vec2 aExtra;
  uniform float uPad;
  uniform float uWave;
  uniform float uFocus;
  uniform float uVelocity;
  uniform float uStretch;
  varying vec2 vLocal;
  varying vec2 vHalf;
  varying vec4 vInfo;
  varying vec2 vExtra;
  varying float vRedOn;
  varying float vDim;
  varying vec3 vViewPos;

  // Bubbles the camera has passed swing outward and up, out of the way.
  vec2 passPush(vec4 info) {
    float passed = max(uFocus - 1.2 - info.z, 0.0);
    float side = info.x > 0.5 ? -1.0 : 1.0;
    return vec2(side * (2.2 * passed + 2.5 * passed * passed), 1.6 * passed);
  }

  void main() {
    vec3 p = position;
    vec2 full = aSize + 2.0 * uPad;
    p.xy *= full;
    p.z = -0.04;
    vLocal = p.xy;
    vHalf = aSize * 0.5;
    vInfo = aInfo;
    vExtra = aExtra;
    float canRed = step(0.5, aInfo.y);
    vRedOn = canRed * smoothstep(aInfo.z - 0.4, aInfo.z + 0.8, uWave);
    vDim = smoothstep(0.6, 3.2, aInfo.z - uFocus);
    vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
    #ifndef SINGLE
      wp.xy += passPush(aInfo);
    #endif
    vec4 mv = viewMatrix * wp;
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const haloFragment = /* glsl */ `
  uniform vec3 uGreen;
  uniform vec3 uRed;
  uniform float uRadius;
  uniform float uStrength;
  uniform float uFogDensity;
  #ifdef SINGLE
    uniform float uOutlineRed;
    uniform float uStatusOn;
  #endif
  varying vec2 vLocal;
  varying vec2 vHalf;
  varying vec4 vInfo;
  varying vec2 vExtra;
  varying float vRedOn;
  varying float vDim;
  varying vec3 vViewPos;
  ${common}
  void main() {
    float has = (vInfo.x > 0.5 && vInfo.y > -0.5) ? 1.0 : 0.0;
    float redMix = vRedOn;
    #ifdef SINGLE
      redMix = uOutlineRed;
      has *= uStatusOn;
    #endif
    if (has < 0.5) discard;
    float d = sdRR(vLocal, vHalf, uRadius);
    float glow = exp(-max(d, 0.0) / 0.05) * smoothstep(-0.02, 0.01, d);
    float strength = mix(1.0, 1.25, redMix) * (0.75 + 0.25 * vExtra.x);
    vec3 col = mix(uGreen, uRed, redMix) * glow * uStrength * strength * (1.0 - 0.5 * vDim);
    float fd = length(vViewPos);
    col *= exp(-uFogDensity * uFogDensity * fd * fd);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export function sharedUniforms() {
  const c = (hex) => new THREE.Color(hex);
  return {
    uUserBg: { value: c(COLORS.userBg) },
    uUserInk: { value: c(COLORS.userInk) },
    uAiBg: { value: c(COLORS.aiBg) },
    uAiInk: { value: c(COLORS.aiInk) },
    uGreen: { value: c(status.correct) },
    uRed: { value: c(status.wrong) },
    uOrange: { value: c('#f28c28') },
    uKeyDir: { value: new THREE.Vector3(-0.35, 0.6, 0.72).normalize() },
    uRim: { value: c('#9fb4c8') },
    uFogColor: { value: c(COLORS.bg) },
    uFogDensity: { value: 0.052 },
    uVelocity: { value: 0 },
    uStretch: { value: 7.0 },
    uWave: { value: 46.5 },
    uFocus: { value: 0 },
    uBevel: { value: BEVEL },
    uRadius: { value: RADIUS + BEVEL },
    uBaseHalf: { value: 0 },
  };
}

// One material per bubble set. `single` uniforms (textures) are only used for readable bubbles.
export function bubbleMaterial(shared, { baseHalf, single = null }) {
  const uniforms = { ...shared, uBaseHalf: { value: baseHalf } };
  if (single) Object.assign(uniforms, single);
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
    defines: single ? { SINGLE: '' } : {},
  });
}

export function haloMaterial(shared, { single = null, strength = 0.2 } = {}) {
  const uniforms = {
    uGreen: shared.uGreen,
    uRed: shared.uRed,
    uRadius: shared.uRadius,
    uFogDensity: shared.uFogDensity,
    uWave: shared.uWave,
    uFocus: shared.uFocus,
    uVelocity: shared.uVelocity,
    uStretch: shared.uStretch,
    uPad: { value: 0.24 },
    uStrength: { value: strength },
  };
  if (single) Object.assign(uniforms, single);
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: haloVertex,
    fragmentShader: haloFragment,
    defines: single ? { SINGLE: '' } : {},
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

// Per-instance attributes shared by a bubble mesh and its halo mesh.
export function instanceAttributes(count) {
  return {
    aSize: new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2),
    aInfo: new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4),
    aExtra: new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2),
  };
}

export function applyAttributes(geometry, attrs) {
  for (const [k, v] of Object.entries(attrs)) geometry.setAttribute(k, v);
}

// Orient a bubble so it faces back along the path (toward the camera).
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _e = new THREE.Euler();
export function bubbleMatrix(position, yaw = 0, target = new THREE.Matrix4()) {
  _e.set(0, yaw, 0);
  _q.setFromEuler(_e);
  return target.compose(position, _q, _s);
}
export { _m };
