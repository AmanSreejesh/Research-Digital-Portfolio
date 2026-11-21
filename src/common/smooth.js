// Light smoothing for mouse-wheel scrolling with Lenis. Off for reduced motion; touch
// keeps native scrolling. It follows the wheel closely so the page doesn't feel floaty.
// (The 3D landing on the home page pauses it while its steps play.)

import Lenis from 'lenis';

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis = null;

export function initSmooth({ gsap, ScrollTrigger } = {}) {
  if (reducedMotion) return null;
  lenis = new Lenis({ lerp: 0.22, smoothWheel: true, anchors: { offset: -64 } });
  if (gsap && ScrollTrigger) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => {
      lenis.raf(t);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }
  return lenis;
}

export function scrollToTarget(target, opts = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: opts.offset ?? 0, immediate: opts.immediate, duration: opts.duration ?? 1.2, force: true });
  else el.scrollIntoView({ behavior: reducedMotion || opts.immediate ? 'auto' : 'smooth' });
}
