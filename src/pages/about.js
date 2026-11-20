import { site } from '../config.js';
import { initNav } from '../common/nav.js';
import { initReveal } from '../common/reveal.js';
import { initSmooth } from '../common/smooth.js';

// Keep the contact link in sync with src/config.js.
document.querySelectorAll('[data-email]').forEach((a) => {
  a.href = `mailto:${site.email}`;
  a.textContent = site.email;
});

initNav();
initReveal();
initSmooth();
