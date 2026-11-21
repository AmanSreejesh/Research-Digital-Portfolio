// Labels that point at the 3D chat while it moves. Each one is a dot on a bubble, a
// thin line and a short label. Frames with corner marks go around parts of the site
// previews: the sign-up form in message 31, then the empty spot where it used to be.
// A dashed "clash" callout links the student's message 46 to the earlier request it
// overrides, which is why the form disappears.
// Positions are recomputed every frame from the 3D scene, so the labels travel with
// the bubbles. The text lives in src/config.js (annotations).

import { annotations as TEXT } from '../config.js';
import { GHOST, GHOST_NAV, WHOLE, FORM_RECT } from './thumbnails.js';

// at:    'edge' (the bubble's outer edge), 'highlightEnd' (the end of the false sentence),
//        'mark' (a marked phrase in a student message), 'frame' (a box around part of the
//        preview), 'path' (a point in the replies ahead)
// side:  where the label goes on wide screens (default: AI left, student right)
// nside: where it goes on narrow screens (default: student above, AI below)
// from/to: scroll progress (the beats are listed at the top of timeline.js);
//        narrowFrom/narrowTo override them on narrow screens, where labels share less room
// tone:  'note' (white), 'correct', 'wrong', or 'clash' (white, dashed)
// key:   large red text. small: smaller text. nlabel: false hides the label on narrow screens.
// load:  for the first pair, seconds after the page loads before the label appears
const SPECS = [
  { id: 'ask0', pos: 0, at: 'edge', from: -1, to: 0.064, load: 1.5 },
  { id: 'build1', pos: 1, at: 'edge', tone: 'correct', from: -1, to: 0.064, load: 1.9 },
  { id: 'ask14', pos: 14, at: 'edge', from: 0.138, to: 0.256 },
  { id: 'done15', pos: 15, at: 'edge', tone: 'correct', from: 0.147, to: 0.256 },
  { id: 'ask30', pos: 30, at: 'edge', from: 0.328, to: 0.446 },
  { id: 'form31', pos: 31, at: 'frame', rect: FORM_RECT, tone: 'correct', from: 0.337, to: 0.446 },
  { id: 'ask46', pos: 46, at: 'edge', from: 0.512, to: 0.625, narrowTo: 0.534 },
  { id: 'clash46', pos: 46, at: 'mark', side: 'left', nside: 'above', tone: 'clash', from: 0.528, to: 0.625, narrowFrom: 0.536, narrowTo: 0.612 },
  { id: 'done47', pos: 47, at: 'edge', tone: 'correct', from: 0.56, to: 0.603 },
  { id: 'claim47', pos: 47, at: 'highlightEnd', side: 'right', nside: 'above', tone: 'wrong', from: 0.612, to: 0.725, narrowFrom: 0.614 },
  { id: 'lost47', pos: 47, at: 'frame', rect: GHOST.gallery, tone: 'wrong', key: true, from: 0.62, to: 0.725 },
  { id: 'after', at: 'path', tone: 'wrong', from: 0.738, to: 0.858 },
  { id: 'claim128', pos: 128, at: 'edge', nside: 'above', tone: 'wrong', key: true, from: 0.874, to: 0.952 },
  { id: 'nav128', pos: 128, at: 'frame', rect: GHOST_NAV, side: 'right', tone: 'wrong', small: true, nlabel: false, from: 0.882, to: 0.952 },
  { id: 'dark128', pos: 128, at: 'frame', rect: WHOLE, anchorY: 0.62, side: 'right', tone: 'wrong', small: true, nlabel: false, from: 0.888, to: 0.952 },
  { id: 'lost128', pos: 128, at: 'frame', rect: GHOST.final, tone: 'wrong', small: true, from: 0.894, to: 0.952 },
];

const SVGNS = 'http://www.w3.org/2000/svg';
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function el(name, cls) {
  const e = document.createElementNS(SVGNS, name);
  e.setAttribute('class', cls);
  return e;
}

