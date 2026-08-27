/** Fovea — settings, including the data controls the privacy promise requires. */

import { h, icon, createView } from '../core/dom.js';
import { store } from '../core/store.js';
import { applyPrefs } from '../core/prefs.js';
import { announce } from '../core/a11y.js';

export function settingsView() {
  const prefs = store.get().prefs;
  const sessions = store.get().sessions.length;

  const el = h('div.view.container.container--md.section',
    h('div.stack.stack--xl',
      h('div.stack.stack--sm', h('p.eyebrow', 'Settings'), h('h1', 'Preferences')),

      h('div.card.stack',
        h('h2', { style: { fontSize: 'var(--text-lg)' } }, 'Appearance'),
        radioRow('Colour theme', 'theme', prefs.theme, [
          ['system', 'Follow my system'], ['light', 'Light'], ['dark', 'Dark'],
        ]),
        toggleRow('Larger text', 'largeText', prefs.largeText,
          'Scales the whole interface up by one LogMAR chart line.'),
        toggleRow('Higher contrast', 'highContrast', prefs.highContrast,
          'Stronger borders and full-strength body text throughout.'),
        toggleRow('Reduce motion', 'reduceMotion', prefs.reduceMotion === true,
          'Removes the few transitions in the interface. Test stimuli never animate anyway.')),

      h('div.card.stack',
        h('h2', { style: { fontSize: 'var(--text-lg)' } }, 'Checks'),
        toggleRow('Shapes instead of numbers', 'kidsMode', prefs.kidsMode,
          'For young children, or anyone who would rather not read numerals. The colour ' +
          'check uses circles, squares, triangles and stars instead.')),

      h('div.card.stack',
        h('h2', { style: { fontSize: 'var(--text-lg)' } }, 'Your data'),
        h('p.muted', { style: { fontSize: 'var(--text-sm)' } },
          `${sessions} session${sessions === 1 ? '' : 's'} stored in this browser. Nothing has ` +
          'been sent anywhere — there is nowhere for it to go.'),
        h('div.row',
          h('button.btn.btn--secondary', {
            type: 'button',
            onclick: () => {
              const blob = new Blob([JSON.stringify(store.exportAll(), null, 2)], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `fovea-export-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(a.href);
            },
          }, icon('download', { size: 18 }), 'Export everything'),
          h('button.btn.btn--danger', {
            type: 'button',
            onclick: (e) => {
              const btn = e.currentTarget;
              if (btn.dataset.confirm !== 'yes') {
                btn.dataset.confirm = 'yes';
                btn.textContent = 'Tap again to delete permanently';
                setTimeout(() => {
                  btn.dataset.confirm = '';
                  btn.replaceChildren(icon('trash', { size: 18 }), document.createTextNode('Delete everything'));
                }, 5000);
                return;
              }
              store.clearAll();
              announce('All data deleted');
              window.location.hash = '#/';
            },
          }, icon('trash', { size: 18 }), 'Delete everything')))));

  const view = createView(el);

  view.listen(el, 'change', (e) => {
    const key = e.target.name;
    if (!key) return;
    if (e.target.type === 'radio') store.setPrefs({ [key]: e.target.value });
    else store.setPrefs({ [key]: e.target.checked });
    applyPrefs();
  });

  return view;
}

function toggleRow(label, name, checked, hint) {
  return h('div.stack.stack--sm',
    h('label.switch',
      h('input', { type: 'checkbox', name, checked }),
      h('span.switch__track'),
      h('span', label)),
    hint && h('p.field__hint', { style: { marginLeft: '3.5rem' } }, hint));
}

function radioRow(label, name, value, options) {
  return h('div.field',
    h('span.field__label', label),
    h('div.row', options.map(([v, text]) =>
      h('label.check', { style: { minHeight: 'auto' } },
        h('input', { type: 'radio', name, value: v, checked: value === v }),
        h('span', text)))));
}
