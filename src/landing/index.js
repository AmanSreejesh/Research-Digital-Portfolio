// Landing page controller. Chooses the 3D sequence or the static chat, pins the
// stage, and turns scroll progress into everything on screen.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { captions, requests } from '../config.js';
import { renderStatic, renderPreview } from './fallback.js';
import { sAt, outroAt, flipAt, smoothstep, isMobile, BEATS, beatOpacity } from './timeline.js';
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
    hint: landing.querySelector('[data-hint]'),
    skip: landing.querySelector('[data-skip]'),
    headline: landing.querySelector('[data-headline]'),
    staticWrap: landing.querySelector('[data-static-wrap]'),
    story: landing.querySelector('[data-story]'),
    captions: landing.querySelector('[data-captions]'),
    spec: landing.querySelector('[data-spec]'),
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
  const story = buildStory(el);

  const mobile = isMobile();
  const state = { p: 0 };
  let scene = null;
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
    el.counter.textContent = `message ${Math.min(128, Math.max(0, Math.round(s)))}`;
    el.counter.style.opacity = String(1 - o);
    el.skip.style.opacity = String(1 - o);
    el.skip.style.visibility = o > 0.98 ? 'hidden' : '';
    el.hint.style.opacity = String(1 - smoothstep(0.004, 0.03, p));
    el.veil.style.opacity = String(o * 0.8);
    story.render(p, s, o);
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

// Narration lines and the "what the student asked for" tracker beside the 3D chat.
function buildStory(el) {
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const byId = Object.fromEntries(captions.map((c) => [c.id, c]));
  const lines = BEATS.map(([id, from, to]) => {
    const p = document.createElement('p');
    p.className = 'story__caption';
    // The word "deleted" in the mistake line is the one place the narration uses red.
    p.innerHTML = esc(byId[id].text).replace('deleted', '<em>deleted</em>');
    el.captions.appendChild(p);
    return { el: p, from, to };
  });

  const items = requests.map((r) => {
    const li = document.createElement('li');
    li.className = 'spec__item';
    li.innerHTML = `<span class="spec__dot"></span><span class="spec__name">${esc(r.name)}</span><span class="spec__short">${esc(r.short)}</span><span class="spec__state">in the site</span>`;
    el.spec.appendChild(li);
    return { r, li, state: li.querySelector('.spec__state'), last: '' };
  });

  return {
    render(p, s, o) {
      lines.forEach((l) => {
        const a = beatOpacity(p, l.from, l.to);
        l.el.style.opacity = String(a);
        l.el.style.transform = `translateY(${(1 - a) * 10}px)`;
      });
      const lost = flipAt(p) > 0.6;
      const missingFor = Math.max(0, Math.min(81, Math.round(s) - 47));
      items.forEach((it) => {
        const on = s >= it.r.from - 0.55;
        const isLost = Boolean(it.r.lostAt) && lost;
        it.li.classList.toggle('is-on', on);
        it.li.classList.toggle('is-new', on && !isLost && s < it.r.from + 1.2 && it.r.from > 0);
        it.li.classList.toggle('is-lost', isLost);
        let text = 'in the site';
        if (isLost) text = missingFor > 1 ? `missing for ${missingFor} messages` : 'missing';
        if (text !== it.last) {
          it.last = text;
          it.state.textContent = text;
        }
      });
      el.story.style.opacity = String(1 - o);
    },
  };
}
