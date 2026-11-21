import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { boot, initReveal } from '../common/boot.js';
import { initSmooth } from '../common/smooth.js';
import { initLanding } from '../landing/index.js';
import { initWindowStrip } from '../home/window-strip.js';
import { initDemos } from '../home/demos.js';

gsap.registerPlugin(ScrollTrigger);

boot();
const lenis = initSmooth({ gsap, ScrollTrigger });
initLanding({ lenis });
initWindowStrip();
initDemos();
initReveal();
