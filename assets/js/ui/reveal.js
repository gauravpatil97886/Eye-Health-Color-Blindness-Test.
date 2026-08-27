/**
 * Fovea — scroll reveal.
 *
 * Sections rise and fade in as they enter the viewport.
 *
 * THE ORDER OF OPERATIONS MATTERS AND IS DELIBERATE. The hidden state is added
 * BY JAVASCRIPT, never written into the stylesheet. If this module fails to
 * load, if IntersectionObserver is missing, if a script error happens earlier
 * in the bundle — the content is simply visible, because nothing ever hid it.
 * The common way to build this is to set opacity:0 in CSS and rely on JS to
 * undo it, which turns any scripting failure into a blank page. On a site whose
 * audience includes people with impaired vision, that is not a risk worth a
 * fade.
 *
 * Reduced motion skips the whole thing rather than shortening it.
 */

import { prefersReducedMotion } from '../core/prefs.js';

const SELECTOR = '[data-reveal-group] > *, .reveal';

export function initReveal(root) {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return () => {};

  const targets = [...root.querySelectorAll(SELECTOR)];
  if (!targets.length) return () => {};

  // Hide only now that we know we can definitely show it again.
  for (const el of targets) el.setAttribute('data-reveal-hidden', '');

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      // Stagger within a row so a grid cascades rather than popping as a block.
      const siblings = [...(el.parentElement?.children ?? [])];
      const delay = Math.min(siblings.indexOf(el), 5) * 60;
      el.style.transitionDelay = `${delay}ms`;
      el.removeAttribute('data-reveal-hidden');
      io.unobserve(el);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

  for (const el of targets) io.observe(el);

  // Anything already on screen at load reveals immediately, so the first
  // viewport is never waiting on a scroll that may not come.
  requestAnimationFrame(() => {
    for (const el of targets) {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.removeAttribute('data-reveal-hidden');
        io.unobserve(el);
      }
    }
  });

  return () => io.disconnect();
}
