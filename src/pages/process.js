import { boot, initReveal } from '../common/boot.js';
import { initSmooth, reducedMotion } from '../common/smooth.js';
import { initIndexNav } from '../process/index-nav.js';
import { initSources } from '../process/sources.js';

boot();

// Timeline status markers (filled, half-filled, hollow). Set data-status on each row in process.html.
const STATUS_TEXT = { done: 'done', progress: 'in progress', upcoming: 'upcoming' };
document.querySelectorAll('.trow[data-status]').forEach((row) => {
  const s = row.dataset.status;
  const span = document.createElement('span');
  span.className = 'trow__status';
  span.innerHTML = `<span class="dot${s === 'upcoming' ? '' : ` dot--${s}`}" aria-hidden="true"></span>${STATUS_TEXT[s] || s}`;
  row.appendChild(span);
});

// Dropped ideas get crossed out one after another as they scroll into view.
// Timeline track fills up to "Now" when it comes into view.
const once = (els, onIn, opts) => {
  if (reducedMotion || !('IntersectionObserver' in window)) {
    els.forEach((el, i) => onIn(el, i, true));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      onIn(entry.target, els.indexOf(entry.target), false);
    });
  }, opts);
  els.forEach((el) => io.observe(el));
};

const dropped = [...document.querySelectorAll('[data-dropped] li')];
once(
  dropped,
  (li, i, instant) => {
    if (instant) li.classList.add('is-struck');
    else setTimeout(() => li.classList.add('is-struck'), 250 + (i % 3) * 120);
  },
  { rootMargin: '0px 0px -25% 0px' },
);

once([...document.querySelectorAll('[data-track]')], (el) => el.classList.add('is-in'), { threshold: 0.5 });

initSources();
initIndexNav();
initReveal();
initSmooth();
