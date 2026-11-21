// Small mockups of the robotics club website, drawn inside the AI's chat bubbles.
// They're monochrome on purpose: the only colors on the site mean correct and wrong.
// The sign-up form (bright outline, three inputs, a button) appears in message 31.
// In messages 47 and 128 it's gone, and the "ghost" version marks the empty spot in red.
// By message 128 two more requests are gone too: the page is light instead of dark,
// and the Schedule link is missing from the menu.

import { status } from '../config.js';

export const THUMB_RATIO = 0.8;

// Colors for the dark site the student asked for, and for the light one it turns into.
const DARK = {
  page: '#0b0b0b',
  header: '#1f1f1f',
  border: '#3a3a3a',
  block: '#2b2b2b',
  block2: '#222222',
  line: '#4d4d4d',
  light: '#bdbdbd',
  white: '#f0f0f0',
  nav: '#5e5e5e',
  photo: ['#3a3a3a', '#2e2e2e', '#363636'],
  photoMark: '#4a4a4a',
  footer: '#161616',
};
const LIGHT_SITE = {
  page: '#e4e4e4',
  header: '#cfcfcf',
  border: '#9a9a9a',
  block: '#bdbdbd',
  block2: '#c8c8c8',
  line: '#a3a3a3',
  light: '#555555',
  white: '#1c1c1c',
  nav: '#8a8a8a',
  photo: ['#b3b3b3', '#a8a8a8', '#aeaeae'],
  photoMark: '#999999',
  footer: '#d2d2d2',
};
let P = DARK;
const CHAT_FONT = '-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const THUMB_ALT = {
  first: 'Preview of the site: a header, a short team intro, a sponsors row and a contact link.',
  schedule: 'Preview of the new Schedule page: a table of upcoming events.',
  form: 'Preview of the home page with a sign-up form under the team intro.',
  gallery: 'Preview of the new home page: a photo gallery at the top. The sign-up form is gone, and its empty spot is marked in red.',
  final:
    'Preview of the finished site. The page is light instead of dark, the Schedule link is gone from the menu, and the sign-up form is still missing. Each is marked in red.',
};

// Where the sign-up form sits in message 31's preview, as fractions of the preview (x, y, w, h).
// Matches the 'form' layout in drawThumb below.
export const FORM_RECT = { x: 0.06, y: 33 / 80, w: 0.88, h: 30 / 80 };

// Where the missing form is marked, as fractions of the preview (x, y, w, h).
export const GHOST = {
  gallery: { x: 0.06, y: 52 / 80, w: 0.88, h: 19 / 80, text: 'the sign-up form was here' },
  final: { x: 0.06, y: 55 / 80, w: 0.88, h: 16 / 80, text: 'sign-up form: still missing' },
};

// In the final preview: where the Schedule link used to sit in the menu, and the whole page
// (for the dark background that turned light).
export const GHOST_NAV = { x: 0.855, y: 1.5 / 80, w: 0.11, h: 6 / 80 };
export const WHOLE = { x: 0, y: 0, w: 1, h: 1 };

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  rr(ctx, x, y, w, h, Math.min(h / 2, 3));
  ctx.fill();
}

function header(ctx, x, y, w, u, navCount = 3, active = -1, skip = -1) {
  const h = 9 * u;
  ctx.fillStyle = P.header;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = P.white;
  ctx.fillRect(x + 4 * u, y + 2.5 * u, 4 * u, 4 * u);
  bar(ctx, x + 10 * u, y + 3.5 * u, 14 * u, 2 * u, P.light);
  for (let i = 0; i < navCount; i++) {
    if (i === skip) continue;
    const nx = x + w - (navCount - i) * 11 * u - 2 * u;
    bar(ctx, nx, y + 3.5 * u, 8 * u, 2 * u, i === active ? P.white : P.nav);
  }
  return y + h;
}

function textLines(ctx, x, y, w, u, n) {
  for (let i = 0; i < n; i++) bar(ctx, x, y + i * 4.2 * u, i === n - 1 ? w * 0.6 : w, 1.8 * u, P.line);
  return y + n * 4.2 * u;
}

