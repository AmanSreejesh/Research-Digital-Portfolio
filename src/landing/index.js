// Landing page controller. Chooses the 3D sequence or the static chat, and plays the
// 3D sequence as steps: each scroll, swipe or arrow key moves to the next stop at a
// fixed speed. After the last step the page scrolls on normally; scrolling back to the
// top steps backward through it again.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Observer } from 'gsap/Observer';
import { renderStatic, renderPreview } from './fallback.js';
import { sAt, outroAt, flipAt, isMobile, STEPS, stepPath, pathAt } from './timeline.js';
import { createAnnotations } from './annotations.js';
import { losses } from '../config.js';
import { scrollToTarget, reducedMotion } from '../common/smooth.js';

gsap.registerPlugin(ScrollTrigger, SplitText, Observer);

const LAST = STEPS.length - 1;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
}

export function initLanding({ lenis = null } = {}) {
  const landing = document.querySelector('[data-landing]');
  if (!landing) return;
  const el = {
    stage: landing.querySelector('[data-stage]'),
    canvasWrap: landing.querySelector('[data-canvas-wrap]'),
    preview: landing.querySelector('[data-preview]'),
    veil: landing.querySelector('[data-veil]'),
    counter: landing.querySelector('[data-counter]'),
    counterMsg: landing.querySelector('[data-counter-msg]'),
    missing: landing.querySelector('[data-missing]'),
    missingDetail: landing.querySelector('[data-missing-detail]'),
    progress: landing.querySelector('[data-progress]'),
    bar: landing.querySelector('[data-progress-bar]'),
    next: landing.querySelector('[data-next]'),
    nextLabel: landing.querySelector('[data-next-label]'),
    skip: landing.querySelector('[data-skip]'),
    headline: landing.querySelector('[data-headline]'),
    staticWrap: landing.querySelector('[data-static-wrap]'),
    list: landing.querySelector('[data-static]'),
    header: document.querySelector('[data-header]'),
  };

  renderStatic(el.list);

  const params = new URLSearchParams(location.search);
  if (reducedMotion || !hasWebGL() || params.has('static')) {
    enterStatic(landing, el);
    return;
  }
  enter3D(landing, el, params, lenis);
}

function enterStatic(landing, el) {
  landing.classList.remove('is-3d');
  landing.classList.add('is-static');
  el.header.classList.remove('is-transparent');
  el.staticWrap.querySelector('.wrap').appendChild(el.headline);
  el.headline.querySelector('.wrap').classList.remove('wrap');
  el.headline.classList.add('reveal');
  landing.querySelectorAll('[data-skip], [data-to-question]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToTarget('#question', { duration: 1.2 });
    }),
  );
}