function meta(spec, side) {
  if (spec.at === 'path') return ['msg 48 to 128', ''];
  if (spec.at === 'frame') return [`msg ${spec.pos} · site preview`, ''];
  const who = side === 'user' ? 'student' : 'AI';
  return [`msg ${spec.pos} · ${who}`, spec.tone === 'correct' ? 'correct' : spec.tone === 'wrong' ? 'wrong' : ''];
}

// Corner marks around a (perspective) quad. pad pushes the corners outward in screen pixels.
function cornerPath(c, pad, len) {
  const P = [
    [c[0].x - pad, c[0].y - pad],
    [c[1].x + pad, c[1].y - pad],
    [c[2].x + pad, c[2].y + pad],
    [c[3].x - pad, c[3].y + pad],
  ];
  let d = '';
  for (let i = 0; i < 4; i++) {
    const [x, y] = P[i];
    const a = P[(i + 3) % 4];
    const b = P[(i + 1) % 4];
    const da = Math.hypot(a[0] - x, a[1] - y) || 1;
    const db = Math.hypot(b[0] - x, b[1] - y) || 1;
    const la = Math.min(len, da * 0.3);
    const lb = Math.min(len, db * 0.3);
    d += `M${(x + ((a[0] - x) / da) * la).toFixed(1)} ${(y + ((a[1] - y) / da) * la).toFixed(1)}`;
    d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
    d += `L${(x + ((b[0] - x) / db) * lb).toFixed(1)} ${(y + ((b[1] - y) / db) * lb).toFixed(1)}`;
  }
  return d;
}

function labelHtml(t) {
  return [
    '<span class="annot__meta"><span class="annot__idx"></span><span class="annot__state"></span></span>',
    `<span class="annot__text">${esc(t.text || '')}</span>`,
    t.quote ? `<span class="annot__quote">${esc(t.quote)}</span>` : '',
    t.sub ? `<span class="annot__sub">${esc(t.sub)}</span>` : '',
  ].join('');
}

