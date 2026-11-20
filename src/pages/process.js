import { initNav } from '../common/nav.js';
import { initReveal } from '../common/reveal.js';
import { initSmooth } from '../common/smooth.js';
import { initIndexNav } from '../process/index-nav.js';
import { initSources } from '../process/sources.js';
import { initConceptMap } from '../process/conceptmap.js';
import { initProbeDiagram } from '../process/probe-diagram.js';

// Timeline status markers (filled, half-filled, hollow). Set data-status on each row in process.html.
const STATUS_TEXT = { done: 'done', progress: 'in progress', upcoming: 'upcoming' };
document.querySelectorAll('.trow[data-status]').forEach((row) => {
  const s = row.dataset.status;
  const span = document.createElement('span');
  span.className = 'trow__status';
  span.innerHTML = `<span class="dot${s === 'upcoming' ? '' : ` dot--${s}`}" aria-hidden="true"></span>${STATUS_TEXT[s] || s}`;
  row.appendChild(span);
});

initNav();
initSources();
initConceptMap();
initProbeDiagram();
initIndexNav();
initReveal();
initSmooth();
