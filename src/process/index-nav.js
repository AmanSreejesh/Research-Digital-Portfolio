// Sticky section index on the Process page. Highlights the section you're reading.

export function initIndexNav() {
  const links = [...document.querySelectorAll('[data-index] a')];
  if (!links.length) return;
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);

  const setCurrent = (id) => {
    links.forEach((a) => {
      const on = a.getAttribute('href') === `#${id}`;
      a.classList.toggle('is-current', on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };

  // The current section is the last one whose top has passed 40% of the screen height.
  const update = () => {
    const line = window.innerHeight * 0.4;
    let current = sections[0];
    for (const s of sections) {
      if (s.getBoundingClientRect().top <= line) current = s;
    }
    setCurrent(current.id);
  };

  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    },
    { passive: true },
  );
  window.addEventListener('resize', update);
  update();
}
