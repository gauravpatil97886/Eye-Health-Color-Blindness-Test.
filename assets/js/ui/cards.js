/**
 * Fovea — shared card renderers for the test grids.
 */

import { h, icon } from '../core/dom.js';
import { store } from '../core/store.js';
import { REQUIREMENT_LABELS } from '../tests/registry.js';

export function testCard(test) {
  const last = lastResultFor(test.id);

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
      test.requires.length > 0 && [
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
