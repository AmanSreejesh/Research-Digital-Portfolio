import { boot, initReveal } from '../common/boot.js';
import { initSmooth, reducedMotion } from '../common/smooth.js';

boot();
initReveal();
initSmooth();

// "I'm into ___": types out each interest, then deletes it.
const el = document.querySelector('[data-rotate]');
if (el && !reducedMotion) {
  const words = el.dataset.rotate.split('|');
  let i = 0;
  let shown = words[0];
  let deleting = false;
  let wait = 1800;
  const tick = () => {
    const word = words[i];
    if (!deleting) {
      if (shown.length < word.length) {
        shown = word.slice(0, shown.length + 1);
        wait = 60;
      } else {
        deleting = true;
        wait = 1800;
      }
    } else if (shown.length > 0) {
      shown = shown.slice(0, -1);
      wait = 32;
    } else {
      deleting = false;
      i = (i + 1) % words.length;
      wait = 220;
    }
    el.textContent = shown;
    setTimeout(tick, wait);
  };
  setTimeout(tick, wait);
}
