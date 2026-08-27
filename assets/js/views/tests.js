/** Fovea — the test index. */

import { h, icon, createView } from '../core/dom.js';
import { screeningTests, perceptionTests, TOOLS } from '../tests/registry.js';
import { testCard, toolCard } from '../ui/cards.js';
import { store } from '../core/store.js';
import { calibrationStatus } from '../core/calibration.js';

export function testsView() {
  const cal = calibrationStatus(store.get().calibration);

  const el = h('div.view.container.section',
    h('div.stack.stack--xl',
      h('div.stack.stack--sm',
        h('h1', 'All checks'),
        h('p.lede',
          'Each one states what it measures and what it cannot. Nothing here is a ' +
          'diagnosis, and a clear result is not a clean bill of health.')),

      !store.isCalibrated && h('div.callout.callout--info',
        h('div.callout__icon', icon('ruler')),
        h('div.callout__body',
          h('p.callout__title', 'Some checks need your screen set up first'),
          h('p', 'Acuity, contrast, near vision and the blind spot check measure real angular ' +
                 'sizes, so they need to know how big your pixels are and how far away you are ' +
                 'sitting. Everything else works without it. Takes about a minute.'),
          h('p', { style: { marginTop: 'var(--space-3)' } },
            h('a.btn.btn--secondary.btn--sm', { href: '#/calibrate' },
              icon('ruler', { size: 16 }), 'Set up my screen')))),

      h('div.stack.stack--lg',
        h('h2', 'Vision checks'),
        h('div.grid.grid--auto', screeningTests().map(testCard))),

      h('div.stack.stack--lg',
        h('h2', 'Eye & brain games'),
        h('p.muted', { style: { maxWidth: 'var(--measure)' } },
          'Real perceptual measurements, but framed as what they are: interesting, ' +
          'shareable, and not a statement about your health.'),
        h('div.grid.grid--auto', perceptionTests().map(testCard))),

      h('div.stack.stack--lg',
        h('h2', 'Tools'),
        h('div.grid.grid--2', TOOLS.map(toolCard)))));

  return createView(el);
}
