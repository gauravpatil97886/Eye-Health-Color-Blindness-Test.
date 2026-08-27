/**
 * Fovea — the validity gate.
 *
 * Nothing is pre-ticked. The friction is the feature: an unconfirmed condition
 * is recorded on the result and downgrades its confidence forever, which is far
 * more useful than a result that silently pretends the room was fine.
 */

import { h, icon, createView } from '../core/dom.js';
import { store } from '../core/store.js';

const ATTESTATIONS = [
  ['brightnessMax', 'My screen brightness is turned up, and auto-brightness is off'],
  ['nightModeOff', 'Night mode / blue-light filter / f.lux is switched OFF'],
  ['noColourFilter', 'No operating-system colour filter or page-recolouring extension is running'],
  ['correctionAsUsual', 'I am wearing my usual glasses or contacts — and no tinted lenses'],
  ['distanceConfirmed', 'I am sitting about an arm’s length from the screen'],
  ['lightingOk', 'The room is comfortably lit, with no glare on the screen'],
];

export function checkView({ query }) {
  const next = query.next ? decodeURIComponent(query.next) : '#/tests';
  const state = {};
  const proceed = h('button.btn.btn--primary.btn--lg', { type: 'button', disabled: true },
    'I confirm — start');

  function sync() {
    proceed.disabled = ATTESTATIONS.some(([key]) => !state[key]);
  }

  const el = h('div.view.container.container--md.section',
    h('div.stack.stack--xl',
      h('div.stack.stack--sm',
        h('p.eyebrow', 'Before you start'),
        h('h1', 'Conditions we cannot check for you'),
        h('p.lede',
          'A web page cannot read your screen brightness, and cannot tell whether a colour ' +
          'filter is running — those are applied after the browser has drawn the page. ' +
          'Please confirm honestly. A wrong result helps nobody.')),

      h('div.card.stack.stack--sm',
        ATTESTATIONS.map(([key, text]) =>
          h('label.check',
            h('input', { type: 'checkbox', name: key }),
            h('span', text)))),

      h('div.row',
        proceed,
        h('a.btn.btn--ghost', { href: next },
          'Skip — I understand my result may be unreliable'))));

  const view = createView(el);

  view.listen(el, 'change', (e) => {
    state[e.target.name] = e.target.checked;
    sync();
  });

  view.listen(proceed, 'click', () => {
    store.setChecklist({ ...state, skipped: false });
    window.location.hash = next.replace(/^#/, '');
  });

  return view;
}
