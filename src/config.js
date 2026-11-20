// Site settings. Most things you'd want to change live in this file.
// After editing, the dev server reloads on its own. Run `npm run build` before deploying.

export const site = {
  name: 'Aman Sreejesh',
  initials: 'AS',
  course: 'AP Research, 2026–27',
  email: 'amansreejesh9@gmail.com',
  github: 'https://github.com/AmanSreejesh',
  repo: 'https://github.com/AmanSreejesh/Research-Digital-Portfolio',
  // Full public URL, used for link previews (Open Graph). Keep the trailing slash.
  url: 'https://amansreejesh.github.io/Research-Digital-Portfolio/',
  description:
    'Aman Sreejesh’s AP Research project: measuring how long an AI conversation can still be fixed after the model makes its first mistake.',
};

// Pages in the header. To add a page later (for example Results in the spring),
// create the HTML file, add it to vite.config.js, and add one line here.
export const nav = [
  { label: 'Home', href: '', id: 'home' },
  { label: 'About', href: 'about.html', id: 'about' },
  { label: 'Process', href: 'process.html', id: 'process' },
];

// The only two colors on the site. They mean "the AI's answer is correct" and
// "the AI's answer is wrong", and nothing else.
export const status = {
  correct: '#2BD67B',
  wrong: '#FF4A3D',
};

// The landing page conversation. Only these nine messages are readable.
// pos = message slot along the path (0 to 128). side: 'user' or 'ai'.
// thumb = which site preview is drawn inside the bubble (see src/landing/thumbnails.js).
export const script = [
  {
    pos: 0,
    side: 'user',
    text: "can you build a website for our school's robotics club? dark background, orange accents, and it needs to look good on phones",
  },
  {
    pos: 1,
    side: 'ai',
    status: 'correct',
    text: "Here's a first version with a home page, a short intro about the team, a sponsors section, and a contact link at the bottom. The layout is responsive, so it works on phones too.",
    thumb: 'first',
  },
  { pos: 14, side: 'user', text: 'can you add a page with our competition schedule?' },
  {
    pos: 15,
    side: 'ai',
    status: 'correct',
    text: 'I added a Schedule page with a table of upcoming events and linked it in the menu. Nothing else on the site changed.',
    thumb: 'schedule',
  },
  { pos: 30, side: 'user', text: 'also put a sign-up form on the home page so new members can join' },
  {
    pos: 31,
    side: 'ai',
    status: 'correct',
    text: 'Done. The form asks for name, grade, and email, and it sits right below the team intro.',
    thumb: 'form',
  },
  {
    pos: 46,
    side: 'user',
    text: "let's redo the home page so the top is a big photo gallery from our last competition",
  },
  {
    pos: 47,
    side: 'ai',
    status: 'wrong',
    text: "Here's the new home page with a full-width gallery at the top. Everything else is the same as before.",
    // This sentence turns red first and stays the brightest part of the bubble.
    highlight: 'Everything else is the same as before.',
    thumb: 'gallery',
  },
  {
    pos: 128,
    side: 'ai',
    status: 'wrong',
    text: "Here's the finished site with all of your changes. It's ready to publish.",
    thumb: 'final',
    note: 'sign-up form missing since message 47',
  },
];

// Number of filler messages between the readable stops (used by the static version).
export const gaps = [
  { after: 1, count: 12 },
  { after: 15, count: 14 },
  { after: 31, count: 14 },
  { after: 47, count: 80, spreading: true },
];