function enter3D(landing, el, params, lenis) {
  landing.classList.add('is-3d');
  el.header.classList.add('is-transparent');
  renderPreview(el.preview);

  const mobile = isMobile();
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const state = { p: 0 };
  let scene = null;
  let annot = null;
  let failed = false;

  // Headline lines rise and fade in at the last step.
  let headlineTl = null;
  const buildHeadline = () => {
    headlineTl?.kill();
    const lines = [...el.headline.querySelectorAll('.split-line'), el.headline.querySelector('[data-split-block]')];
    headlineTl = gsap
      .timeline({ paused: true })
      .fromTo(lines, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.08, ease: 'power3.out' });
    headlineTl.progress(outroAt(state.p));
  };
  document.fonts.ready.then(() => {
    SplitText.create(el.headline.querySelectorAll('[data-split]'), {
      type: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit: buildHeadline,
    });
  });

  // ---- Progress bar: one segment per step ----
  const segs = STEPS.slice(1).map(() => {
    const li = document.createElement('li');
    li.innerHTML = '<span></span>';
    el.bar.appendChild(li);
    return li.firstChild;
  });

  let step = 0;
  let moving = null; // { from, to, tween }
  let locked = window.scrollY < 10;
  if (!locked) state.p = 1;
  if (!locked) step = LAST;

  const nextText = () => {
    const verb = touch ? 'Swipe up' : 'Scroll';
    if (step === 0) return `${verb} to start`;
    if (step === LAST) return `${verb} to continue`;
    return `${verb} for the next step`;
  };

  const updateProgress = (u = 0) => {
    segs.forEach((s, i) => {
      // Segment i fills while moving from step i to step i + 1.
      let f = i < step ? 1 : 0;
      if (moving) {
        const lo = Math.min(moving.from, moving.to);
        if (i === lo) f = moving.to > moving.from ? u : 1 - u;
      }
      s.style.transform = `scaleX(${f})`;
    });
    const label = nextText();
    if (el.nextLabel.textContent !== label) el.nextLabel.textContent = label;
    // The first prompt is brighter so it's obvious how to start.
    el.progress.classList.toggle('is-start', step === 0 && !moving);
  };

  const render = () => {
    const p = state.p;
    const s = sAt(p);
    const o = outroAt(p);
    const n = Math.min(128, Math.max(0, Math.round(s)));
    el.counterMsg.textContent = `message ${n}`;
    // After message 47 turns red, the counter adds up the requests lost so far (see losses
    // in config.js) and names the latest one.
    const lost = losses.filter((l, i) => (i === 0 ? flipAt(p) > 0.6 : s >= l.at - 0.4));
    const count = lost.length ? `${lost.length} request${lost.length === 1 ? '' : 's'} lost` : '';
    const latest = lost[lost.length - 1];
    const detail = latest ? `latest: ${latest.what}, msg ${latest.at}` : '';
    if (el.missing.textContent !== count) el.missing.textContent = count;
    if (el.missingDetail.textContent !== detail) el.missingDetail.textContent = detail;
    el.missing.classList.toggle('is-on', lost.length > 0);
    el.missingDetail.classList.toggle('is-on', lost.length > 0);
    el.counter.style.opacity = String(1 - o);
    el.skip.style.opacity = String(1 - o);
    el.skip.style.visibility = o > 0.98 ? 'hidden' : '';
    el.veil.style.opacity = String(o * 0.8);
    el.headline.classList.toggle('is-visible', o > 0.001);
    headlineTl?.progress(o);
    scene?.update(p);
  };

  // ---- Moving between steps ----
  let queued = 0;
  const goTo = (target) => {
    if (target < 0 || target > LAST || target === step || moving) return;
    const path = stepPath(step, target);
    const obj = { u: 0 };
    moving = { from: step, to: target };
    moving.tween = gsap.to(obj, {
      u: 1,
      duration: path.duration,
      ease: 'none',
      onUpdate: () => {
        state.p = pathAt(path, obj.u);
        render();
        updateProgress(obj.u);
      },
      onComplete: () => {
        step = target;
        moving = null;
        updateProgress();
        const q = queued;
        queued = 0;
        if (q) move(q);
      },
    });
  };

  const move = (dir) => {
    if (!locked) return;
    if (moving) {
      // A new gesture near the end of a move is remembered and played next.
      if (moving.tween.progress() > 0.6) queued = dir;
      return;
    }
    if (dir > 0) {
      if (step < LAST) goTo(step + 1);
      else release();
    } else if (step > 0) {
      goTo(step - 1);
    }
  };

  // ---- Locking the page while the sequence plays ----
  let leftTop = !locked;
  const release = () => {
    if (!locked) return;
    locked = false;
    leftTop = false;
    observer.disable();
    landing.classList.remove('is-locked');
    lenis?.start();
    scrollToTarget('#question', { duration: 1.1 });
  };
  const lock = () => {
    locked = true;
    observer.enable();
    landing.classList.add('is-locked');
    lenis?.stop();
    updateProgress();
  };

  // One step per gesture. A wheel gesture is a run of events with no gap longer than
  // 180 ms, so a trackpad's coasting after a flick doesn't trigger extra steps.
  let gestureUsed = false;
  let lastWheel = 0;
  window.addEventListener(
    'wheel',
    () => {
      const now = performance.now();
      if (now - lastWheel > 180) gestureUsed = false;
      lastWheel = now;
    },
    { passive: true, capture: true },
  );
  window.addEventListener('touchstart', () => (gestureUsed = false), { passive: true, capture: true });
  const gesture = (dir) => {
    if (gestureUsed) return;
    gestureUsed = true;
    move(dir);
  };

  const observer = Observer.create({
    target: window,
    type: 'wheel,touch',
    wheelSpeed: -1,
    tolerance: 12,
    preventDefault: true,
    onUp: () => gesture(1),
    onDown: () => gesture(-1),
  });
  if (!locked) observer.disable();

  window.addEventListener('keydown', (e) => {
    if (!locked || e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = e.target?.tagName;
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.target?.isContentEditable) return;
    const onControl = tag === 'BUTTON' || tag === 'A';
    if (['ArrowDown', 'PageDown'].includes(e.key) || (e.key === ' ' && !onControl)) {
      e.preventDefault();
      move(1);
    } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
      e.preventDefault();
      move(-1);
    }
  });

  el.next.addEventListener('click', () => move(1));
  landing.querySelectorAll('[data-skip], [data-to-question]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (locked) release();
      else scrollToTarget('#question', { duration: 1.1 });
    }),
  );

  // Coming back up to the top of the page re-enters the sequence at its last step.
  // Dragging the scrollbar past the landing while it's locked lets the page go.
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      if (!locked) {
        if (y > window.innerHeight * 0.5) leftTop = true;
        if (leftTop && y <= 1) lock();
      } else if (y > window.innerHeight * 0.6) {
        locked = false;
        leftTop = true;
        observer.disable();
        landing.classList.remove('is-locked');
        lenis?.start();
        if (moving) moving.tween.progress(1);
        if (step !== LAST) {
          step = LAST;
          state.p = 1;
          render();
          updateProgress();
        }
      }
    },
    { passive: true },
  );

  if (locked) {
    landing.classList.add('is-locked');
    lenis?.stop();
  }

  // Header turns solid once the page scrolls past the landing.
  ScrollTrigger.create({
    trigger: '#question',
    start: 'top 64px',
    onEnter: () => el.header.classList.remove('is-transparent'),
    onLeaveBack: () => el.header.classList.add('is-transparent'),
  });

  const fail = () => {
    if (failed) return;
    failed = true;
    observer.kill();
    moving?.tween.kill();
    locked = false;
    landing.classList.remove('is-locked');
    lenis?.start();
    scene?.dispose();
    scene = null;
    annot?.dispose();
    annot = null;
    enterStatic(landing, el);
    ScrollTrigger.refresh();
  };

  import('./scene.js')
    .then(({ createScene }) =>
      createScene({
        container: el.canvasWrap,
        mobile,
        onLost: fail,
        og: params.has('og'),
        // Annotations follow the bubbles, so they're positioned in the same frame as the render.
        onFrame: (frame, p, s, now, view) => {
          if (!annot) annot = createAnnotations(el.stage, el.veil);
          // On narrow screens the counter sits in the top-left corner, so labels stay below it too.
          const top = headerBottom() + (view.wide ? 0 : 58);
          annot.update(frame, p, s, now, { ...view, top, bottom: progressTop(el.progress, view.height) });
        },
      }),
    )
    .then((created) => {
      if (failed) return created.dispose();
      scene = created;
      scene.update(state.p);
      el.canvasWrap.classList.add('is-ready');
      el.preview.classList.add('is-hidden');
      setTimeout(() => (el.preview.hidden = true), 700);
      // Handy for checking frames from the console: __landing.go(0.62), __landing.next()
      window.__landing = {
        scene,
        state,
        go(p) {
          state.p = p;
          render();
        },
        next: () => move(1),
        prev: () => move(-1),
        get step() {
          return step;
        },
      };
    })
    .catch((err) => {
      console.error('3D landing failed, showing the static version.', err);
      fail();
    });

  updateProgress();
  render();
}

// The labels stay below the header bar and above the progress bar.
// Measured on load and resize, not every frame.
let headerCache = 0;
let progressCache = 0;
function headerBottom() {
  if (!headerCache) {
    const h = document.querySelector('[data-header]');
    headerCache = (h ? h.offsetHeight : 68) + 8;
    window.addEventListener('resize', () => (headerCache = 0), { once: true });
  }
  return headerCache;
}
function progressTop(progress, height) {
  if (!progressCache) {
    progressCache = progress ? progress.offsetHeight + 28 : 12;
    window.addEventListener('resize', () => (progressCache = 0), { once: true });
  }
  return Math.min(progressCache, height * 0.2);
}
