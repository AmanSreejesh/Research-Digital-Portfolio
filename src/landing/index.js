// Landing page controller. Chooses the 3D sequence or the static chat, pins the
// stage, and turns scroll progress into everything on screen.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { renderStatic, renderPreview } from './fallback.js';
import { sAt, outroAt, flipAt, smoothstep, isMobile } from './timeline.js';
import { createAnnotations } from './annotations.js';
import { losses } from '../config.js';
import { scrollToTarget, reducedMotion } from '../common/smooth.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
}

export function initLanding() {
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
    hint: landing.querySelector('[data-hint]'),
    skip: landing.querySelector('[data-skip]'),
    headline: landing.querySelector('[data-headline]'),
    staticWrap: landing.querySelector('[data-static-wrap]'),
    list: landing.querySelector('[data-static]'),
    header: document.querySelector('[data-header]'),
  };

  renderStatic(el.list);

  landing.querySelectorAll('[data-skip], [data-to-question]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToTarget('#question', { duration: 1.4 });
    }),
  );

  const params = new URLSearchParams(location.search);
  if (reducedMotion || !hasWebGL() || params.has('static')) {
    enterStatic(landing, el);
    return;
  }
  enter3D(landing, el, params);
}

function enterStatic(landing, el) {
  landing.classList.remove('is-3d');
  landing.classList.add('is-static');
  el.header.classList.remove('is-transparent');
  el.staticWrap.querySelector('.wrap').appendChild(el.headline);
  el.headline.querySelector('.wrap').classList.remove('wrap');
  el.headline.classList.add('reveal');
}

function enter3D(landing, el, params) {
  landing.classList.add('is-3d');
  el.header.classList.add('is-transparent');
  renderPreview(el.preview);

  const mobile = isMobile();
  const state = { p: 0 };
  let scene = null;
  let annot = null;
  let failed = false;

  // Headline lines rise and fade in over the last 6% of the scroll.
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
    el.hint.style.opacity = String(1 - smoothstep(0.004, 0.03, p));
    el.veil.style.opacity = String(o * 0.8);
    el.headline.classList.toggle('is-visible', o > 0.001);
    headlineTl?.progress(o);
    scene?.update(p);
  };

  const tween = gsap.to(state, {
    p: 1,
    ease: 'none',
    onUpdate: render,
    scrollTrigger: {
      trigger: landing,
      start: 'top top',
      end: `+=${mobile ? 280 : 300}%`,
      pin: el.stage,
      scrub: 0.5,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

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
    tween.scrollTrigger?.kill(true);
    tween.kill();
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
          annot.update(frame, p, s, now, { ...view, top: headerBottom() });
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
      // Handy for checking frames from the console: __landing.go(0.62)
      window.__landing = {
        scene,
        state,
        go(p) {
          const st = tween.scrollTrigger;
          window.scrollTo(0, st.start + (st.end - st.start) * p);
        },
      };
    })
    .catch((err) => {
      console.error('3D landing failed, showing the static version.', err);
      fail();
    });

  render();
}

// The labels stay below the header bar. Measured on load and resize, not every frame.
let headerCache = 0;
function headerBottom() {
  if (!headerCache) {
    const h = document.querySelector('[data-header]');
    headerCache = (h ? h.offsetHeight : 68) + 8;
    window.addEventListener('resize', () => (headerCache = 0), { once: true });
  }
  return headerCache;
}
