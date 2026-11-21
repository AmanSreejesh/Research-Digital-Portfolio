// The conversation path: 129 message slots (0 to 128) receding into -Z.
// User bubbles sit right of the path, AI bubbles left. Slots also step down a
// little in Y so the chat still reads top to bottom.

import * as THREE from 'three';

export const SLOTS = 129;
export const LAST = SLOTS - 1;

// Alternating sides. The student sends two messages in a row at 90-91 (hidden
// inside the warp) so that message 128 lands on the AI's side.
export function sideOf(k) {
  if (k === LAST) return 'ai';
  if (k <= 90) return k % 2 === 0 ? 'user' : 'ai';
  return k % 2 === 1 ? 'user' : 'ai';
}

// Deterministic random numbers (seeded at load, never at render time).
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Wide screens have room beside the chat for the annotations; narrow screens put them above and below.
export const isWideLayout = (w, h) => w >= 900 && w / h >= 1.1;

export function layoutParams(w, h) {
  return isWideLayout(w, h)
    ? { wide: true, column: 4.1, dz: 1.15, stack: 0.95, gap: 0.5, drift: 0.22 }
    : { wide: false, column: 3.95, dz: 1.1, stack: 1.0, gap: 0.45, drift: 0.1, extraGap: 1.0 };
}

// sizes[k] = { w, h } in world units. Returns slot centers and a curve through them.
export function buildPath(sizes, params) {
  const centers = [];
  let y = 0;
  let z = 0;
  for (let k = 0; k < SLOTS; k++) {
    if (k > 0) {
      y -= params.stack * (sizes[k - 1].h / 2 + sizes[k].h / 2 + params.gap);
      // Extra space after some bubbles (set by scene.js) for the labels underneath them.
      if (params.extraAfter && params.extraAfter.has(k - 1)) y -= params.extraGap || 0;
      z -= params.dz;
    }
    const x = params.drift * (Math.sin(k * 0.13) + 0.5 * Math.sin(k * 0.047 + 1.3));
    centers.push(new THREE.Vector3(x, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(centers, false, 'catmullrom', 0.5);
  return { centers, curve };
}

// Point on the path at slot s (fractional), clamped and extrapolated a little past the ends.
export function pointAt(path, s, target = new THREE.Vector3()) {
  const n = path.centers.length - 1;
  if (s <= 0) {
    const a = path.centers[0];
    const b = path.centers[1];
    return target.copy(a).addScaledVector(b.clone().sub(a), s);
  }
  if (s >= n) {
    const a = path.centers[n];
    const b = path.centers[n - 1];
    return target.copy(a).addScaledVector(a.clone().sub(b), s - n);
  }
  return path.curve.getPoint(s / n, target);
}

// Bubble center for slot k: AI bubbles are left-aligned to the column, user bubbles right-aligned.
export function bubbleCenter(path, k, size, params, target = new THREE.Vector3()) {
  target.copy(path.centers[k]);
  const half = params.column / 2;
  target.x += sideOf(k) === 'ai' ? -half + size.w / 2 : half - size.w / 2;
  return target;
}
