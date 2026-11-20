// Things every page needs.

import { site } from '../config.js';
import { initNav } from './nav.js';
import { initReveal } from './reveal.js';
import { initBackdrop } from './backdrop.js';
import { initCountUp } from './countup.js';

export function boot() {
  // Keep every email link in sync with src/config.js.
  document.querySelectorAll('[data-email]').forEach((a) => {
    a.href = `mailto:${site.email}`;
    if (!a.children.length) a.textContent = site.email;
  });
  initBackdrop();
  initNav();
  initCountUp();
}

export { initReveal };
