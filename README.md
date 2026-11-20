# AP Research digital portfolio

Live site (after the first deploy): https://amansreejesh.github.io/Research-Digital-Portfolio/

My AP Research portfolio for 2026–27. The project measures the recovery window in AI conversations: how many turns pass between a language model's first wrong answer and the point where giving it the missing information no longer fixes the answer.

The site has three pages. The home page opens with a scroll-driven 3D chat (three.js and GSAP), then explains the question. The About page covers the Personal requirement. The Process page covers Ideation, Background literature, the Concept map, the research plan and the Timeline.

## Running it on your computer

You need Node.js 20 or newer.

```
npm install
npm run dev
```

Then open http://localhost:5173/Research-Digital-Portfolio/ in a browser. The page reloads on its own when you save a file.

To check the version people see with reduced motion turned on (or without WebGL), add `?static` to the address.

## Where to edit things

| What | File |
|---|---|
| Name, email, GitHub link, site URL | `src/config.js` |
| The landing chat messages and the green and red colors | `src/config.js` |
| Headline at the end of the landing sequence | `index.html` (inside `data-headline`) |
| Home page text below the landing | `index.html` |
| About page | `about.html` |
| Process page text, dropped ideas, research plan, status line | `process.html` |
| Timeline rows | `process.html`, change `data-status` to `done`, `progress` or `upcoming` |
| The 40 sources and their APA references | `src/data/sources.json` |
| Concept map topics, positions and paper summaries | `src/data/conceptmap.json` |
| Colors, fonts, spacing | `src/styles/tokens.css` |

Placeholder text is marked with `DRAFT` comments. Search the project for `DRAFT` to find every spot that still needs rewriting in my own words.

In `sources.json`, a pair of asterisks makes italics in the APA list (`*Title of the paper*`).

## Adding a page later

1. Copy `about.html` to a new file, for example `results.html`, and change the `@head` and `@header` lines at the top.
2. Add the file to `rollupOptions.input` in `vite.config.js`.
3. Add one line to the `nav` list in `src/config.js`.

## Deploying

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes the `dist` folder to GitHub Pages. In the repository settings, Pages → Source has to be set to GitHub Actions (only needed once).

After deploying, open the live link in a private window and on a phone, signed out, to make sure people outside the school district can see it.

## Link preview image

`public/og.png` is a frame from the warp section. To make a new one, run `npm run dev`, open the home page with `?og` at the end of the address, then run `await __landing.scene.captureOG(0.722)` in the browser console. The number is the scroll position (0 to 1) to capture.

## How the landing sequence works

- `src/landing/timeline.js` turns scroll progress into the camera's position along the conversation. Every frame is computed from scroll progress, so scrolling back up reverses it exactly.
- `src/landing/scene.js` sets up the renderer, camera and postprocessing (zoom blur, grain, vignette).
- `src/landing/bubble.js` draws the nine readable messages onto canvas textures. `src/landing/thumbnails.js` draws the small website previews, including the sign-up form that disappears after message 47.
- `src/landing/filler.js` places the 120 or so unreadable messages as one instanced mesh. `src/landing/material.js` has their shader, including the red spread and the speed streaks.
- `src/landing/fallback.js` builds the static chat used for reduced motion, browsers without WebGL and screen readers.
