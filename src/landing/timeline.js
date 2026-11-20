// The landing sequence's rhythm, as pure functions of scroll progress p (0 to 1).
// Everything on screen is computed from p, so scrolling back up reverses it exactly.
//
//   s(p)  camera position along the conversation, in message slots (0 to 128)
//   v(p)  camera speed, 0 at rest and 1 at the peak of the warp
//
// Beats (p ranges):
//   0.00-0.06 stop 0 · 0.06-0.16 run 1 · 0.16-0.28 stop 1 · 0.28-0.37 run 2
//   0.37-0.48 stop 2 · 0.48-0.56 run 3 · 0.56-0.70 stop 3 (the mistake)
//   0.70-0.94 warp and final stop · 0.94-1.00 headline

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
  const ss = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  let acc = 0;
  for (let i = 1; i <= n; i++) {
    const t = (i - 0.5) / n;
    acc += ss(0, 0.22, t) * (1 - ss(0.55, 1, t));
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
  expoInOut: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  // Hard acceleration, a stretch at full speed, a long deceleration, then a firm
  // stop with a slight overshoot onto the last message.
  warp: (t) => (t < 0.75 ? warpCruise(t / 0.75) * 0.985 : 0.985 + 0.015 * ease.backOut((t - 0.75) / 0.25)),
  backOut: (t, c = 1.4) => 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2),
};

// [p0, p1, s0, s1, ease]
export const SEGMENTS = [
  [0.0, 0.06, 0.8, 1.05, 'sineInOut'], // stop 0, slight drift
  [0.06, 0.16, 1.05, 15.0, 'power3InOut'], // run 1
  [0.16, 0.28, 15.0, 15.12, 'sineInOut'], // stop 1
  [0.28, 0.37, 15.12, 31.0, 'power3InOut'], // run 2, faster
  [0.37, 0.48, 31.0, 31.12, 'sineInOut'], // stop 2
  [0.48, 0.56, 31.12, 47.0, 'power3InOut'], // run 3, faster again
  [0.56, 0.7, 47.0, 47.18, 'sineInOut'], // stop 3, longest hold
  [0.7, 0.94, 47.18, 128.0, 'warp'], // warp, then the final stop
  [0.94, 1.0, 128.0, 128.0, 'linear'], // headline
];

export function sAt(p) {
  p = clamp(p);
  for (const [p0, p1, s0, s1, e] of SEGMENTS) {
    if (p <= p1) return lerp(s0, s1, ease[e]((p - p0) / (p1 - p0)));
  }
  return 128;
}

// Peak ds/dp, measured once so v(p) is normalized to 1 at the fastest point of the warp.
const D = 1e-4;
let PEAK = 1;
{
  let m = 0;
  for (let p = 0.7; p < 0.94; p += 0.0005) m = Math.max(m, Math.abs(sAt(p + D) - sAt(p - D)) / (2 * D));
  PEAK = m;
}

// The runs are measured on a much larger scale than the warp, so streaks, blur and
// field of view stay subtle there (about 0.15 to 0.2) and only the warp reaches 1.
const RUN_SCALE = 2800;

export function velocityAt(p) {
  const raw = Math.abs(sAt(clamp(p + D)) - sAt(clamp(p - D))) / (2 * D);
  return clamp(p >= 0.7 ? raw / PEAK : raw / RUN_SCALE);
}

// Message 47's flip: green on arrival, then red spreading out from the sentence.
export const flipAt = (p) => smoothstep(0.605, 0.645, p);

// Front of the red wave, in slots. Bubbles behind the front (after message 47) are red.
export function waveAt(p, s) {
  if (p < 0.64) return 46.5;
  if (p < 0.7) return lerp(47.5, 61, ease.sineInOut((p - 0.64) / 0.06));
  return Math.max(61, s + 14);
}

// 0 to 1 over the last part: the final message drifts up and dims, the headline comes in.
export const outroAt = (p) => smoothstep(0.94, 1.0, p);

export const isMobile = () =>
  window.matchMedia('(max-width: 767px)').matches || window.matchMedia('(pointer: coarse)').matches;
