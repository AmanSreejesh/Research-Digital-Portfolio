// The static chat. It's the whole landing page for reduced motion and browsers
// without WebGL, and in the 3D version it stays in the page (visually hidden)
// so screen readers get every readable message in order.

import { script, gaps } from '../config.js';
import { thumbDataUrl, THUMB_ALT } from './thumbnails.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function messageHtml(m) {
  let text = esc(m.text);
  if (m.highlight) text = text.replace(esc(m.highlight), `<span class="msg__hl">${esc(m.highlight)}</span>`);
  const who = m.side === 'user' ? 'Student' : 'AI';
  const thumb = m.thumb
    ? `<img class="msg__thumb" src="${thumbDataUrl(m.thumb)}" alt="${esc(THUMB_ALT[m.thumb])}" width="360" height="259" />`
    : '';
  const statusEl = m.status
    ? `<span class="msg__status">${m.status === 'correct' ? 'correct' : 'wrong'}</span>`
    : '';
  const note = m.note ? `<span class="msg__note">${esc(m.note)}</span>` : '';
  return `<li class="msg msg--${m.side}"${m.status ? ` data-status="${m.status}"` : ''} data-pos="${m.pos}">
    <span class="msg__num"><span class="sr-only">${who}, </span>message ${m.pos}</span>
    <div class="msg__bubble"><p>${text}</p>${thumb}</div>
    ${statusEl}${note}
  </li>`;
}

export function renderStatic(listEl) {
  const parts = [];
  for (const m of script) {
    parts.push(messageHtml(m));
    const gap = gaps.find((g) => g.after === m.pos);
    if (gap) {
      const cls = gap.spreading ? 'gap gap--spreading' : 'gap gap--correct';
      parts.push(`<li class="${cls}" role="separator">${gap.count} more messages</li>`);
    }
  }
  listEl.innerHTML = parts.join('');
}

// The first exchange, shown in the stage while three.js downloads.
export function renderPreview(container) {
  const ol = document.createElement('ol');
  ol.className = 'chat-static';
  ol.innerHTML = script.slice(0, 2).map(messageHtml).join('');
  container.appendChild(ol);
}
