// Numbers with data-count="39" count up from zero the first time they come into view.
// Optional data-suffix="%" and data-format="comma".

import { reducedMotion } from './smooth.js';

const fmt = (n, format) => (format === 'comma' ? Math.round(n).toLocaleString('en-US') : String(Math.round(n)));

export function initCountUp(root = document) {
  const items = [...root.querySelectorAll('[data-count]')];
  const finalText = (el) => fmt(Number(el.dataset.count), el.dataset.format) + (el.dataset.suffix || '');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => (el.textContent = finalText(el)));
    return;
  }
  items.forEach((el) => (el.textContent = fmt(0, el.dataset.format) + (el.dataset.suffix || '')));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const el = entry.target;
        const target = Number(el.dataset.count);
        const dur = 1400;
        const start = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - start) / dur);
          const e = 1 - Math.pow(1 - t, 3);
          el.textContent = fmt(target * e, el.dataset.format) + (el.dataset.suffix || '');
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    },
    { threshold: 0.4 },
  );
  items.forEach((el) => io.observe(el));
}
