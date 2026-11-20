// Interactive concept map, drawn as SVG from src/data/conceptmap.json.
// Positions are set by hand in the JSON (no physics layout).
// Desktop/tablet: map plus a side panel. Phones: a vertical list (see main.css).

import data from '../data/conceptmap.json';

const NS = 'http://www.w3.org/2000/svg';
const W = 960;
const H = 660;
const PAD_X = 14;
const PAD_Y = 10;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function el(tag, attrs = {}, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

// Point where the line from the box center toward (tx, ty) leaves the box.
function exitPoint(box, tx, ty) {
  const dx = tx - box.cx;
  const dy = ty - box.cy;
  const sx = box.w / 2 / Math.abs(dx || 1e-6);
  const sy = box.h / 2 / Math.abs(dy || 1e-6);
  const s = Math.min(sx, sy);
  return [box.cx + dx * s, box.cy + dy * s];
}

const nodeById = Object.fromEntries(data.nodes.map((n) => [n.id, n]));

function satelliteId(s) {
  return `sat-${s.parent}-${s.paper}`;
}

function relLabel(rel) {
  return rel ? `<span class="paper__rel">${esc(rel)}</span>` : '';
}

function paperItem(p) {
  return `<li>
    <a class="paper__cite" href="${p.url}">${esc(p.cite)}</a>${relLabel(p.rel)}
    <span class="paper__sum">${esc(p.sum)}</span>
  </li>`;
}

function panelHtml(id) {
  if (id.startsWith('sat-')) {
    const sat = data.satellites.find((s) => satelliteId(s) === id);
    const parent = nodeById[sat.parent];
    const p = parent.papers[sat.paper];
    return `<p class="label" style="margin-bottom:8px">${esc(p.rel)} · ${esc(parent.label.replace(/\n/g, ' '))}</p>
      <h4>${esc(p.cite)}</h4>
      <p class="cmap__desc">${esc(p.sum)}</p>
      <a class="paper__cite" href="${p.url}">Read the paper</a>`;
  }
  const n = nodeById[id];
  const title = n.label.replace(/\n/g, ' ');
  const sub = n.sub && n.kind !== 'center' ? `<p class="label" style="margin-bottom:8px">${esc(n.sub)}</p>` : '';
  const papers = n.papers.length
    ? `<p class="label" style="margin-bottom:4px">${n.papers.length} ${n.papers.length === 1 ? 'paper' : 'papers'}</p><ul>${n.papers.map(paperItem).join('')}</ul>`
    : '';
  const link = n.link ? `<p><a href="${n.link}">Read the research plan</a></p>` : '';
  return `${sub}<h4>${esc(title)}</h4><p class="cmap__desc">${esc(n.desc)}</p>${papers}${link}`;
}

function buildSvg(wrap, panel) {
  const svg = el('svg', {
    viewBox: `0 0 ${W} ${H}`,
    role: 'group',
    'aria-label': 'Concept map of the literature. Select a topic to list its papers.',
  });
  const edgeLayer = el('g');
  const nodeLayer = el('g');
  svg.append(edgeLayer, nodeLayer);
  wrap.appendChild(svg);

  const defs = el('defs');
  const marker = el('marker', {
    id: 'cm-arrow',
    viewBox: '0 0 10 10',
    refX: 9,
    refY: 5,
    markerWidth: 7,
    markerHeight: 7,
    orient: 'auto-start-reverse',
  });
  marker.appendChild(el('path', { d: 'M0,1 L9,5 L0,9', fill: 'none', stroke: '#8c8c8c', 'stroke-width': 1.2 }));
  defs.appendChild(marker);
  svg.prepend(defs);

  const boxes = {};
  const groups = {};

  const addNode = (id, x, y, lines, sub, kind) => {
    const g = el('g', {
      class: `node${kind ? ` node--${kind}` : ''}`,
      tabindex: 0,
      role: 'button',
      'data-id': id,
    });
    const text = el('text', { 'text-anchor': 'middle' });
    const lineH = kind === 'center' ? 22 : kind === 'paper' ? 15 : 19;
    const subLines = sub ? sub.split('\n') : [];
    const total = lines.length + subLines.length;
    const startY = y - ((total - 1) * lineH) / 2 + 4;
    lines.forEach((ln, i) => text.appendChild(el('tspan', { x, y: startY + i * lineH }, ln)));
    subLines.forEach((ln, i) =>
      text.appendChild(el('tspan', { x, y: startY + (lines.length + i) * lineH, class: 'node__sub' }, ln)),
    );
    const rect = el('rect', { rx: 2, ry: 2 });
    g.append(rect, text);
    nodeLayer.appendChild(g);
    const bb = text.getBBox();
    const w = bb.width + PAD_X * 2;
    const h = bb.height + PAD_Y * 2;
    rect.setAttribute('x', x - w / 2);
    rect.setAttribute('y', bb.y - PAD_Y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    boxes[id] = { cx: x, cy: bb.y - PAD_Y + h / 2, w, h };
    groups[id] = g;
    const label = [...lines, ...subLines].join(' ');
    g.setAttribute('aria-label', label);
  };

  data.nodes.forEach((n) => addNode(n.id, n.x, n.y, n.label.split('\n'), n.sub, n.kind));
  data.satellites.forEach((s) => {
    const p = nodeById[s.parent].papers[s.paper];
    addNode(satelliteId(s), s.x, s.y, [p.cite], p.rel, 'paper');
  });

  const edges = [];
  const drawEdge = (from, to, dashed) => {
    const a = boxes[from];
    const b = boxes[to];
    const [x1, y1] = exitPoint(a, b.cx, b.cy);
    const [x2, y2] = exitPoint(b, a.cx, a.cy);
    const line = el('line', {
      x1,
      y1,
      x2,
      y2,
      class: `edge${dashed ? ' edge--dashed' : ''}`,
      'marker-end': dashed ? '' : 'url(#cm-arrow)',
    });
    edgeLayer.appendChild(line);
    edges.push({ from, to, line });
  };
  data.edges.forEach((e) => drawEdge(e.from, e.to, false));
  data.satellites.forEach((s) => drawEdge(satelliteId(s), s.parent, true));

  const select = (id) => {
    Object.entries(groups).forEach(([gid, g]) => {
      const on = gid === id;
      g.classList.toggle('is-selected', on);
      g.setAttribute('aria-pressed', String(on));
    });
    edges.forEach((e) => e.line.classList.toggle('is-lit', e.from === id || e.to === id));
    panel.innerHTML = panelHtml(id);
  };

  svg.addEventListener('click', (e) => {
    const g = e.target.closest('.node');
    if (g) select(g.dataset.id);
  });
  svg.addEventListener('keydown', (e) => {
    const g = e.target.closest('.node');
    if (g && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      select(g.dataset.id);
    }
  });

  select(data.selected);
}

function buildMobile(container) {
  const center = nodeById.center;
  const others = data.nodes.filter((n) => n.id !== 'center');
  container.innerHTML = `
    <div class="cmap-mobile__center">
      <p class="label" style="margin-bottom:6px">center of the map</p>
      <h3 class="h3">${esc(center.label)}</h3>
      <p class="muted" style="font-size:0.9375rem;margin-top:6px">${esc(center.desc)}</p>
    </div>
    ${others
      .map(
        (n) => `
      <details>
        <summary><span>${esc(n.label.replace(/\n/g, ' '))}</span><span class="label">${n.sub ? 'tested' : n.papers.length ? `${n.papers.length}` : ''}</span></summary>
        <div class="cmap-mobile__body">
          <p class="muted" style="font-size:0.9375rem;margin-bottom:12px">${esc(n.desc)}</p>
          ${
            n.papers.length
              ? `<ul>${n.papers
                  .map(
                    (p) => `<li class="${p.rel === 'disagrees' || p.rel === 'complicates' ? 'is-dissent' : ''}">
                  <a class="mono" style="font-size:0.75rem" href="${p.url}">${esc(p.cite)}</a>${p.rel ? ` <span class="label">${esc(p.rel)}</span>` : ''}
                  <span class="muted" style="display:block;margin-top:2px">${esc(p.sum)}</span></li>`,
                  )
                  .join('')}</ul>`
              : n.link
                ? `<a href="${n.link}">Read the research plan</a>`
                : ''
          }
        </div>
      </details>`,
      )
      .join('')}`;
}

export function initConceptMap() {
  const wrap = document.querySelector('[data-cmap-svg]');
  const panel = document.querySelector('[data-cmap-panel]');
  const mobile = document.querySelector('[data-cmap-mobile]');
  if (!wrap) return;
  buildMobile(mobile);
  // getBBox needs the SVG to be rendered, so wait for fonts and build when visible.
  const build = () => {
    if (wrap.childElementCount) return;
    buildSvg(wrap, panel);
  };
  const ready = document.fonts ? document.fonts.ready : Promise.resolve();
  ready.then(() => {
    if (wrap.offsetParent !== null) build();
    else {
      const mq = window.matchMedia('(min-width: 700px)');
      const onChange = () => mq.matches && build();
      mq.addEventListener('change', onChange);
    }
  });
}
