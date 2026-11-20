// Site-wide background: a quiet dot grid. Slow waves of slightly brighter dots
// drift across it, dots near the cursor light up a little, and the grid moves
// a bit slower than the page when you scroll. With reduced motion it's a still grid.

import { reducedMotion } from './smooth.js';

const SPACING = 30;
const BASE = 0.13;

export function initBackdrop() {
  const canvas = document.createElement('canvas');
  canvas.className = 'backdrop';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  let w = 0;
  let h = 0;
  let dpr = 1;
  const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    draw(performance.now());
  };

  function draw(now) {
    const t = reducedMotion ? 0 : now / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const offY = -((window.scrollY * 0.25) % SPACING);
    const cols = Math.ceil(w / SPACING) + 1;
    const rows = Math.ceil(h / SPACING) + 2;
    const x0 = (w % SPACING) / 2;
    for (let j = 0; j < rows; j++) {
      const y = offY + j * SPACING;
      const gy = j + Math.floor((window.scrollY * 0.25) / SPACING);
      for (let i = 0; i < cols; i++) {
        const x = x0 + i * SPACING;
        let a = BASE;
        if (!reducedMotion) {
          // Two slow waves crossing each other; only their peaks show.
          const wave = Math.sin(i * 0.21 + t * 0.35) * Math.sin(gy * 0.17 - t * 0.27) + Math.sin((i + gy) * 0.09 + t * 0.2);
          const peak = Math.max(0, wave - 0.9);
          a += peak * 0.2;
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 32400) {
            const k = 1 - Math.sqrt(d2) / 180;
            a += k * k * 0.45;
          }
        }
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
      }
    }
  }

  resize();
  window.addEventListener('resize', resize);

  if (reducedMotion) {
    window.addEventListener('scroll', () => draw(0), { passive: true });
    return;
  }

  window.addEventListener(
    'pointermove',
    (e) => {
      pointer.tx = e.clientX;
      pointer.ty = e.clientY;
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => {
    pointer.tx = -9999;
    pointer.ty = -9999;
  });

  // About 30 frames a second is plenty for something this slow.
  let last = 0;
  const loop = (now) => {
    requestAnimationFrame(loop);
    if (document.hidden || now - last < 33) return;
    last = now;
    if (pointer.tx < -999) {
      pointer.x = pointer.tx;
      pointer.y = pointer.ty;
    } else {
      if (pointer.x < -999) {
        pointer.x = pointer.tx;
        pointer.y = pointer.ty;
      }
      pointer.x += (pointer.tx - pointer.x) * 0.2;
      pointer.y += (pointer.ty - pointer.y) * 0.2;
    }
    draw(now);
  };
  requestAnimationFrame(loop);
}
