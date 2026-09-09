(()=>{
'use strict';

/* Respect reduced motion at the top level: if set, do nothing at all.
   Content is already visible by default in the CSS (gsap.from() only ever
   animates FROM a state TO the element's natural state, so skipping this
   file entirely still leaves every page fully visible and functional). */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduceMotion) return;

/* Guard: if GSAP/Lenis failed to load (CDN blocked, offline, etc.),
   fail silently rather than throwing — the page still works with native scroll. */
if (typeof gsap === 'undefined' || typeof Lenis === 'undefined') return;

/* --- Motion orchestration: one shared scroll engine --- */
document.documentElement.style.scrollBehavior = 'auto'; // avoid double-smoothing against Lenis
const lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 3) });
gsap.registerPlugin(ScrollTrigger);
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* --- Scrollcraft: reveal-on-scroll for this site's real grid items ---
   Covers grid classes on CSS Grid layouts only: work-card / case-card
   (work.html), motion-item (motion-animation.html), role (contact-cv.html),
   featured-motion-item (if present).

   Deliberately excludes .tile (additional-work.html) and .apparel-item
   (apparel.html): those live inside `columns:` (CSS multi-column) layouts,
   and applying `transform` to a column child corrupts the browser's column
   width measurement — visible as images squeezed into narrow vertical
   slivers. Opacity-only animation is used for those two instead, below. */
const revealSelectors = '.work-card, .case-card, .motion-item, .role, .featured-motion-item';
document.querySelectorAll(revealSelectors).forEach((el) => {
  gsap.from(el, {
    opacity: 0,
    y: 24,
    duration: 0.7,
    ease: 'power2.out',
    scrollTrigger: { trigger: el, start: 'top 90%', once: true }
  });
});

/* Multi-column layout items: opacity-only fade, no transform, no y-shift —
   safe inside `columns:` containers. */
document.querySelectorAll('.tile, .apparel-item').forEach((el) => {
  gsap.from(el, {
    opacity: 0,
    duration: 0.7,
    ease: 'power2.out',
    scrollTrigger: { trigger: el, start: 'top 90%', once: true }
  });
});

/* Gentle entrance for the hero headline on load — index.html only,
   harmless no-op on pages without a .hero-copy element. */
const heroCopy = document.querySelector('.hero-copy');
if (heroCopy) {
  gsap.from(heroCopy, { opacity: 0, y: 16, duration: 0.8, ease: 'power2.out', delay: 0.1 });
}

/* Video posters/images loading late can shift layout and throw off trigger
   positions — recalculate once everything has actually loaded. */
window.addEventListener('load', () => ScrollTrigger.refresh());
})();