// Smooth scrolling with Lenis on desktop. Off for reduced motion and touch
// (phones keep their native scrolling). No snapping or scroll hijacking.

import Lenis from 'lenis';

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis = null;

export function initSmooth({ gsap, ScrollTrigger } = {}) {
  if (reducedMotion) return null;
  lenis = new Lenis({ duration: 1.1, smoothWheel: true, anchors: { offset: -64 } });
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
  if (lenis) lenis.scrollTo(el, { offset: opts.offset ?? 0, immediate: opts.immediate, duration: opts.duration ?? 1.2 });
  else el.scrollIntoView({ behavior: reducedMotion || opts.immediate ? 'auto' : 'smooth' });
}
