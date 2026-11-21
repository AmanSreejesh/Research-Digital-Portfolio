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
import { GHOST } from './thumbnails.js';
import { sAt, velocityAt, flipAt, waveAt, outroAt, pushAt, smoothstep } from './timeline.js';

const BASE_FOV = 45;

export async function createScene({ container, mobile, onLost, onFrame, og = false }) {
  try {
    await document.fonts.load('500 16px "IBM Plex Mono"');
  } catch {
    /* the annotation labels are measured after this font loads; they fall back to the system mono font */
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
  const aiReadables = new Set(script.filter((m) => m.side === 'ai').map((m) => m.pos));
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
  let pairY = [];

  const layout = () => {
    const next = layoutParams(width, height);
    if (params && next.wide === params.wide) return;
    params = next;
    // Narrow screens put the AI's labels under its bubble, so leave extra room there.
    params.extraAfter = params.wide ? null : aiReadables;
    path = buildPath(sizes, params);
    filler.place(path, params);
    const c = new THREE.Vector3();
    readables.forEach((r) => {
      bubbleCenter(path, r.msg.pos, r.size, params, c);
      r.base = c.clone();
      r.group.position.copy(c);
    });
    if (dust) {
      scene.remove(dust.mesh);
      dust.dispose();
    }
    dust = createDust(path, mobile ? 150 : 300, shared);
    scene.add(dust.mesh);
    // Vertical middle of each (student, AI) pair, so both messages stay framed.
    pairY = [];
    for (let j = 0; j < SLOTS; j++) {
      const a = Math.max(0, j - 1);
      const b = Math.max(1, j);
      const top = path.centers[a].y + sizes[a].h / 2;
      const bottom = path.centers[b].y - sizes[b].h / 2 - 0.3;
      pairY.push((top + bottom) / 2);
    }
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
  // The chat sits in the middle of the frame with room on both sides (wide screens) or
  // above and below (narrow screens) for the annotations.
  let dist = 6;
  const computeDistance = () => {
    const aspect = width / height;
    const t = Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2));
    if (params.wide) {
      camera.setViewOffset(width, height, 0, -height * 0.045, width, height);
      // Squarer screens give the chat a little less width so the labels beside it fit.
      const wNeed = (params.column * 1.12) / (aspect < 1.5 ? 0.5 : 0.56);
      dist = Math.max(wNeed / 2 / (t * aspect), 6.1 / 2 / t);
      zoom.center = [0.5, 0.455];
    } else {
      camera.setViewOffset(width, height, 0, -height * 0.02, width, height);
      const wNeed = params.column * 1.06;
      // About 7.6 units of height: the pair of messages plus room for a label above and below.
      dist = Math.max(wNeed / 2 / (t * aspect), 7.6 / 2 / t);
      zoom.center = [0.5, 0.48];
    }
  };
  computeDistance();

  const focus = new THREE.Vector3();
  const look = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const pushCam = new THREE.Vector3();
  const ghostWorld = new THREE.Vector3();
  const ghostRect = GHOST.gallery;
  const ghostLocal = byPos[47].anchors.thumb(ghostRect.x + ghostRect.w / 2, ghostRect.y + ghostRect.h / 2);
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

    // Camera sits behind the pair (s - 1, s), a little to the right, looking slightly ahead.
    const f = s - 0.45;
    pointAt(path, f, focus);
    pointAt(path, f + 0.6, look);
    const side = params.wide ? 0.9 : 0.25;
    const j0 = Math.min(SLOTS - 1, Math.max(0, Math.floor(s)));
    const j1 = Math.min(SLOTS - 1, j0 + 1);
    const cy = pairY[j0] + (pairY[j1] - pairY[j0]) * (s - Math.floor(s));
    camPos.set(focus.x + side, cy + 0.5 - o * 1.3, focus.z + dist);
    look.x = focus.x;
    look.y = cy + 0.3 - o * 1.3;

    // After the flip, move in on the red marker where the sign-up form used to be.
    const k = pushAt(p);
    shared.uSpot.value = k;
    if (k > 0) {
      ghostWorld.copy(ghostLocal).add(byPos[47].group.position);
      // Aim a little below the marker so it sits above the middle and the next message stays out of frame.
      // Narrow screens already fill the width with the bubble, so they move in less.
      pushCam.set(ghostWorld.x + side * 0.35, ghostWorld.y - 0.15, ghostWorld.z + dist * (params.wide ? 0.66 : 0.82));
      ghostWorld.y -= 0.4;
      camPos.lerp(pushCam, k);
      look.lerp(ghostWorld, k);
    }
    camera.position.copy(camPos);
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

  // ---- Screen positions for the annotations (src/landing/annotations.js) ----
  const pv = new THREE.Vector3();
  const toScreen = (out) => {
    pv.project(camera);
    out.x = (pv.x + 1) * 0.5 * width;
    out.y = (1 - pv.y) * 0.5 * height;
    return out;
  };
  const frameApi = {
    info: (pos) => ({ anchors: byPos[pos].anchors, size: byPos[pos].size, side: byPos[pos].msg.side }),
    // A point given in a readable bubble's own coordinates, on its front face.
    project(pos, lx, ly, out) {
      const r = byPos[pos];
      pv.set(lx, ly, 0.045).add(r.group.position);
      return toScreen(out);
    },
    // A point on the conversation path at slot s, shifted by (dx, dy) world units.
    projectPath(slot, dx, dy, out) {
      pointAt(path, slot, pv);
      pv.x += dx;
      pv.y += dy;
      return toScreen(out);
    },
  };

  // ---- Loop ----
  let visible = true;
  let raf = 0;
  let disposed = false;
  const tick = (now) => {
    raf = 0;
    if (disposed || !visible) return;
    apply(now);
    camera.updateMatrixWorld();
    onFrame?.(frameApi, progress, sAt(progress), now, { width, height, wide: params.wide });
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
      const prev = { progress, width, height };
      progress = p;
      width = 1200;
      height = 630;
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      composer.setSize(width, height, false);
      camera.aspect = width / height;
      layout();
      computeDistance();
      apply(performance.now());
      composer.render();
      const url = renderer.domElement.toDataURL('image/png');
      await fetch('/__save-og', { method: 'POST', body: url });
      ({ progress, width, height } = prev);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
      renderer.setSize(width, height, false);
      composer.setSize(width, height, false);
      camera.aspect = width / height;
      layout();
      computeDistance();
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
