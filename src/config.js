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
// mark = a phrase in a student message that clashes with another message (gray marker).
export const script = [
  {
    pos: 0,
    side: 'user',
    text: "can you build a website for our school's robotics club? dark background, and it needs to look good on phones",
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
  {
    pos: 30,
    side: 'user',
    text: 'also put a sign-up form on the home page so new members can join',
    mark: 'on the home page',
  },
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
    text: 'redo the home page so the top is a big photo gallery from our last competition',
    // Clashes with message 30, which put the sign-up form on the home page.
    mark: 'redo the home page',
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
    note: '3 requests missing: the sign-up form, the Schedule link and the dark background',
  },
  // `note` only shows in the static version; the 3D version uses the annotations below.
];

// Number of filler messages between the readable stops (used by the static version).
export const gaps = [
  { after: 1, count: 12 },
  { after: 15, count: 14 },
  { after: 31, count: 14 },
  { after: 47, count: 80, spreading: true },
];

// Requests the AI drops along the way, each one when a later message clashes with it.
// at = the AI reply where it disappears, from = the message that asked for it.
// The counter on the landing page counts these up as the camera passes them.
export const losses = [
  { at: 47, from: 30, what: 'sign-up form' },
  { at: 79, from: 14, what: 'Schedule link' },
  { at: 104, from: 0, what: 'dark background' },
];

// Labels that point at the 3D chat while it moves. Where each one attaches and when it
// shows up is in src/landing/annotations.js. The small line above each label
// ("msg 31 · AI · correct") is filled in automatically unless `meta` is given.
// A label can be plain text, or { text, sub, quote, meta }.
export const annotations = {
  ask0: 'Asks for a robotics club website: dark, and good on phones',
  build1: 'Builds the first version',
  ask14: 'Asks for a schedule page',
  done15: 'Adds it and leaves the rest alone',
  ask30: 'Asks for a sign-up form on the home page',
  form31: 'Sign-up form added here',
  ask46: 'Asks for a photo gallery at the top',
  clash46: {
    meta: 'msg 46 · clashes with msg 30',
    text: 'Redoing the home page clashes with an earlier request',
    quote: '“…put a sign-up form on the home page”',
  },
  done47: 'Adds the gallery',
  claim47: 'Says nothing else changed',
  lost47: {
    text: 'The sign-up form is gone.',
    sub: 'The AI followed the newer message and dropped the older one.',
  },
  after: {
    text: 'Every reply builds on the broken version',
    sub: 'Later requests clash with more of the earlier ones.',
  },
  claim128: {
    text: 'Three requests are gone',
    sub: 'The AI calls the site finished and never noticed.',
  },
  lost128: { meta: 'asked in msg 30 · lost at msg 47', text: 'Sign-up form' },
  nav128: { meta: 'asked in msg 14 · lost at msg 79', text: 'Schedule link' },
  dark128: { meta: 'asked in msg 0 · lost at msg 104', text: 'Dark background' },
};

// The same story as plain sentences, for the static version of the landing page
// (reduced motion, no WebGL, screen readers). `before` = the message they come before.
export const captions = [
  { id: 'start', before: 0, text: 'A student asks an AI to build a website for their robotics club.' },
  { id: 'schedule', before: 14, text: 'They ask for a schedule page. The AI adds it and leaves everything else alone.' },
  { id: 'form', before: 30, text: 'Next they ask for a sign-up form on the home page. The AI adds that too.' },
  {
    id: 'gallery',
    before: 46,
    text: 'Then they ask to redo the home page with a photo gallery at the top. That clashes with their earlier request to put the sign-up form there.',
  },
  {
    id: 'mistake',
    after: 47,
    text: 'The AI follows the newer message and drops the older one. It deletes the sign-up form, then says nothing else changed.',
  },
  {
    id: 'after',
    after: 47,
    text: 'Every reply after this builds on the broken version. Later requests clash with more of the earlier ones: the Schedule link disappears at message 79 and the dark background at message 104.',
  },
  {
    id: 'end',
    after: 128,
    text: "The AI calls the site finished. Three of the student's requests are gone, and it never noticed.",
  },
];
