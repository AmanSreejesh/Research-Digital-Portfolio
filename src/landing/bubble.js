// The nine readable bubbles. Each face (background, text and site preview) is
// drawn to a 2D canvas at 2x resolution and used as a texture.

import * as THREE from 'three';
import { status } from '../config.js';
import { drawThumb, THUMB_RATIO } from './thumbnails.js';
import { COLORS, bubbleMaterial, haloMaterial, instanceAttributes, applyAttributes } from './material.js';

const CHAT_FONT = '-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// World-unit text metrics.
const FS = 0.152;
const LH = 0.216;
const PAD = 0.22;
const THUMB_W = 2.5;
const THUMB_H = THUMB_W * THUMB_RATIO;
const MAX_W = { user: 3.0, ai: 3.7 };

function tokenize(text, highlight) {
  const words = text.split(' ');
  let hlStart = -1;
  let hlEnd = -1;
  if (highlight) {
    const i = text.indexOf(highlight);
    hlStart = text.slice(0, i).split(' ').length - 1;
    hlEnd = hlStart + highlight.split(' ').length - 1;
  }
  return words.map((w, i) => ({ w, hl: i >= hlStart && i <= hlEnd && hlStart >= 0 }));
}

function layoutText(ctx, tokens, maxW) {
  const space = ctx.measureText(' ').width;
  const lines = [];
  let line = [];
  let x = 0;
  for (const t of tokens) {
    const w = ctx.measureText(t.w).width;
    if (line.length && x + w > maxW) {
      lines.push({ items: line, width: x - space });
      line = [];
      x = 0;
    }
    line.push({ ...t, x, width: w });
    x += w + space;
  }
  if (line.length) lines.push({ items: line, width: x - space });
  return lines;
}

export function measureMessage(msg, ppu) {
  const c = document.createElement('canvas').getContext('2d');
  const px = FS * ppu;
  c.font = `${px}px ${CHAT_FONT}`;
  const maxTextW = (MAX_W[msg.side] - PAD * 2) * ppu;
  const lines = layoutText(c, tokenize(msg.text, msg.highlight), maxTextW);
  const textW = Math.max(...lines.map((l) => l.width)) / ppu;
  const contentW = msg.thumb ? Math.max(textW, THUMB_W) : textW;
  const w = Math.min(MAX_W[msg.side], contentW + PAD * 2 + 0.02);
  const textH = (lines.length - 1) * LH + FS * 1.05;
  const h = PAD * 2 + textH + (msg.thumb ? 0.2 + THUMB_H : 0);
  return { w, h, lines, textH };
}

function drawFace(canvas, msg, m, ppu, { chars = Infinity, red = false } = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const user = msg.side === 'user';
  ctx.fillStyle = user ? COLORS.userBg : COLORS.aiBg;
  ctx.fillRect(0, 0, W, H);
  const px = FS * ppu;
  ctx.font = `${px}px ${CHAT_FONT}`;
  ctx.textBaseline = 'alphabetic';
  let left = chars;
  const x0 = PAD * ppu;
  const y0 = PAD * ppu + px * 0.86;
  const space = ctx.measureText(' ').width;
  m.lines.forEach((line, li) => {
    line.items.forEach((it, wi) => {
      if (left <= 0) return;
      const shown = it.w.slice(0, Math.max(0, left));
      left -= it.w.length + 1;
      const hot = red && it.hl;
      ctx.fillStyle = hot ? status.wrong : user ? COLORS.userInk : COLORS.aiInk;
      const by = y0 + li * LH * ppu;
      ctx.fillText(shown, x0 + it.x, by);
      if (hot) {
        // Underline the false claim, joined across the spaces between its words.
        const next = line.items[wi + 1];
        const w = it.width + (next && next.hl ? space : 0);
        ctx.fillRect(x0 + it.x, by + px * 0.16, w, Math.max(2, px * 0.075));
      }
    });
  });
  if (msg.thumb && chars === Infinity) {
    const ty = (PAD + m.textH + 0.2) * ppu;
    const ghost = red || (msg.status === 'wrong' && !msg.highlight);
    drawThumb(ctx, x0, ty, THUMB_W * ppu, THUMB_H * ppu, msg.thumb, { ghost });
  }
}

// Front face of the slab, in the bubble's own coordinates (see slabGeometry in material.js).
const FACE_Z = 0.045;

