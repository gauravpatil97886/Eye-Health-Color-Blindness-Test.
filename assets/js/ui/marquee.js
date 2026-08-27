/**
 * Fovea — the auto-sliding check showcase.
 *
 * The catalogue used to sit well below the fold, so most visitors never learned
 * the site does more than one test. This puts a moving strip of every check
 * directly under the hero.
 *
 * ACCESSIBILITY — this is content that moves on its own, which WCAG 2.2.2
 * (Pause, Stop, Hide) governs. Anything that animates automatically for more
 * than five seconds needs a genuine pause mechanism, and pause-on-hover does
 * not count because it is unreachable by keyboard and by touch. So:
 *
 *   - an explicit, always-visible pause/play control
 *   - it also pauses on hover, and on keyboard focus landing inside
 *   - prefers-reduced-motion stops it dead and leaves a normal scrollable row
 *   - the duplicated half is aria-hidden AND inert, so a screen reader hears
 *     each check once and a keyboard user never tabs into the invisible copy
 *
 * The animation is a pure CSS transform on a duplicated track, so it costs no
 * main-thread work and cannot stutter the canvas work elsewhere on the page.
 */

import { h, icon } from '../core/dom.js';
import { prefersReducedMotion } from '../core/prefs.js';
import { testPreview } from './preview.js';

/**
 * @param {Array} items  test/tool records from the registry
 * @param {object} [opts]
 * @param {number} [opts.seconds] time for one full loop
 */
export function createMarquee(items, { seconds = 48 } = {}) {
  const reduced = prefersReducedMotion();
  let paused = reduced;

  const track = h('div.marquee__track');

  // Two identical halves: when the first has scrolled exactly its own width,
  // the second sits precisely where it began, so the loop has no seam.
  //
  // The duplicate is `inert` as well as aria-hidden. aria-hidden alone is not
  // enough and is in fact invalid: its links stay in the tab order, so a
  // keyboard user tabs off the end of the visible list into a copy they cannot
  // see and cannot escape. `inert` removes the subtree from both the tab order
  // and the accessibility tree, which is exactly what a decorative duplicate
  // needs.
  const half = () => items.map((item) => chip(item));
  const first = h('div.marquee__half', half());
  const second = h('div.marquee__half', { 'aria-hidden': 'true', inert: true }, half());
  track.append(first, second);

  track.style.animationDuration = `${seconds}s`;
  if (reduced) track.style.animationPlayState = 'paused';

  const toggle = h('button.marquee__toggle', {
    type: 'button',
    'aria-pressed': String(paused),
    onclick: () => setPaused(!paused),
  });

  function setPaused(next) {
    paused = next;
    track.style.animationPlayState = paused ? 'paused' : 'running';
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Resume the moving list' : 'Pause the moving list');
    toggle.replaceChildren(
      icon(paused ? 'play' : 'pause', { size: 14 }),
      h('span', paused ? 'Play' : 'Pause')
    );
  }
  setPaused(paused);

  const viewport = h('div.marquee__viewport', track);

  // Hover and focus pause too — but they are a convenience on top of the
  // button, never a replacement for it.
  const hold = () => { if (!paused) track.style.animationPlayState = 'paused'; };
  const release = () => { if (!paused) track.style.animationPlayState = 'running'; };
  viewport.addEventListener('pointerenter', hold);
  viewport.addEventListener('pointerleave', release);
  viewport.addEventListener('focusin', hold);
  viewport.addEventListener('focusout', release);

  return h('div.marquee', { role: 'region', 'aria-label': 'All checks' },
    viewport,
    h('div.marquee__controls', toggle));
}

/**
 * Each chip carries a live miniature of that test's real stimulus rather than
 * an icon — the fastest way to show what the suite actually contains.
 */
function chip(item) {
  const href = item.route ?? `#/t/${item.id}`;
  return h('a.marquee__chip', { href },
    h('span.marquee__chip-media', testPreview(item.id)),
    h('span.marquee__chip-body',
      h('span.marquee__chip-name', item.name),
      h('span.marquee__chip-note', item.tagline)));
}
