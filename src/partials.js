// Header, footer and <head> tags shared by every page.
// vite.config.js swaps these into the HTML files at build time, so the name,
// email and links only need to change in src/config.js.

import { site, nav } from './config.js';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function head({ title, description, path = '' }) {
  const fullTitle = title ? `${title} · ${site.name}` : `${site.name} · AP Research`;
  const desc = description || site.description;
  const url = site.url + path;
  return `
    <title>${esc(fullTitle)}</title>
    <meta name="description" content="${esc(desc)}" />
    <meta name="author" content="${esc(site.name)}" />
    <meta name="theme-color" content="#060606" />
    <meta name="color-scheme" content="dark" />
    <link rel="canonical" href="${esc(url)}" />
    <link rel="icon" href="favicon.svg" type="image/svg+xml" />
    <link rel="preload" href="fonts/ibm-plex-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="fonts/ibm-plex-mono-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${esc(site.name)}" />
    <meta property="og:title" content="${esc(fullTitle)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:image" content="${esc(site.url)}og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="An AI chat reply outlined in red that claims nothing else changed, above a website preview where a red box marks the missing sign-up form." />
    <meta name="twitter:card" content="summary_large_image" />`;
}

export function header(current) {
  const links = nav
    .map(
      (item) =>
        `<li><a href="./${item.href}"${item.id === current ? ' aria-current="page"' : ''}>${esc(item.label)}</a></li>`,
    )
    .join('');
  return `
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header" data-header>
    <div class="site-header__inner">
      <a class="wordmark" href="./">${esc(site.name)}</a>
      <nav class="site-nav" aria-label="Main">
        <ul class="site-nav__list" id="site-nav-list">${links}</ul>
        <button class="site-nav__toggle" type="button" aria-expanded="false" aria-controls="site-nav-list" data-nav-toggle>Menu</button>
      </nav>
    </div>
  </header>`;
}

export function footer() {
  return `
  <footer class="site-footer">
    <div class="site-footer__inner">
      <span>${esc(site.name)}</span>
      <span>${esc(site.course)}</span>
      <a href="mailto:${esc(site.email)}">${esc(site.email)}</a>
      <a href="${esc(site.github)}">GitHub</a>
    </div>
  </footer>`;
}