// Points on the bubble that the annotations attach to, in the bubble's own coordinates.
function anchorPoints(m, size, ppu) {
  const left = -size.w / 2;
  const top = size.h / 2;
  const thumbLeft = left + PAD;
  const thumbTop = top - (PAD + m.textH + 0.2);
  const v = (x, y) => new THREE.Vector3(x, y, FACE_Z);
  // The highlighted sentence's box (first to last highlighted word).
  let hl = null;
  m.lines.forEach((line, li) =>
    line.items.forEach((it) => {
      if (!it.hl) return;
      const x0 = left + PAD + it.x / ppu;
      const x1 = x0 + it.width / ppu;
      const yMid = top - PAD - FS * 0.45 - li * LH;
      if (!hl) hl = { x0, x1, y0: yMid, y1: yMid };
      hl.x0 = Math.min(hl.x0, x0);
      hl.x1 = Math.max(hl.x1, x1);
      hl.y1 = Math.min(hl.y1, yMid);
    }),
  );
  return {
    // fx, fy from 0 to 1 across the bubble, measured from its top-left corner
    face: (fx, fy) => v(left + fx * size.w, top - fy * size.h),
    // fx, fy from 0 to 1 across the site preview
    thumb: (fx, fy) => v(thumbLeft + fx * THUMB_W, thumbTop - fy * THUMB_H),
    // the end of the highlighted sentence, at the middle of its last line
    highlightEnd: () => (hl ? v(hl.x1 + 0.04, hl.y1) : null),
  };
}

// UV center of the highlighted sentence, where message 47's red starts.
function highlightOrigin(m, size) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  m.lines.forEach((line, li) =>
    line.items.forEach((it) => {
      if (!it.hl) return;
      minX = Math.min(minX, it.x);
      maxX = Math.max(maxX, it.x + it.width);
      minY = Math.min(minY, li);
      maxY = Math.max(maxY, li);
    }),
  );
  if (minX === Infinity) return new THREE.Vector2(0.5, 0.5);
  return { minX, maxX, minY, maxY, size };
}

export function createReadable(msg, size, m, { shared, slab, ppu, anisotropy }) {
  const W = Math.ceil(size.w * ppu);
  const H = Math.ceil(size.h * ppu);
  const makeCanvas = () => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return c;
  };
  const canvas = makeCanvas();
  drawFace(canvas, msg, m, ppu);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;

  let texRed = tex;
  let origin = new THREE.Vector2(0.5, 0.5);
  if (msg.highlight) {
    const c2 = makeCanvas();
    drawFace(c2, msg, m, ppu, { red: true });
    texRed = new THREE.CanvasTexture(c2);
    texRed.colorSpace = THREE.SRGBColorSpace;
    texRed.anisotropy = anisotropy;
    const o = highlightOrigin(m, size);
    const cx = (PAD + (o.minX + o.maxX) / 2 / ppu) / size.w;
    const cy = (PAD + FS * 0.5 + ((o.minY + o.maxY) / 2) * LH) / size.h;
    origin = new THREE.Vector2(cx, 1 - cy);
  }

  const single = {
    uMap: { value: tex },
    uMapRed: { value: texRed },
    uWipe: { value: msg.status === 'wrong' && !msg.highlight ? 0 : 0 },
    uWipeOrigin: { value: origin },
    uOutlineRed: { value: msg.status === 'wrong' && !msg.highlight ? 1 : 0 },
    uStatusOn: { value: 1 },
  };

  const geo = slab.geometry.clone();
  const attrs = instanceAttributes(1);
  attrs.aSize.setXY(0, size.w, size.h);
  const isAi = msg.side === 'ai';
  attrs.aInfo.setXYZW(0, isAi ? 1 : 0, msg.status ? 0 : -1, msg.pos, msg.pos * 0.37);
  attrs.aExtra.setXY(0, 1, 0);
  applyAttributes(geo, attrs);
  const mesh = new THREE.InstancedMesh(geo, bubbleMaterial(shared, { baseHalf: slab.baseHalf, single }), 1);
  mesh.frustumCulled = false;

  const group = new THREE.Group();
  group.add(mesh);

  const out = { msg, group, mesh, size, single, halo: null, anchors: anchorPoints(m, size, ppu) };

  if (isAi && msg.status) {
    const hgeo = new THREE.PlaneGeometry(1, 1);
    applyAttributes(hgeo, attrs);
    const halo = new THREE.InstancedMesh(hgeo, haloMaterial(shared, { single, strength: 0.24 }), 1);
    halo.frustumCulled = false;
    halo.renderOrder = 2;
    group.add(halo);
    out.halo = halo;
  }

  // Typing effect (message 1 on load).
  const totalChars = msg.text.length;
  let lastChars = -1;
  out.setTyped = (t) => {
    const chars = t >= 1 ? Infinity : Math.floor(totalChars * t);
    if (chars === lastChars) return;
    lastChars = chars;
    drawFace(canvas, msg, m, ppu, { chars });
    tex.needsUpdate = true;
  };

  out.setStatusOn = (o) => {
    single.uStatusOn.value = o;
  };

  // Message 47: 0 = green, 1 = fully red. The red starts at the highlighted sentence.
  out.setFlip = (f) => {
    single.uWipe.value = f;
    single.uOutlineRed.value = Math.min(1, Math.max(0, (f - 0.45) / 0.4));
  };

  out.dispose = () => {
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
    tex.dispose();
    if (texRed !== tex) texRed.dispose();
  };

  return out;
}