function intro(ctx, x, y, w, u) {
  ctx.fillStyle = P.block;
  ctx.fillRect(x, y, 18 * u, 14 * u);
  bar(ctx, x + 22 * u, y + 1 * u, 30 * u, 2.6 * u, P.light);
  textLines(ctx, x + 22 * u, y + 6 * u, w - 22 * u, u, 2);
  return y + 14 * u;
}

function sponsors(ctx, x, y, w, u) {
  bar(ctx, x, y, 16 * u, 2 * u, P.light);
  const n = 4;
  const gap = 3 * u;
  const bw = (w - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = P.block2;
    ctx.fillRect(x + i * (bw + gap), y + 4.5 * u, bw, 6 * u);
  }
  return y + 10.5 * u;
}

function form(ctx, x, y, w, u) {
  const h = 30 * u;
  ctx.fillStyle = '#141414';
  rr(ctx, x, y, w, h, 1.5 * u);
  ctx.fill();
  ctx.strokeStyle = P.white;
  ctx.lineWidth = Math.max(1.5, 0.75 * u);
  ctx.stroke();
  ctx.fillStyle = P.white;
  ctx.font = `500 ${3.4 * u}px ${CHAT_FONT}`;
  ctx.textBaseline = 'top';
  ctx.fillText('Join the team', x + 4 * u, y + 3 * u);
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = '#8a8a8a';
    ctx.lineWidth = Math.max(1, 0.5 * u);
    rr(ctx, x + 4 * u, y + (9 + i * 6) * u, w * 0.6, 4.2 * u, 0.8 * u);
    ctx.stroke();
  }
  ctx.fillStyle = P.white;
  rr(ctx, x + w - 22 * u, y + h - 9.5 * u, 18 * u, 6 * u, 1 * u);
  ctx.fill();
  bar(ctx, x + w - 18 * u, y + h - 7.4 * u, 10 * u, 1.8 * u, '#1a1a1a');
  return y + h;
}

function gallery(ctx, x, y, w, u, captions) {
  const cols = 3;
  const gap = 1.6 * u;
  const tw = (w - gap * (cols - 1)) / cols;
  const th = 22 * u;
  for (let c = 0; c < cols; c++) {
    const tx = x + c * (tw + gap);
    ctx.fillStyle = P.photo[c];
    ctx.fillRect(tx, y, tw, th);
    // a simple mountain-and-sun mark so the tiles read as photos
    ctx.fillStyle = P.photoMark;
    ctx.beginPath();
    ctx.moveTo(tx + tw * 0.1, y + th * 0.85);
    ctx.lineTo(tx + tw * 0.38, y + th * 0.45);
    ctx.lineTo(tx + tw * 0.6, y + th * 0.85);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tx + tw * 0.75, y + th * 0.32, th * 0.1, 0, Math.PI * 2);
    ctx.fill();
    if (captions) bar(ctx, tx + 1.5 * u, y + th + 1 * u, tw * 0.6, 1.4 * u, P.line);
  }
  return y + th + (captions ? 3.5 * u : 0);
}

function table(ctx, x, y, w, u) {
  bar(ctx, x, y, 26 * u, 3 * u, P.light);
  y += 7 * u;
  const rows = 7;
  const rh = 6.4 * u;
  ctx.fillStyle = P.block;
  ctx.fillRect(x, y, w, rh);
  ctx.strokeStyle = P.border;
  ctx.lineWidth = Math.max(1, 0.4 * u);
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * rh);
    ctx.lineTo(x + w, y + r * rh);
    ctx.stroke();
  }
  [0, 0.34, 0.72, 1].forEach((f) => {
    ctx.beginPath();
    ctx.moveTo(x + w * f, y);
    ctx.lineTo(x + w * f, y + rows * rh);
    ctx.stroke();
  });
  for (let r = 1; r < rows; r++) {
    bar(ctx, x + 2 * u, y + r * rh + 2.3 * u, w * 0.22, 1.6 * u, P.line);
    bar(ctx, x + w * 0.34 + 2 * u, y + r * rh + 2.3 * u, w * 0.28, 1.6 * u, P.line);
    bar(ctx, x + w * 0.72 + 2 * u, y + r * rh + 2.3 * u, w * 0.18, 1.6 * u, P.line);
  }
  return y + rows * rh;
}

