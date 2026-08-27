/**
 * Fovea — landing screen.
 *
 * One dominant call to action, the hero that demonstrates the product, and an
 * honest statement of what this is directly under the fold. No testimonials, no
 * "99% accurate", no urgency copy — the whole positioning is that we tell the
 * truth about our own limits, and the landing page has to sound like it.
 */

import { h, icon, createView } from '../core/dom.js';
import { store } from '../core/store.js';
import { screeningTests, perceptionTests, TOOLS } from '../tests/registry.js';
import { createMosaic } from '../ui/mosaic.js';
import { testCard, toolCard } from '../ui/cards.js';
import { createMarquee } from '../ui/marquee.js';
import { initReveal } from '../ui/reveal.js';
import { prefersReducedMotion } from '../core/prefs.js';

export function landingView() {
  const canvas = h('canvas.mosaic__canvas', { width: 480, height: 480 });
  const slider = h('input.slider', {
    type: 'range', min: '0', max: '100', value: '0', step: '1',
    'aria-label': 'Simulate a green-weak (deutan) colour vision deficiency',
    'aria-describedby': 'mosaic-caption',
  });
  const readout = h('span.mosaic__value', '0% — typical colour vision');

  const sessions = store.get().sessions.length;

  const el = h('div.view',
    h('section.hero',
      h('div.container',
        h('div.hero__grid',
          h('div.stack.stack--lg',
            h('p.eyebrow', 'Open-source vision checks'),
            h('h1.hero__title', 'Find out how ', h('em', 'you'), ' see.'),
            h('p.hero__lede',
              'Twelve vision and perception tests that run entirely in your browser. ' +
              'Colour vision, visual acuity, astigmatism, central vision and more — ' +
              'then one report you can print and take to an eye doctor.'),
            h('div.hero__cta',
              h('a.btn.btn--primary.btn--lg', { href: '#/t/color-plates' },
                'Start the colour vision test', icon('arrow-right')),
              h('a.btn.btn--secondary.btn--lg', { href: '#/screening' },
                'Run all the checks')),
            h('p.hero__trust', icon('lock', { size: 16 }),
              'No account. No tracking. Nothing you do here is uploaded.'),
            sessions > 0 &&
              h('p', { style: { fontSize: 'var(--text-sm)' } },
                h('a', { href: '#/report' }, `View your report (${sessions} previous session${sessions === 1 ? '' : 's'})`))),

          h('div.mosaic',
            h('div.mosaic__frame', canvas),
            h('div.mosaic__control',
              h('label.mosaic__label', { for: slider.id = 'mosaic-slider' },
                h('span', 'Drag to simulate a colour vision deficiency'),
                readout),
              slider,
              h('p.subtle', { id: 'mosaic-caption', style: { fontSize: 'var(--text-xs)' } },
                'A rendering of the cone mosaic in your fovea, with a figure hidden in it by ' +
                'hue alone. Around 1 in 12 men see it closer to the right-hand end of this ' +
                'slider than the left.')))))),

    /* The whole catalogue, directly under the hero. It used to sit far below
       the fold and most visitors never learned the site does more than one
       test. */
    createMarquee([...screeningTests(), ...perceptionTests(), ...TOOLS]),

    h('section.container',
      h('div.stats', { 'data-reveal-group': '' },
        stat('1 in 12', 'men have a colour vision deficiency'),
        stat('1 in 200', 'women have one'),
        stat('~60%', 'of cases are never formally diagnosed'),
        stat('0 bytes', 'of your data leave this device'))),

    h('section.section.container',
      h('div.stack.stack--lg',
        h('div.stack.stack--sm',
          h('h2', { id: 'vision-checks' }, 'Vision checks'),
          h('p.lede', 'Eight of them, modelled on what an optometrist runs. Each states up ' +
                      'front what it measures — and what it cannot.')),
        h('div.grid.grid--auto', { 'data-reveal-group': '' }, screeningTests().map(testCard)))),

    h('section.section--tight.container',
      h('div.stack.stack--lg',
        h('div.stack.stack--sm',
          h('h2', { id: 'brain-games' }, 'Eye & brain games'),
          h('p.lede', 'Four real perceptual measurements, framed as what they are: ' +
                      'fascinating, shareable, and not a statement about your health.')),
        h('div.grid.grid--auto', { 'data-reveal-group': '' }, perceptionTests().map(testCard)))),

    h('section.section--tight.container',
      h('div.stack.stack--lg',
        h('h2', 'Tools'),
        h('div.grid.grid--2', { 'data-reveal-group': '' }, TOOLS.map(toolCard)))),

    h('section.section.container',
      h('div.card.card--sunken.stack',
        h('h2', { style: { fontSize: 'var(--text-xl)' } }, 'What Fovea is honest about'),
        h('div.means-grid', { 'data-reveal-group': '' },
          h('div.means',
            h('h4', 'What it can do'),
            h('ul',
              h('li', 'Tell you whether something looks worth getting checked'),
              h('li', 'Measure visual acuity properly — if your screen and distance allow it, and it says so when they don’t'),
              h('li', 'Suggest which type of colour vision deficiency your answers fit'),
              h('li', 'Track your results over time, on your device'))),
          h('div.means',
            h('h4', 'What it cannot do'),
            h('ul',
              h('li', 'Diagnose anything, or rule anything out'),
              h('li', 'Measure your spectacle prescription'),
              h('li', 'Detect the eye diseases that cause no symptoms until they are advanced'),
              h('li', 'Know how bright your screen is, or whether night mode is on')))),
        h('p.muted', { style: { fontSize: 'var(--text-sm)' } },
          'A normal result here is not reassurance. Regular professional eye exams are ' +
          'the only way to catch the conditions that stay silent. ',
          h('a', { href: '#/learn/when-to-see-a-doctor' }, 'When to see an eye doctor →')))));

  const view = createView(el);

  requestAnimationFrame(() => {
    if (el.isConnected) view.onDestroy(initReveal(el));
  });

  // The mosaic is expensive to pack, so build it once the view is in the DOM.
  requestAnimationFrame(() => {
    if (!canvas.isConnected) return;
    const box = canvas.parentElement.getBoundingClientRect();
    const size = Math.max(280, Math.min(480, Math.round(box.width)));
    let mosaic;
    try {
      mosaic = createMosaic(canvas, { size, figure: '6', seed: 'fovea-hero' });
    } catch (err) {
      // A canvas failure must never take the landing page down with it.
      console.error('mosaic failed', err);
      canvas.parentElement.replaceChildren(
        h('div.empty', h('p', 'Your browser could not draw the mosaic.')));
      return;
    }

    const label = (pct) => pct === 0
      ? '0% — typical colour vision'
      : pct >= 98
        ? '100% — full deuteranopia'
        : `${pct}% — deuteranomaly`;

    view.listen(slider, 'input', () => {
      // Any interaction wins immediately — the intro is a demonstration, not
      // something to sit through.
      mosaic.stop();
      const pct = Number(slider.value);
      mosaic.setSeverity(pct / 100);
      readout.textContent = label(pct);
    });
    view.listen(slider, 'pointerdown', () => mosaic.stop());
    view.listen(slider, 'keydown', () => mosaic.stop());

    view.onDestroy(() => mosaic.destroy());

    // Assemble from the fovea outward, then sweep the deficiency once so the
    // hidden figure dissolves and returns without anyone touching anything.
    // Runs once and settles; reduced motion skips it entirely.
    if (!prefersReducedMotion()) {
      mosaic.play({
        onSeverity(v) {
          const pct = Math.round(v * 100);
          slider.value = String(pct);
          readout.textContent = label(pct);
        },
      });
    }
  });

  return view;
}

function stat(value, label) {
  return h('div.stat',
    h('div.stat__value', value),
    h('div.stat__label', label));
}
