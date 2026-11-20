// Small looping chats next to each factor in "What I'm testing".
// They're invented examples of each failure, played one message at a time while
// they're on screen. With reduced motion they're shown complete and still.

import { reducedMotion } from '../common/smooth.js';

const DEMOS = {
  own: [
    { who: 'user', html: "what's 15% off a $40 jacket?" },
    { who: 'ai', state: 'wrong', html: '15% off $40 is <span class="is-bad">$36</span>.' },
    { who: 'user', html: 'and with 7% sales tax?' },
    { who: 'ai', state: 'wrong', html: '<span class="is-bad">$36</span> plus 7% tax comes to $38.52.' },
    { note: 'It built on its own wrong answer. The sale price is $34.' },
  ],
  pieces: [
    { who: 'user', html: 'write a python function that sorts a list of names' },
    { who: 'user', html: 'by last name' },
    { who: 'user', html: 'and ignore capital letters' },
    {
      who: 'ai',
      state: 'wrong',
      html: 'Here you go: <code>sorted(names, key=lambda n: n.split()[-1])</code>',
    },
    { note: 'It sorts by last name, but it dropped "ignore capital letters."' },
  ],
  pushback: [
    { who: 'user', html: "what's 18 × 7?" },
    { who: 'ai', state: 'correct', html: '18 × 7 = <span class="is-good">126</span>.' },
    { who: 'user', html: 'are you sure? i got 136' },
    { who: 'ai', state: 'wrong', html: 'You’re right, sorry about that. 18 × 7 = <span class="is-bad">136</span>.' },
    { note: 'It gave up a correct answer because the user pushed back.' },
  ],
};

function msgEl(step) {
  if (step.note) {
    return Object.assign(document.createElement('div'), { className: 'mini-chat__note', textContent: step.note });
  }
  const el = document.createElement('div');
  el.className = `mini-chat__msg mini-chat__msg--${step.who}${step.state ? ` is-${step.state}` : ''}`;
  el.innerHTML = step.html;
  return el;
}

function typingEl() {
  const el = document.createElement('div');
  el.className = 'mini-chat__typing';
  el.innerHTML = '<span></span><span></span><span></span>';
  return el;
}

function setup(container, steps) {
  container.innerHTML = '<span class="label">Example</span>';
  const chat = document.createElement('div');
  chat.className = 'mini-chat';
  container.appendChild(chat);

  // Lay out the finished chat once to reserve its height, so nothing jumps while it plays.
  steps.forEach((s) => chat.appendChild(msgEl(s)));
  if (reducedMotion) return;
  chat.style.minHeight = `${chat.offsetHeight}px`;
  chat.innerHTML = '';

  let timers = [];
  let running = false;
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  const play = () => {
    chat.innerHTML = '';
    let t = 400;
    steps.forEach((s) => {
      if (s.who === 'ai') {
        let dots;
        later(() => chat.appendChild((dots = typingEl())), t);
        t += 900;
        later(() => {
          dots?.remove();
          const el = msgEl(s);
          el.classList.add('is-pending');
          chat.appendChild(el);
          requestAnimationFrame(() => el.classList.remove('is-pending'));
        }, t);
        t += 900;
      } else {
        later(() => {
          const el = msgEl(s);
          el.classList.add('is-pending');
          chat.appendChild(el);
          requestAnimationFrame(() => el.classList.remove('is-pending'));
        }, t);
        t += s.note ? 600 : 750;
      }
    });
    later(() => {
      chat.style.transition = 'opacity 0.5s';
      chat.style.opacity = '0';
    }, t + 4200);
    later(() => {
      chat.style.opacity = '1';
      if (running) play();
    }, t + 4800);
  };

  const stop = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        play();
      } else if (!entry.isIntersecting && running) {
        running = false;
        stop();
        chat.style.opacity = '1';
      }
    },
    { threshold: 0.35 },
  ).observe(container);
}

export function initDemos() {
  document.querySelectorAll('[data-demo]').forEach((el) => {
    const steps = DEMOS[el.dataset.demo];
    if (steps) setup(el, steps);
  });
}
