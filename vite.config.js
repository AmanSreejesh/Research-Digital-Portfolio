import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { head, header, footer } from './src/partials.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Each page marks where the shared pieces go:
//   <!-- @head title="About" path="about.html" -->
//   <!-- @header current="about" -->
//   <!-- @footer -->
function partials() {
  const attrs = (s) => Object.fromEntries([...s.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  return {
    name: 'site-partials',
    transformIndexHtml(html) {
      return html
        .replace(/<!--\s*@head([^>]*?)-->/, (_, a) => head(attrs(a)))
        .replace(/<!--\s*@header([^>]*?)-->/, (_, a) => header(attrs(a).current))
        .replace(/<!--\s*@footer\s*-->/, () => footer());
    },
  };
}

// Dev only: lets the landing page save a frame as public/og.png (open /?og while `npm run dev` is running).
function ogSaver() {
  return {
    name: 'og-saver',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save-og', (req, res) => {
        if (req.method !== 'POST') return res.end();
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          const b64 = Buffer.concat(chunks).toString().replace(/^data:image\/png;base64,/, '');
          writeFileSync(resolve(__dirname, 'public/og.png'), Buffer.from(b64, 'base64'));
          res.end('saved');
        });
      });
    },
  };
}

export default defineConfig({
  // Must match the GitHub repository name for GitHub Pages.
  base: '/Research-Digital-Portfolio/',
  plugins: [partials(), ogSaver()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        process: resolve(__dirname, 'process.html'),
      },
    },
  },
});
