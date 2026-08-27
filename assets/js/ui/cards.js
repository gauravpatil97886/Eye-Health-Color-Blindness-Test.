/**
 * Fovea — shared card renderers for the test grids.
 */

import { h, icon } from '../core/dom.js';
import { store } from '../core/store.js';

/**
 * Only screen size and viewing distance actually block a test — the display
 * check is advisory and the test runs without it. Showing "Setup needed" for an
 * advisory item, or for one the user has already done, trains people to ignore
 * the badge.
 */
const BLOCKING = ['screen-size', 'distance'];

function unmetRequirements(test) {
  const cal = store.get().calibration;
  return test.requires.filter((r) => {
    if (!BLOCKING.includes(r)) return false;
    if (r === 'screen-size') return !cal.pxPerMm;
    if (r === 'distance') return !cal.viewingDistanceMm;
    return false;
  });
}

export function testCard(test) {
  const last = lastResultFor(test.id);
  const unmet = unmetRequirements(test);

  return h('a.test-card', { href: `#/t/${test.id}` },
    h('div.row', { style: { '--gap': 'var(--space-3)' } },
      h('div.test-card__icon', icon(test.icon, { size: 22 })),
      h('div',
        h('div.test-card__title', test.name),
        h('div.subtle', { style: { fontSize: 'var(--text-xs)' } }, test.tagline))),

    h('p.test-card__desc', test.measures),

    h('div.test-card__meta',
      h('span', `${test.minutes} min`),
      h('span', '·'),
      h('span', test.eyes === 'each' ? 'One eye at a time' : 'Both eyes'),
      unmet.length > 0 && [
        h('span', '·'),
        h('span.badge', icon('ruler', { size: 12 }), 'Setup needed'),
      ],
      last && h('span.badge.badge--info', icon('check', { size: 12 }), last)));
}

export function toolCard(tool) {
  return h('a.test-card', { href: tool.route },
    h('div.row', { style: { '--gap': 'var(--space-3)' } },
      h('div.test-card__icon', icon(tool.icon, { size: 22 })),
      h('div',
        h('div.test-card__title', tool.name),
        h('div.subtle', { style: { fontSize: 'var(--text-xs)' } }, tool.tagline))));
}

function lastResultFor(testId) {
  for (const session of store.get().sessions) {
    const r = session.results.find((x) => x.testId === testId);
    if (r?.summary) return r.summary;
  }
  return null;
}
