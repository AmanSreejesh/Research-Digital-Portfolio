// About 120 filler bubbles: one InstancedMesh (one draw call) plus one for their glow.
// Their status, red spread and streaks all come from uniforms set each frame.

import * as THREE from 'three';
import { sideOf, rng, bubbleCenter } from './path.js';
import { bubbleMaterial, haloMaterial, instanceAttributes, applyAttributes, bubbleMatrix } from './material.js';

const PAD = 0.18;
const LH = 0.19;
const TH = 0.07;

// Sizes for every non-readable slot, decided once from a fixed seed.
export function fillerSizes(readableSlots, mobile) {
  const r = rng(20261217);
  const sizes = {};
  const info = {};
  for (let k = 0; k <= 128; k++) {
    if (readableSlots.has(k)) continue;
    const ai = sideOf(k) === 'ai';
    const lines = ai ? 2 + Math.floor(r() * 3) : 1 + Math.floor(r() * 2);
    const thumb = ai && r() < 0.3;
    const w = ai ? 2.5 + r() * 0.9 : 1.5 + r() * 1.3;
    let h = PAD * 2 + (lines - 1) * LH + TH;
    if (thumb) h += 0.16 + 1.0;
    sizes[k] = { w: thumb ? Math.max(w, 1.75) : w, h };
    info[k] = { ai, thumb, seed: r() * 100 };
  }
  // Mixed statuses right after the mistake: the AI is still right about a few
  // unrelated things for about a dozen messages, then everything is red.
  const r2 = rng(47);
  for (let k = 48; k <= 127; k++) {
    if (!info[k] || !info[k].ai) continue;
    const greenChance = k < 61 ? 0.45 * (1 - (k - 48) / 13) : 0;
    info[k].staysGreen = r2() < greenChance;
    info[k].redStrength = Math.min(1, 0.45 + ((k - 48) / 80) * 0.55);
  }
  // On phones, drop every other pair of messages inside the warp (nobody can read them there).
  if (mobile) {
    for (let k = 49; k <= 126; k++) {
      if (info[k] && Math.floor((k - 48) / 2) % 2 === 1) info[k].skip = true;
    }
  }
  return { sizes, info };
}

export function createFiller({ sizes, info }, { shared, slab }) {
  const slots = Object.keys(info)
    .map(Number)
    .filter((k) => !info[k].skip);
  const n = slots.length;
  const attrs = instanceAttributes(n);
  const geo = slab.geometry.clone();
  applyAttributes(geo, attrs);
  const mesh = new THREE.InstancedMesh(geo, bubbleMaterial(shared, { baseHalf: slab.baseHalf }), n);
  mesh.frustumCulled = false;

  const hgeo = new THREE.PlaneGeometry(1, 1);
  applyAttributes(hgeo, attrs);
  const halo = new THREE.InstancedMesh(hgeo, haloMaterial(shared, { strength: 0.18 }), n);
  halo.instanceMatrix = mesh.instanceMatrix;
  halo.frustumCulled = false;
  halo.renderOrder = 2;

  slots.forEach((k, i) => {
    const s = sizes[k];
    const inf = info[k];
    attrs.aSize.setXY(i, s.w, s.h);
    // status: -1 none (student), 0 stays green, 1 turns red when the wave passes
    let st = -1;
    if (inf.ai) st = k > 47 && !inf.staysGreen ? 1 : 0;
    attrs.aInfo.setXYZW(i, inf.ai ? 1 : 0, st, k, inf.seed);
    attrs.aExtra.setXY(i, inf.redStrength ?? 0.6, inf.thumb ? 1 : 0);
  });

  const pos = new THREE.Vector3();
  const m = new THREE.Matrix4();
  // Positions depend on the path, which changes between wide and narrow screens.
  const place = (path, params) => {
    slots.forEach((k, i) => {
      bubbleCenter(path, k, sizes[k], params, pos);
      mesh.setMatrixAt(i, bubbleMatrix(pos, info[k].ai ? params.yaw : -params.yaw, m));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  const group = new THREE.Group();
  group.add(mesh, halo);
  return {
    group,
    count: n,
    place,
    dispose() {
      geo.dispose();
      hgeo.dispose();
      mesh.material.dispose();
      halo.material.dispose();
    },
  };
}
