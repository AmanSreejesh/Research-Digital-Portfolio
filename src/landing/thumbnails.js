// Small mockups of the robotics club website, drawn inside the AI's chat bubbles.
// The sign-up form (outlined block, three inputs, orange button) appears in the
// message 31 preview and is missing from the message 47 and final previews.
// Orange here belongs to the club's site in the story, not to the portfolio.

const ORANGE = '#f28c28';
const PAGE = '#0b0b0b';
const BORDER = '#3a3a3a';
const BLOCK = '#2e2e2e';
const BLOCK_2 = '#242424';
const LINE = '#4a4a4a';
const LIGHT = '#8a8a8a';

export const THUMB_ALT = {
  first: 'Preview of the site: an orange header, a short team intro, a sponsors row and a contact link.',
  schedule: 'Preview of the new Schedule page: a table of upcoming events.',
  form: 'Preview of the home page with a sign-up form under the team intro.',
  gallery: 'Preview of the new home page: a photo gallery at the top. The sign-up form is gone.',
  final: 'Preview of the finished site: gallery, captions and footer. The sign-up form is still missing.',
};

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

function header(ctx, x, y, w, u, navCount = 3, active = -1) {
  const h = 9 * u;
  ctx.fillStyle = ORANGE;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x + 4 * u, y + 2.5 * u, 4 * u, 4 * u); // logo
  bar(ctx, x + 10 * u, y + 3.5 * u, 14 * u, 2 * u, '#1a1a1a');
  for (let i = 0; i < navCount; i++) {
    const nx = x + w - (navCount - i) * 11 * u - 2 * u;
    bar(ctx, nx, y + 3.5 * u, 8 * u, 2 * u, i === active ? '#ffffff' : '#3b2208');
  }
  return y + h;
}

function textLines(ctx, x, y, w, u, n, color = LINE) {
  for (let i = 0; i < n; i++) {
    const lw = i === n - 1 ? w * 0.6 : w;
    bar(ctx, x, y + i * 4.2 * u, lw, 1.8 * u, color);
  }
  return y + n * 4.2 * u;
}

function intro(ctx, x, y, w, u) {
  ctx.fillStyle = BLOCK;
  ctx.fillRect(x, y, 18 * u, 14 * u);
  bar(ctx, x + 22 * u, y + 1 * u, 30 * u, 2.6 * u, LIGHT);
  textLines(ctx, x + 22 * u, y + 6 * u, w - 22 * u, u, 2);
  return y + 14 * u;
}

function sponsors(ctx, x, y, w, u) {
  bar(ctx, x, y, 16 * u, 2 * u, LIGHT);
  const n = 4;
  const gap = 3 * u;
  const bw = (w - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = BLOCK_2;
    ctx.fillRect(x + i * (bw + gap), y + 4.5 * u, bw, 6 * u);
  }
  return y + 10.5 * u;
}

function form(ctx, x, y, w, u) {
  const h = 30 * u;
  ctx.strokeStyle = '#bdbdbd';
  ctx.lineWidth = Math.max(1, 0.6 * u);
  rr(ctx, x, y, w, h, 1.5 * u);
  ctx.stroke();
  bar(ctx, x + 4 * u, y + 3.5 * u, 22 * u, 2.2 * u, '#cfcfcf'); // "Join the team"
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = '#6a6a6a';
    rr(ctx, x + 4 * u, y + (8 + i * 6) * u, w * 0.62, 4 * u, 0.8 * u);
    ctx.stroke();
  }
  ctx.fillStyle = ORANGE;
  rr(ctx, x + w - 22 * u, y + h - 9 * u, 18 * u, 5.5 * u, 1 * u);
  ctx.fill();
  return y + h;
}

function gallery(ctx, x, y, w, u, captions) {
  const cols = 3;
  const gap = 1.6 * u;
  const tw = (w - gap * (cols - 1)) / cols;
  const th = tw * 0.62;
  const shades = ['#3a3a3a', '#2c2c2c', '#343434', '#262626', '#303030', '#3d3d3d'];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < cols; c++) {
      const tx = x + c * (tw + gap);
      const ty = y + r * (th + gap + (captions ? 3 * u : 0));
      ctx.fillStyle = shades[r * cols + c];
      ctx.fillRect(tx, ty, tw, th);
      if (captions) bar(ctx, tx, ty + th + 1 * u, tw * 0.7, 1.4 * u, LINE);
    }
  }
  return y + 2 * th + gap + (captions ? 6 * u : 0);
}

function table(ctx, x, y, w, u) {
  bar(ctx, x, y, 26 * u, 3 * u, LIGHT);
  y += 7 * u;
  const rows = 6;
  const rh = 6.2 * u;
  ctx.fillStyle = BLOCK;
  ctx.fillRect(x, y, w, rh);
  ctx.strokeStyle = BORDER;
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
    bar(ctx, x + 2 * u, y + r * rh + 2.2 * u, w * 0.22, 1.6 * u, LINE);
    bar(ctx, x + w * 0.34 + 2 * u, y + r * rh + 2.2 * u, w * 0.28, 1.6 * u, LINE);
    bar(ctx, x + w * 0.72 + 2 * u, y + r * rh + 2.2 * u, w * 0.18, 1.6 * u, LINE);
  }
  return y + rows * rh;
}

// Draws one preview into the rectangle (x, y, w, h). Content is laid out in
// units of w/100 and clipped to the rectangle.
export function drawThumb(ctx, x, y, w, h, kind) {
  const u = w / 100;
  ctx.save();
  rr(ctx, x, y, w, h, 2.5 * u);
  ctx.clip();
  ctx.fillStyle = PAGE;
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
      cy = gallery(ctx, x, cy, w, u, false) + 5 * u;
      cy = intro(ctx, px, cy, pw, u) + 5 * u;
      sponsors(ctx, px, cy, pw, u);
      break;
    case 'final':
      cy = header(ctx, x, y, w, u, 4);
      cy = gallery(ctx, x, cy, w, u, true) + 4 * u;
      cy = intro(ctx, px, cy, pw, u) + 5 * u;
      cy = sponsors(ctx, px, cy, pw, u) + 4 * u;
      ctx.fillStyle = '#161616';
      ctx.fillRect(x, Math.max(cy, y + h - 8 * u), w, 10 * u);
      break;
    case 'first':
    default:
      cy = header(ctx, x, y, w, u, 3) + 6 * u;
      bar(ctx, px, cy, 44 * u, 3.4 * u, LIGHT);
      cy = textLines(ctx, px, cy + 7 * u, pw * 0.8, u, 2) + 4 * u;
      cy = intro(ctx, px, cy, pw, u) + 6 * u;
      cy = sponsors(ctx, px, cy, pw, u) + 4.5 * u;
      bar(ctx, px, cy, 20 * u, 1.8 * u, ORANGE);
      break;
  }
  ctx.restore();

  ctx.strokeStyle = BORDER;
  ctx.lineWidth = Math.max(1, 0.5 * u);
  rr(ctx, x, y, w, h, 2.5 * u);
  ctx.stroke();
}

// For the static version of the landing page.
export function thumbDataUrl(kind, width = 360) {
  const h = Math.round(width * 0.72);
  const c = document.createElement('canvas');
  c.width = width * 2;
  c.height = h * 2;
  const ctx = c.getContext('2d');
  drawThumb(ctx, 1, 1, c.width - 2, c.height - 2, kind);
  return c.toDataURL('image/png');
}
