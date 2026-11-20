// Filterable source library and the APA reference list, built from src/data/sources.json.

import sources from '../data/sources.json';

const CATEGORIES = ['All', 'Foundations', 'Methodology', 'Current scholarly', 'Rival theories', 'Popular media'];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// "First Author et al." when there are more than two authors.
function shortAuthors(authors) {
  const list = authors.split(',').map((a) => a.trim()).filter(Boolean);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list[0]} et al.`;
}

// *text* becomes italics, and the trailing URL becomes a link.
function apaToHtml(apa) {
  let html = esc(apa).replace(/\*([^*]+)\*/g, '<i>$1</i>');
  html = html.replace(/(https?:\/\/[^\s<]+)$/, (url) => `<a href="${url}">${url}</a>`);
  return html;
}

const apaSortKey = (s) => s.apa.replace(/\*/g, '').toLowerCase();

export function initSources() {
  const filtersEl = document.querySelector('[data-filters]');
  const listEl = document.querySelector('[data-sources]');
  const countEl = document.querySelector('[data-source-count]');
  const apaEl = document.querySelector('[data-apa]');
  if (!listEl) return;

  let current = 'All';

  filtersEl.innerHTML = CATEGORIES.map(
    (c) => `<button type="button" class="filter" data-cat="${c}" aria-pressed="${c === current}">${c}</button>`,
  ).join('');

  const render = () => {
    const shown = current === 'All' ? sources : sources.filter((s) => s.category === current);
    listEl.innerHTML = shown
      .map(
        (s) => `
        <li class="source">
          <div>
            <div class="source__title">${esc(s.title)}</div>
            <div class="source__meta">${esc(shortAuthors(s.authors))} · ${s.year}${current === 'All' ? ` · ${esc(s.category)}` : ''}</div>
          </div>
          <a class="source__link" href="${s.url}">Read<span class="sr-only">: ${esc(s.title)}</span></a>
        </li>`,
      )
      .join('');
    countEl.textContent = current === 'All' ? `${sources.length} sources` : `${shown.length} of ${sources.length} sources`;
    filtersEl.querySelectorAll('.filter').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === current)));
  };

  filtersEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter');
    if (!btn) return;
    current = btn.dataset.cat;
    render();
  });

  render();

  apaEl.innerHTML = [...sources]
    .sort((a, b) => apaSortKey(a).localeCompare(apaSortKey(b)))
    .map((s) => `<li>${apaToHtml(s.apa)}</li>`)
    .join('');
}
