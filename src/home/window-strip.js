// "The recovery window, step by step": a ten-turn conversation that fills in as
// you scroll past it. It illustrates the idea behind the study, not results.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reducedMotion } from '../common/smooth.js';

const TURNS = 10;
const FIRST_MISTAKE = 4;
const FIRST_FAILED_FIX = 8;

// [progress where this step starts, caption]
const STEPS = [
  [0.0, 'Each column is one turn of a conversation. Keep scrolling to fill it in.'],
  [0.1, 'For the first few turns, the model answers correctly.'],
  [0.3, 'At turn 4 it makes its first mistake.'],
  [0.42, 'Give it the missing information at turn 5, 6 or 7, and it gets back on track.'],
  [0.62, 'From turn 8 on, even the right information doesn’t fix it.'],
  [
    0.82,
    'The turns where a fix still works are the recovery window. I’m measuring how long it lasts, and what makes it shorter.',
  ],
];

// When each turn's cells appear, as scroll progress.
function turnAt(t) {
  if (t <= 3) return 0.1 + (t - 1) * 0.06;
  if (t === FIRST_MISTAKE) return 0.3;
  if (t < FIRST_FAILED_FIX) return 0.42 + (t - 5) * 0.06;
  return 0.62 + (t - FIRST_FAILED_FIX) * 0.06;
}

export function initWindowStrip() {
  const fig = document.querySelector('[data-rw]');
  if (!fig) return;
  const grid = fig.querySelector('[data-rw-grid]');
  const caption = fig.querySelector('[data-rw-caption]');

  const turns = [];
  const answers = [];
  const fixes = [];
  const label = (text) => Object.assign(document.createElement('span'), { className: 'rw__rowlabel', textContent: text });

  grid.appendChild(label('Turn'));
  for (let t = 1; t <= TURNS; t++) {
    const el = Object.assign(document.createElement('span'), { className: 'rw__turn', textContent: String(t) });
    turns.push(el);
    grid.appendChild(el);
  }
  grid.appendChild(label("The model's answer"));
  for (let t = 1; t <= TURNS; t++) {
    const el = Object.assign(document.createElement('span'), { className: 'rw__cell rw__cell--answer' });
    answers.push(el);
    grid.appendChild(el);
  }
  grid.appendChild(label('Fix it at this turn?'));
  for (let t = 1; t <= TURNS; t++) {
    const el = Object.assign(document.createElement('span'), { className: 'rw__cell' });
    fixes.push(el);
    grid.appendChild(el);
  }
  const bracketRow = Object.assign(document.createElement('div'), { className: 'rw__bracket-row' });
  const bracket = Object.assign(document.createElement('div'), { className: 'rw__bracket' });
  bracket.style.setProperty('--from', String(FIRST_MISTAKE));
  bracket.style.setProperty('--to', String(FIRST_FAILED_FIX));
  bracket.innerHTML = '<span>recovery window</span>';
  grid.appendChild(Object.assign(document.createElement('span')));
  bracketRow.appendChild(bracket);
  grid.appendChild(bracketRow);

  let lastStep = -1;
  const render = (q) => {
    for (let t = 1; t <= TURNS; t++) {
      const on = q >= turnAt(t);
      const a = answers[t - 1];
      const f = fixes[t - 1];
      const right = t < FIRST_MISTAKE;
      turns[t - 1].classList.toggle('is-active', on);
      a.classList.toggle('is-right', on && right);
      a.classList.toggle('is-wrong', on && !right);
      a.classList.toggle('is-first', on && t === FIRST_MISTAKE && q < 0.42);
      a.textContent = on ? (right ? 'right' : 'wrong') : '';
      const probe = t > FIRST_MISTAKE;
      const fixed = t < FIRST_FAILED_FIX;
      f.classList.toggle('is-empty', !probe);
      f.classList.toggle('is-right', on && probe && fixed);
      f.classList.toggle('is-wrong', on && probe && !fixed);
      f.textContent = on && probe ? (fixed ? 'fixed' : 'too late') : '';
    }
    bracket.classList.toggle('is-on', q >= 0.82);
    let step = 0;
    STEPS.forEach(([from], i) => {
      if (q >= from) step = i;
    });
    if (step !== lastStep) {
      lastStep = step;
      caption.textContent = STEPS[step][1];
    }
  };

  if (reducedMotion) {
    render(1);
    return;
  }
  render(0);
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.create({
    trigger: fig,
    start: 'top 80%',
    end: 'bottom 30%',
    onUpdate: (self) => render(self.progress),
  });
}