function ghostBox(ctx, x, y, w, h, u, g) {
  const gx = x + g.x * w;
  const gy = y + g.y * h;
  const gw = g.w * w;
  const gh = g.h * h;
  ctx.fillStyle = 'rgba(255, 74, 61, 0.1)';
  rr(ctx, gx, gy, gw, gh, 1.5 * u);
  ctx.fill();
  ctx.setLineDash([Math.min(3 * u, gw / 4), 2 * u]);
  ctx.strokeStyle = status.wrong;
  ctx.lineWidth = Math.max(1.5, 0.8 * u);
  ctx.stroke();
  ctx.setLineDash([]);
  if (!g.text) return;
  ctx.fillStyle = status.wrong;
  ctx.font = `500 ${4.6 * u}px ${CHAT_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(g.text, gx + gw / 2, gy + gh / 2);
  ctx.textAlign = 'left';
}

// Draws one preview into the rectangle (x, y, w, h). Content is laid out in units of w/100.
// With ghost: true, the spot where the sign-up form used to be is marked in red.
export function drawThumb(ctx, x, y, w, h, kind, { ghost = false } = {}) {
  const u = w / 100;
  // By the final message the dark background is gone (see losses in config.js).
  P = kind === 'final' && ghost ? LIGHT_SITE : DARK;
  ctx.save();
  rr(ctx, x, y, w, h, 2.5 * u);
  ctx.clip();
  ctx.fillStyle = P.page;
  ctx.fillRect(x, y, w, h);

  const px = x + 6 * u;
  const pw = w - 12 * u;
  let cy;

  switch (kind) {
    case 'schedule':
      cy = header(ctx, x, y, w, u, 4, 3) + 6 * u;
      table(ctx, px, cy, pw, u);
      break;
    case 'form':
      cy = header(ctx, x, y, w, u, 4) + 5 * u;
      cy = intro(ctx, px, cy, pw, u) + 5 * u;
      cy = form(ctx, px, cy, pw, u) + 5 * u;
      sponsors(ctx, px, cy, pw, u);
      break;
    case 'gallery':
      cy = header(ctx, x, y, w, u, 4);
      cy = gallery(ctx, x, cy, w, u, false) + 4 * u;
      cy = intro(ctx, px, cy, pw, u) + 4 * u;
      if (ghost) cy = y + (GHOST.gallery.y + GHOST.gallery.h) * h + 3 * u;
      sponsors(ctx, px, cy, pw, u);
      break;
    case 'final':
      // The Schedule link (the last menu item) is gone too.
      cy = header(ctx, x, y, w, u, 4, -1, ghost ? 3 : -1);
      cy = gallery(ctx, x, cy, w, u, true) + 3 * u;
      cy = intro(ctx, px, cy, pw, u) + 3 * u;
      if (!ghost) sponsors(ctx, px, cy, pw, u);
      ctx.fillStyle = P.footer;
      ctx.fillRect(x, y + h - 6 * u, w, 6 * u);
      break;
    case 'first':
    default:
      cy = header(ctx, x, y, w, u, 3) + 6 * u;
      bar(ctx, px, cy, 44 * u, 3.4 * u, P.light);
      cy = textLines(ctx, px, cy + 7 * u, pw * 0.8, u, 2) + 4 * u;
      cy = intro(ctx, px, cy, pw, u) + 6 * u;
      cy = sponsors(ctx, px, cy, pw, u) + 5 * u;
      bar(ctx, px, cy, 20 * u, 1.8 * u, P.white);
      break;
  }
  if (ghost && GHOST[kind]) ghostBox(ctx, x, y, w, h, u, GHOST[kind]);
  if (ghost && kind === 'final') ghostBox(ctx, x, y, w, h, u, GHOST_NAV);
  ctx.restore();

  ctx.strokeStyle = P.border;
  ctx.lineWidth = Math.max(1, 0.5 * u);
  rr(ctx, x, y, w, h, 2.5 * u);
  ctx.stroke();
  P = DARK;
}

// For the static version of the landing page (which shows the end state, so the ghost is on).
export function thumbDataUrl(kind, width = 360) {
  const h = Math.round(width * THUMB_RATIO);
  const c = document.createElement('canvas');
  c.width = width * 2;
  c.height = h * 2;
  const ctx = c.getContext('2d');
  drawThumb(ctx, 1, 1, c.width - 2, c.height - 2, kind, { ghost: Boolean(GHOST[kind]) });
  return c.toDataURL('image/png');
}