export function createAnnotations(stage, before) {
  const root = document.createElement('div');
  root.className = 'annot';
  root.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'annot__svg');
  root.appendChild(svg);
  stage.insertBefore(root, before || null);

  const items = SPECS.map((spec) => {
    const tone = spec.tone || 'note';
    const mods = `${spec.key ? ' is-key' : ''}${spec.small ? ' is-small' : ''}`;
    const g = el('g', `annot__g annot--${tone}${mods}`);
    const ping = spec.key && spec.at === 'frame' ? el('path', 'annot__ping') : null;
    const hasFrame = spec.at === 'frame' || spec.at === 'mark';
    const frame = hasFrame ? el('path', 'annot__frame') : null;
    const line = el('path', 'annot__line');
    const dot = el('circle', 'annot__dot');
    dot.setAttribute('r', '4');
    // Clash callouts are dashed, and get a dark outline so they show on the white bubble too.
    const clash = tone === 'clash';
    const halos = clash ? [el('path', 'annot__halo'), hasFrame ? el('path', 'annot__halo') : null] : [];
    if (!clash) [line, frame].forEach((e) => e && e.setAttribute('pathLength', '1'));
    [ping, ...halos, frame, line, dot].forEach((e) => e && g.appendChild(e));
    svg.appendChild(g);

    const t = typeof TEXT[spec.id] === 'string' ? { text: TEXT[spec.id] } : TEXT[spec.id] || {};
    const label = document.createElement('div');
    label.className = `annot__label annot--${tone}${mods}`;
    label.innerHTML = labelHtml(t);
    root.appendChild(label);
    return {
      t,
      halos,
      spec,
      g,
      line,
      dot,
      frame,
      ping,
      label,
      idx: label.querySelector('.annot__idx'),
      state: label.querySelector('.annot__state'),
      on: false,
      onAt: 0,
      offAt: -1e9,
      metaText: '',
      w: 0,
      h: 0,
      place: '',
      local: null,
    };
  });

  const A = { x: 0, y: 0 };
  const E = { x: 0, y: 0 };
  const C = [0, 1, 2, 3].map(() => ({ x: 0, y: 0 }));
  let lastW = 0;
  let lastH = 0;
  let lastWide = null;
  const start = performance.now();

  // Local anchor points on each bubble, computed once (they don't change with the camera).
  function localsFor(it, frame) {
    const { spec } = it;
    if (spec.at === 'path') return {};
    const info = frame.info(spec.pos);
    const a = info.anchors;
    const out = { info };
    if (spec.at === 'frame') {
      const r = spec.rect;
      out.corners = [a.thumb(r.x, r.y), a.thumb(r.x + r.w, r.y), a.thumb(r.x + r.w, r.y + r.h), a.thumb(r.x, r.y + r.h)];
      const ay = r.y + (spec.anchorY != null ? spec.anchorY : r.h / 2);
      out.wideA = a.thumb(spec.side === 'right' ? r.x + r.w : r.x, ay);
      out.narrowA = a.thumb(r.x + r.w * 0.1, r.y + r.h);
    } else if (spec.at === 'mark') {
      out.corners = a.markCorners();
      out.wideA = a.markLeft();
      out.narrowA = a.markTop();
    } else if (spec.at === 'highlightEnd') {
      out.wideA = a.highlightEnd();
      out.narrowA = out.wideA;
    } else {
      // first line of text, on the outer edge (wide); top or bottom edge (narrow)
      const fy = Math.min(0.5, 0.32 / info.size.h);
      const fx = info.side === 'user' ? 0.12 : 0.1;
      out.wideA = a.face(info.side === 'ai' ? 0 : 1, fy);
      out.narrowAbove = a.face(fx, 0);
      out.narrowBelow = a.face(fx, 1);
    }
    return out;
  }

  function anchorFor(it, wide, place) {
    const l = it.local;
    if (wide) return l.wideA;
    if (l.narrowAbove) return place === 'above' ? l.narrowAbove : l.narrowBelow;
    return l.narrowA;
  }

  function setOn(it, on, now) {
    if (on === it.on) return;
    it.on = on;
    it.g.classList.toggle('is-on', on);
    it.label.classList.toggle('is-on', on);
    if (on) it.onAt = now;
    else it.offAt = now;
  }

  return {
    // frame: projection helpers from scene.js. p: scroll progress. s: camera slot.
    update(frame, p, s, now, { width, height, wide, top, bottom = 12 }) {
      if (width !== lastW || height !== lastH || wide !== lastWide) {
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        root.classList.toggle('is-wide', wide);
        root.classList.toggle('is-narrow', !wide);
        items.forEach((it) => (it.w = 0));
        lastW = width;
        lastH = height;
        lastWide = wide;
      }
      const gutter = clamp(width * 0.04, 16, 48);
      const elapsed = (now - start) / 1000;

      for (const it of items) {
        const { spec } = it;
        const from = !wide && spec.narrowFrom != null ? spec.narrowFrom : spec.from;
        const to = !wide && spec.narrowTo != null ? spec.narrowTo : spec.to;
        let want = p >= from && p <= to && !(spec.load && p < 0.015 && elapsed < spec.load);
        if (!want && !it.on && now - it.offAt > 450) continue;

        if (!it.local) it.local = localsFor(it, frame);
        const info = it.local.info;
        const bubbleSide = info ? info.side : 'ai';

        if (!it.metaText) {
          const [m, st] = it.t.meta ? [it.t.meta, ''] : meta(spec, bubbleSide);
          it.metaText = m;
          it.idx.textContent = m;
          it.state.textContent = st ? ` · ${st}` : '';
        }

        // Some frames only keep their label on wide screens.
        const labelOff = !wide && spec.nlabel === false;
        if (labelOff !== it.labelOff) {
          it.labelOff = labelOff;
          it.g.classList.toggle('is-nolabel', labelOff);
          it.label.classList.toggle('is-nolabel', labelOff);
        }

        const place = wide
          ? spec.side || (bubbleSide === 'ai' ? 'left' : 'right')
          : spec.nside || (bubbleSide === 'user' ? 'above' : 'below');

        // Anchor in screen space.
        let la = null;
        if (spec.at === 'path') {
          // Just ahead of the camera, on the AI side of the stream.
          frame.projectPath(s + 1.2, -1.45, 0.25, A);
        } else {
          la = anchorFor(it, wide, place);
          frame.project(spec.pos, la.x, la.y, A);
        }
        if (want && (A.x < 4 || A.x > width - 4 || A.y < top || A.y > height - 8)) want = false;
        setOn(it, want, now);

        if (place !== it.place) {
          it.place = place;
          it.label.classList.toggle('is-left', place === 'left');
          it.label.style.removeProperty('--cap');
          it.cap = 0;
          it.w = 0;
        }

        // Wide screens: the label can't be wider than the space beside the bubble.
        if (wide) {
          if (spec.at === 'path') {
            E.x = A.x;
            E.y = A.y;
          } else {
            const ex = place === 'left' ? -info.size.w / 2 : info.size.w / 2;
            frame.project(spec.pos, spec.at === 'highlightEnd' ? la.x : ex, la.y, E);
          }
          const avail = place === 'left' ? Math.min(A.x, E.x) - 36 - gutter : width - gutter - Math.max(A.x, E.x) - 36;
          const cap = Math.max(150, Math.floor(avail / 16) * 16);
          if (cap !== it.cap) {
            it.cap = cap;
            it.label.style.setProperty('--cap', `${cap}px`);
            it.w = 0;
          }
        }
        if (!it.w) {
          it.w = it.label.offsetWidth;
          it.h = it.label.offsetHeight;
          it.metaY = it.label.querySelector('.annot__meta').offsetTop + 9;
        }

        // Label position and the leader line.
        let lx;
        let ly;
        let d;
        if (wide) {
          const gap = 36;
          lx = place === 'left' ? Math.min(A.x, E.x) - gap - it.w : Math.max(A.x, E.x) + gap;
          lx = clamp(lx, gutter, width - gutter - it.w);
          ly = clamp(A.y - it.metaY, top + 4, height - it.h - bottom);
          const endX = place === 'left' ? lx + it.w : lx;
          const endY = ly + it.metaY;
          const kneeX = place === 'left' ? endX + 14 : endX - 14;
          d = `M${A.x.toFixed(1)} ${A.y.toFixed(1)}L${kneeX.toFixed(1)} ${A.y.toFixed(1)}L${endX.toFixed(1)} ${endY.toFixed(1)}`;
        } else {
          if (spec.at === 'path') {
            E.x = A.x;
            E.y = A.y;
          } else {
            frame.project(spec.pos, la.x, place === 'above' ? info.size.h / 2 : -info.size.h / 2, E);
          }
          const gap = 22;
          lx = clamp(A.x - 14, gutter, width - gutter - it.w);
          ly = place === 'above' ? E.y - gap - it.h : E.y + gap;
          ly = clamp(ly, top + 4, height - it.h - bottom);
          const endY = place === 'above' ? ly + it.h : ly;
          d = `M${A.x.toFixed(1)} ${A.y.toFixed(1)}L${A.x.toFixed(1)} ${endY.toFixed(1)}`;
        }
        it.line.setAttribute('d', d);
        if (it.halos[0]) it.halos[0].setAttribute('d', d);
        it.dot.setAttribute('cx', A.x.toFixed(1));
        it.dot.setAttribute('cy', A.y.toFixed(1));
        it.label.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`;

        if (it.frame) {
          it.local.corners.forEach((c, i) => frame.project(spec.pos, c.x, c.y, C[i]));
          const fd = spec.at === 'mark' ? cornerPath(C, 5, 10) : cornerPath(C, spec.rect === WHOLE ? 10 : 7, 20);
          it.frame.setAttribute('d', fd);
          if (it.halos[1]) it.halos[1].setAttribute('d', fd);
          if (it.ping) {
            const t = ((now - it.onAt) / 1500) % 1;
            it.ping.setAttribute('d', cornerPath(C, 9 + 16 * t, 20 + 6 * t));
            it.ping.style.opacity = it.on ? String(0.7 * (1 - t) * Math.min(1, (now - it.onAt) / 700)) : '0';
          }
        }
      }
    },
    dispose() {
      root.remove();
    },
  };
}
