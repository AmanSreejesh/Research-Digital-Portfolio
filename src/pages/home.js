import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initNav } from '../common/nav.js';
import { initReveal } from '../common/reveal.js';
import { initSmooth } from '../common/smooth.js';
import { initLanding } from '../landing/index.js';

gsap.registerPlugin(ScrollTrigger);

initNav();
initSmooth({ gsap, ScrollTrigger });
initLanding();
initReveal();
