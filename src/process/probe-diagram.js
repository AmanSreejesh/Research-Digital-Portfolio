// Illustration of the repair probe. A main conversation line with a short branch
// off each turn after the first error. Green end = the repaired copy got back on
// track. Red end = it didn't. Same color meanings as the landing page.
// This is a drawing of the method, not data.

import { status } from '../config.js';

const NS = 'http://www.w3.org/2000/svg';
const TURNS = 10;
const FIRST_ERROR = 3; // turn index (0-based) where the model's first wrong answer happens
const FIRST_FAIL = 7; // first turn where the repaired copy no longer recovers

const C = {
  line: '#5a5a5a',
  text: '#ededed',
  text2: '#8c8c8c',
  bg: '#0e0e0e',
};

function el(tag, attrs = {}, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

function draw(container) {
  const vertical = container.clientWidth < 520;
  container.innerHTML = '';

  const W = vertical ? 340 : 640;
  const H = vertical ? 520 : 250;
  const svg = el('svg', {
    viewBox: `0 0 ${W} ${H}`,
    role: 'img',
    'aria-label':
      'Diagram: a conversation of ten turns. The first wrong answer is at turn 4. Repaired copies branched off turns 5, 6 and 7 get back to the right answer. From turn 8 on, the repaired copies stay wrong. The span from turn 4 to turn 8 is labeled recovery window.',
  });

  // Position of turn i along the main line, and the direction branches go.
  const start = vertical ? 40 : 40;
  const end = vertical ? H - 60 : W - 30;
  const pos = (i) => start + ((end - start) * i) / (TURNS - 1);
  const axis = vertical ? 70 : 70; // main line position on the cross axis
  const P = (along, across) => (vertical ? [across, along] : [along, across]);
  const branchLen = vertical ? 150 : 100;

  const g = el('g');
  svg.appendChild(g);

  // Main line.
  const [x1, y1] = P(pos(0), axis);
  const [x2, y2] = P(pos(TURNS - 1), axis);
  g.appendChild(el('line', { x1, y1, x2, y2, stroke: C.line, 'stroke-width': 1.5 }));
  const [lx, ly] = P(pos(0), axis - 22);
  g.appendChild(
    el(
      'text',
      vertical
        ? { x: axis - 16, y: start - 18, 'font-size': 11, fill: C.text2 }
        : { x: lx, y: ly, 'font-size': 11, fill: C.text2 },
      'main conversation',
    ),
  );

  for (let i = 0; i < TURNS; i++) {
    const [tx, ty] = P(pos(i), axis);
    const isError = i === FIRST_ERROR;
    // Turn markers.
    g.appendChild(
      el('circle', {
        cx: tx,
        cy: ty,
        r: isError ? 5 : 3.5,
        fill: isError ? status.wrong : C.bg,
        stroke: isError ? status.wrong : C.text2,
        'stroke-width': 1.25,
      }),
    );
    const [nx, ny] = vertical ? [axis - 14, ty + 4] : [tx, axis - 12];
    g.appendChild(
      el('text', { x: nx, y: ny, 'font-size': 10, fill: C.text2, 'text-anchor': vertical ? 'end' : 'middle' }, String(i + 1)),
    );

    // Branches for turns after the first error.
    if (i > FIRST_ERROR) {
      const ok = i < FIRST_FAIL;
      const color = ok ? status.correct : status.wrong;
      const [bx1, by1] = P(pos(i), axis + 6);
      const [bx2, by2] = vertical ? [axis + branchLen, ty] : [tx, axis + branchLen];
      const [cx, cy] = vertical ? [axis + branchLen * 0.45, ty] : [tx, axis + branchLen * 0.45];
      g.appendChild(
        el('path', {
          d: `M${bx1},${by1} Q${vertical ? `${cx},${by1}` : `${bx1},${cy}`} ${bx2},${by2}`,
          stroke: C.line,
          'stroke-width': 1,
          fill: 'none',
          'stroke-dasharray': '3 3',
        }),
      );
      g.appendChild(el('circle', { cx: bx2, cy: by2, r: 5, fill: color }));
    }
  }

  // First error label.
  const [ex, ey] = P(pos(FIRST_ERROR), axis);
  if (vertical) {
    g.appendChild(el('text', { x: axis - 30, y: ey + 4, 'font-size': 10, fill: C.text, 'text-anchor': 'end' }, 'first error'));
  } else {
    g.appendChild(el('text', { x: ex, y: ey - 28, 'font-size': 10, fill: C.text, 'text-anchor': 'middle' }, 'first error'));
  }

  // Bracket from the first error to the first failed repair.
  const a = pos(FIRST_ERROR);
  const b = pos(FIRST_FAIL);
  const off = branchLen + 26;
  if (vertical) {
    const bxp = axis + off;
    g.appendChild(el('path', { d: `M${bxp - 6},${a} H${bxp} V${b} H${bxp - 6}`, stroke: C.text, fill: 'none', 'stroke-width': 1 }));
    const t = el('text', { x: bxp + 12, y: (a + b) / 2, 'font-size': 11, fill: C.text, 'dominant-baseline': 'middle' });
    t.appendChild(el('tspan', { x: bxp + 12, dy: '-0.6em' }, 'recovery'));
    t.appendChild(el('tspan', { x: bxp + 12, dy: '1.2em' }, 'window'));
    g.appendChild(t);
  } else {
    const byp = axis + off;
    g.appendChild(el('path', { d: `M${a},${byp - 6} V${byp} H${b} V${byp - 6}`, stroke: C.text, fill: 'none', 'stroke-width': 1 }));
    g.appendChild(el('text', { x: (a + b) / 2, y: byp + 18, 'font-size': 11, fill: C.text, 'text-anchor': 'middle' }, 'recovery window'));
  }

  // Legend.
  const legendY = vertical ? H - 26 : 18;
  const legendX = vertical ? 20 : W - 300;
  const items = [
    [status.correct, 'repaired copy gets it right'],
    [status.wrong, 'repaired copy still wrong'],
  ];
  items.forEach(([color, label], k) => {
    const lx2 = vertical ? legendX : legendX + k * 160;
    const ly2 = vertical ? legendY + k * 16 - 8 : legendY;
    g.appendChild(el('circle', { cx: lx2 + 4, cy: ly2 - 3.5, r: 4, fill: color }));
    g.appendChild(el('text', { x: lx2 + 14, y: ly2, 'font-size': 10, fill: C.text2 }, label));
  });

  container.appendChild(svg);
}

export function initProbeDiagram() {
  const container = document.querySelector('[data-probe]');
  if (!container) return;
  draw(container);
  let lastVertical = container.clientWidth < 520;
  new ResizeObserver(() => {
    const v = container.clientWidth < 520;
    if (v !== lastVertical) {
      lastVertical = v;
      draw(container);
    }
  }).observe(container);
}
