// Renderer, camera, bubbles, dust and postprocessing for the landing sequence.
// update(p) sets everything from scroll progress; the render loop only runs
// while the landing is on screen.

import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  NoiseEffect,
  VignetteEffect,
  ChromaticAberrationEffect,
  BlendFunction,
} from 'postprocessing';
import { script } from '../config.js';
import { SLOTS, layoutParams, buildPath, pointAt, bubbleCenter } from './path.js';
import { slabGeometry, sharedUniforms } from './material.js';
import { measureMessage, createReadable } from './bubble.js';
import { fillerSizes, createFiller } from './filler.js';
import { createDust } from './dust.js';
import { ZoomBlurEffect } from './zoomblur.js';
import { sAt, velocityAt, flipAt, waveAt, outroAt, smoothstep } from './timeline.js';

const BASE_FOV = 45;

export async function createScene({ container, mobile, onLost, og = false }) {
  try {
    await document.fonts.load('500 16px "IBM Plex Mono"');
  } catch {
    /* labels fall back to the system mono font */
  }

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: og,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  container.appendChild(renderer.domElement);

  let width = container.clientWidth || window.innerWidth;
  let height = container.clientHeight || window.innerHeight;
  renderer.setSize(width, height, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#060606');
  scene.fog = new THREE.FogExp2('#060606', 0.052);
  const camera = new THREE.PerspectiveCamera(BASE_FOV, width / height, 0.1, 140);

  // ---- Content ----
  const ppu = mobile ? 210 : 256;
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const shared = sharedUniforms();
  const slab = slabGeometry();

  const measured = script.map((msg) => ({ msg, m: measureMessage(msg, ppu) }));
  const readableSlots = new Set(script.map((m) => m.pos));
  const fillerData = fillerSizes(readableSlots, mobile);
  const sizes = [];
  for (let k = 0; k < SLOTS; k++) {
    const r = measured.find((x) => x.msg.pos === k);
    sizes[k] = r ? { w: r.m.w, h: r.m.h } : fillerData.sizes[k];
  }

  const readables = measured.map(({ msg, m }) =>
    createReadable(msg, sizes[msg.pos], m, { shared, slab, ppu, anisotropy }),
  );
  readables.forEach((r) => scene.add(r.group));
  const byPos = Object.fromEntries(readables.map((r) => [r.msg.pos, r]));

  const filler = createFiller(fillerData, { shared, slab });
  scene.add(filler.group);

  let params = null;
  let path = null;
  let dust = null;

  const layout = () => {
    const next = layoutParams(width / height);
    if (params && next.column === params.column) return;
    params = next;
    path = buildPath(sizes, params);
    filler.place(path, params);
    const c = new THREE.Vector3();
    readables.forEach((r) => {
      bubbleCenter(path, r.msg.pos, r.size, params, c);
      r.base = c.clone();
      r.group.position.copy(c);
      r.group.rotation.y = r.msg.side === 'ai' ? params.yaw : -params.yaw;
      r.placeNote(false);
    });
    if (dust) {
      scene.remove(dust.mesh);
      dust.dispose();
    }
    dust = createDust(path, mobile ? 150 : 300, shared);
    scene.add(dust.mesh);
  };
  layout();

  // ---- Postprocessing ----
  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
    multisampling: mobile ? 0 : 4,
  });
  composer.addPass(new RenderPass(scene, camera));
  const zoom = new ZoomBlurEffect({ samples: mobile ? 8 : 16 });
  const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
  noise.blendMode.opacity.value = 0.09;
  const vignette = new VignetteEffect({ offset: 0.28, darkness: 0.62 });
  composer.addPass(new EffectPass(camera, zoom, noise, vignette));
  let chroma = null;
  if (!mobile) {
    chroma = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0, 0),
      radialModulation: true,
      modulationOffset: 0.2,
    });
    composer.addPass(new EffectPass(camera, chroma));
  }
  composer.setSize(width, height, false);

  // ---- Camera ----
  let dist = 6;
  const computeDistance = () => {
    const aspect = width / height;
    const t = Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2));
    const narrow = params.column < 5;
    const wNeed = params.column * (narrow ? 1.1 : 1.12);
    const hNeed = narrow ? 5.2 : 4.7;
    // The student's bubble sits about half a slot closer than the focus point, so fit the width there.
    dist = Math.max(wNeed / 2 / (t * aspect) + params.dz * 0.5, hNeed / 2 / t);
  };
  computeDistance();

  const focus = new THREE.Vector3();
  const look = new THREE.Vector3();
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const onPointer = (e) => {
    parallax.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    parallax.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  if (finePointer) window.addEventListener('pointermove', onPointer, { passive: true });

  // ---- State from scroll ----
  let progress = 0;
  const start = performance.now();
  const opening = byPos[1];

  const apply = (now) => {
    const p = progress;
    const s = sAt(p);
    const v = velocityAt(p);
    const o = outroAt(p);

    // Typing on load (message 1), skipped once the visitor scrolls.
    const typed = p > 0.015 || og ? 1 : smoothstep(0, 1, (now - start - 250) / 800);
    opening.setTyped(typed);
    opening.setStatusOn(p > 0.015 || og ? 1 : smoothstep(0, 1, (now - start - 1100) / 350));

    byPos[47].setFlip(flipAt(p));

    // Same outward swing as the filler bubbles (see passPush in material.js).
    readables.forEach((r) => {
      const passed = Math.max(s - 1.2 - r.msg.pos, 0);
      const side = r.msg.side === 'ai' ? -1 : 1;
      r.group.position.set(
        r.base.x + side * (2.2 * passed + 2.5 * passed * passed),
        r.base.y + 1.6 * passed,
        r.base.z,
      );
    });

    shared.uVelocity.value = v;
    shared.uFocus.value = s;
    shared.uWave.value = waveAt(p, s);

    // Camera sits behind the pair (s - 1, s) and looks slightly ahead.
    const f = s - 0.45;
    pointAt(path, f, focus);
    pointAt(path, f + 0.6, look);
    const narrow = params.column < 5;
    const lift = narrow ? 0.15 : 0.55;
    camera.position.set(focus.x * 0.6, focus.y + lift - o * 1.3, focus.z + dist);
    look.x = focus.x * 0.6 + (look.x - focus.x) * 0.3;
    look.y = (look.y + focus.y) / 2 - (narrow ? 0.25 : 0.2) - o * 1.3;
    camera.lookAt(look);

    if (finePointer) {
      parallax.x += (parallax.tx - parallax.x) * 0.05;
      parallax.y += (parallax.ty - parallax.y) * 0.05;
      const k = THREE.MathUtils.degToRad(1.5) * (1 - v);
      camera.rotateY(-parallax.x * k);
      camera.rotateX(-parallax.y * k);
    }

    camera.fov = BASE_FOV + 25 * smoothstep(0.25, 0.95, v);
    camera.updateProjectionMatrix();
    dust.uniforms.uCam.value.copy(camera.position);

    zoom.strength = (mobile ? 0.2 : 0.3) * v * v;
    if (chroma) {
      const c = 0.0032 * smoothstep(0.6, 1, v);
      chroma.offset.set(c, c * 0.6);
    }
  };

  // ---- Loop ----
  let visible = true;
  let raf = 0;
  let disposed = false;
  const tick = (now) => {
    raf = 0;
    if (disposed || !visible) return;
    apply(now);
    composer.render();
    raf = requestAnimationFrame(tick);
  };
  const startLoop = () => {
    if (!raf && visible && !disposed) raf = requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      startLoop();
    },
    { threshold: 0 },
  );
  io.observe(container);

  const ro = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h || (w === width && h === height)) return;
    width = w;
    height = h;
    renderer.setSize(width, height, false);
    composer.setSize(width, height, false);
    camera.aspect = width / height;
    layout();
    computeDistance();
    startLoop();
  });
  ro.observe(container);

  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    onLost?.();
  });

  apply(performance.now());
  composer.render();
  startLoop();

  return {
    update(p) {
      progress = p;
      startLoop();
    },
    // Dev helper: render one frame at 1200x630 and save it as public/og.png (only with ?og on the dev server).
    async captureOG(p = 0.735) {
      const prev = progress;
      progress = p;
      renderer.setPixelRatio(1);
      renderer.setSize(1200, 630, false);
      composer.setSize(1200, 630, false);
      camera.aspect = 1200 / 630;
      apply(performance.now());
      composer.render();
      const url = renderer.domElement.toDataURL('image/png');
      await fetch('/__save-og', { method: 'POST', body: url });
      progress = prev;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
      renderer.setSize(width, height, false);
      composer.setSize(width, height, false);
      camera.aspect = width / height;
      return 'saved public/og.png';
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      readables.forEach((r) => r.dispose());
      filler.dispose();
      dust?.dispose();
      slab.geometry.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
