// The landing sequence's rhythm, as pure functions of scroll progress p (0 to 1).
// Everything on screen is computed from p, so scrolling back up reverses it exactly.
//
//   s(p)  camera position along the conversation, in message slots (0 to 128)
//   v(p)  camera speed: about 0.2 in the runs, 1 at the peak of the warp
//
// Beats (p ranges):
//   0.00-0.06 stop 0 · 0.06-0.14 run 1 · 0.14-0.25 stop 1 · 0.25-0.33 run 2
//   0.33-0.44 stop 2 · 0.44-0.51 run 3 · 0.51-0.70 stop 3, the mistake (read,
//   flip to red, camera moves in on the missing form, pulls back)
//   0.70-0.92 warp and final stop · 0.92-0.95 hold · 0.95-1.00 headline

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Position curve for the warp, built once by integrating a speed profile:
// ramp up over the first 22%, full speed, then ease down from 55% to the end.
const WARP_TABLE = (() => {
  const n = 1024;
  const table = new Float32Array(n + 1);
  let acc = 0;
  for (let i = 1; i <= n; i++) {
    const t = (i - 0.5) / n;
    acc += smoothstep(0, 0.22, t) * (1 - smoothstep(0.55, 1, t));
    table[i] = acc;
  }
  for (let i = 0; i <= n; i++) table[i] /= acc;
  return table;
})();

function warpCruise(t) {
  const x = clamp(t) * (WARP_TABLE.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  return i >= WARP_TABLE.length - 1 ? 1 : WARP_TABLE[i] * (1 - f) + WARP_TABLE[i + 1] * f;
}

const ease = {
  linear: (t) => t,
  sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  power3InOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  backOut: (t, c = 1.4) => 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2),
  // Hard acceleration, a stretch at full speed, a long deceleration, then a firm
  // stop with a slight overshoot onto the last message.
  warp: (t) => (t < 0.75 ? warpCruise(t / 0.75) * 0.985 : 0.985 + 0.015 * ease.backOut((t - 0.75) / 0.25)),
};

// [p0, p1, s0, s1, ease]
export const SEGMENTS = [
  [0.0, 0.06, 0.8, 1.05, 'sineInOut'], // stop 0, slight drift
  [0.06, 0.14, 1.05, 15.0, 'power3InOut'], // run 1
  [0.14, 0.25, 15.0, 15.1, 'sineInOut'], // stop 1
  [0.25, 0.33, 15.1, 31.0, 'power3InOut'], // run 2, faster
  [0.33, 0.44, 31.0, 31.1, 'sineInOut'], // stop 2
  [0.44, 0.51, 31.1, 47.0, 'power3InOut'], // run 3, faster again
  [0.51, 0.7, 47.0, 47.15, 'sineInOut'], // stop 3, the longest hold
  [0.7, 0.92, 47.15, 128.0, 'warp'], // warp, then the final stop
  [0.92, 1.0, 128.0, 128.0, 'linear'], // final message, then the headline
];

export function sAt(p) {
  p = clamp(p);
  for (const [p0, p1, s0, s1, e] of SEGMENTS) {
    if (p <= p1) return lerp(s0, s1, ease[e]((p - p0) / (p1 - p0)));
  }
  return 128;
}

// Peak ds/dp in the warp, measured once so v(p) reaches 1 there.
const D = 1e-4;
const PEAK = (() => {
  let m = 0;
  for (let p = 0.7; p < 0.92; p += 0.0005) m = Math.max(m, Math.abs(sAt(p + D) - sAt(p - D)) / (2 * D));
  return m;
})();

// The runs are measured on a much larger scale than the warp, so streaks, blur and
// field of view stay subtle there and only the warp uses them fully.
const RUN_SCALE = 2800;

export function velocityAt(p) {
  const raw = Math.abs(sAt(clamp(p + D)) - sAt(clamp(p - D))) / (2 * D);
  return clamp(p >= 0.7 ? raw / PEAK : raw / RUN_SCALE);
}

// Message 47: green on arrival, then red spreading out from the false sentence.
export const flipAt = (p) => smoothstep(0.575, 0.61, p);

// After the flip the camera moves in on the spot where the sign-up form used to be.
export const pushAt = (p) => smoothstep(0.615, 0.645, p) * (1 - smoothstep(0.672, 0.698, p));

// Front of the red wave, in slots. Replies after message 47 turn red once it passes them.
export function waveAt(p, s) {
  if (p < 0.605) return 46.5;
  if (p < 0.7) return lerp(47.5, 61, ease.sineInOut((p - 0.605) / 0.095));
  return Math.max(61, s + 14);
}

// 0 to 1 over the last part: the final message drifts up and dims, the headline comes in.
export const outroAt = (p) => smoothstep(0.95, 1.0, p);

// Narration beats [id, from, to]. Each line fades in and out at the edges.
export const BEATS = [
  ['start', -1, 0.062],
  ['schedule', 0.132, 0.25],
  ['form', 0.322, 0.44],
  ['gallery', 0.505, 0.588],
  ['mistake', 0.598, 0.7],
  ['after', 0.712, 0.855],
  ['end', 0.872, 0.952],
];

export function beatOpacity(p, from, to, fade = 0.012) {
  return smoothstep(from - fade, from, p) * (1 - smoothstep(to - fade, to, p));
}

export const isMobile = () =>
  window.matchMedia('(max-width: 767px)').matches || window.matchMedia('(pointer: coarse)').matches;
