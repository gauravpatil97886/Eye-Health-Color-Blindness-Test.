/**
 * Fovea — the combined report.
 *
 * This is the artefact someone prints and carries into an appointment, so it is
 * built to be read by a stranger: who it is about, when it was taken, under what
 * conditions, what each check found, and — prominently — what it is not.
 *
 * The name field is optional and exists only to label the printout. It is never
 * required to see a result, and like everything else it stays on the device.
 */

import { h, icon, createView } from '../core/dom.js';
import { store } from '../core/store.js';
import { byId } from '../tests/registry.js';
import { calibrationStatus } from '../core/calibration.js';

export function reportView({ params }) {
  const state = store.get();
  const session = params.sessionId ? store.getSession(params.sessionId) : store.latestSession;

  if (!session || session.results.length === 0) {
    return createView(h('div.view.container.container--md.section',
      h('div.empty',
        h('div.empty__icon', icon('chart', { size: 40 })),
        h('h1', 'No results yet'),
        h('p', 'Take a check and your report will build itself here.'),
        h('p', { style: { marginTop: 'var(--space-5)' } },
          h('a.btn.btn--primary', { href: '#/t/color-plates' }, 'Start the colour vision check')))));
  }

  const nameInput = h('input.input', {
    type: 'text',
    id: 'report-name',
    value: state.profile.name ?? '',
    placeholder: 'e.g. Gaurav Patil',
    autocomplete: 'name',
    maxlength: '60',
  });

  const ageSelect = h('select.input', { id: 'report-age' },
    h('option', { value: '' }, 'Prefer not to say'),
    ['Under 18', '18–29', '30–39', '40–49', '50–59', '60–69', '70+'].map((band) =>
      h('option', { value: band, selected: state.profile.ageBand === band }, band)));

  const nameOut = h('span', state.profile.name || 'Not provided');
  const ageOut = h('span', state.profile.ageBand || 'Not provided');

  const cal = calibrationStatus(session.calibration ?? state.calibration);

  const el = h('div.view.container.container--md.section',
    h('div.stack.stack--xl',

      /* ---- identity capture, hidden from the printed sheet ---- */
      h('div.card.card--sunken.stack.no-print',
        h('div.row', { style: { '--gap': 'var(--space-2)' } },
          icon('user', { size: 18 }),
          h('h2', { style: { fontSize: 'var(--text-lg)' } }, 'Label this report')),
        h('p.muted', { style: { fontSize: 'var(--text-sm)' } },
          'Optional, and only used to put a name on the printout so it is not confused ' +
          'with someone else’s. It stays on this device — there is nowhere for it to go.'),
        h('div.grid.grid--2',
          h('div.field',
            h('label.field__label', { for: 'report-name' }, 'Name'),
            nameInput),
          h('div.field',
            h('label.field__label', { for: 'report-age' }, 'Age range'),
            ageSelect,
            h('span.field__hint', 'Changes how the near-vision result is read.')))),

      /* ------------------------- the printable report ------------------------- */
      h('div.report-head',
        h('div.stack.stack--sm',
          h('p.eyebrow', 'Vision check report'),
          h('h1', { style: { fontSize: 'var(--text-3xl)' } }, 'Fovea'),
          h('p.muted', { style: { fontSize: 'var(--text-sm)' } },
            'Self-administered · generated in the browser')),
        h('dl.report-meta',
          h('div', h('dt', 'Name: '), h('dd', nameOut)),
          h('div', h('dt', 'Age range: '), h('dd', ageOut)),
          h('div', h('dt', 'Taken: '), h('dd', formatDate(session.startedAt))),
          h('div', h('dt', 'Checks completed: '), h('dd', String(session.results.length))))),

      h('div.disclaimer',
        h('p', h('strong', 'This is not a medical report and not a diagnosis. '),
          'It was produced by a web page on an uncalibrated screen, without any clinical ' +
          'supervision. It is a record of what someone answered on this device, on this day.'),
        h('p', h('strong', 'It does not contain a spectacle prescription or an eye number. '),
          'A prescription can only come from a refraction performed by a qualified ' +
          'optometrist or ophthalmologist with proper equipment. Any figure shown below ' +
          'is an indicative range, not a number to order glasses from.'),
        h('p', h('strong', 'A clear result is not a clean bill of health. '),
          'Glaucoma, diabetic retinopathy and several other conditions cause no symptoms ' +
          'until they are advanced, and none of them are detectable by any test on this site. ' +
          'Please have a proper eye examination regardless of what this says.')),

      h('div.stack.stack--sm',
        h('h2', 'Results'),
        h('div.table-wrap',
          h('table.table',
            h('thead', h('tr',
              h('th', { scope: 'col' }, 'Check'),
              h('th', { scope: 'col' }, 'Eye'),
              h('th', { scope: 'col' }, 'Finding'),
              h('th', { scope: 'col' }, 'Detail'))),
            h('tbody', session.results.map(resultRow))))),

      h('div.stack.stack--sm',
        h('h2', { style: { fontSize: 'var(--text-xl)' } }, 'Conditions this was taken under'),
        h('p.muted', { style: { fontSize: 'var(--text-sm)' } },
          'A result without its conditions cannot be interpreted. These are recorded so ' +
          'a professional reading this knows what they are looking at.'),
        h('div.table-wrap',
          h('table.table',
            h('tbody',
              conditionRow('Screen calibration',
                cal.ok ? `${(session.calibration?.pxPerMm ?? 0).toFixed(2)} px per mm` : 'Not calibrated'),
              conditionRow('Viewing distance',
                session.calibration?.viewingDistanceMm
                  ? `${(session.calibration.viewingDistanceMm / 10).toFixed(0)} cm (self-reported)`
                  : 'Not set'),
              conditionRow('Finest acuity this screen could show',
                cal.ok ? cal.finestLabel : 'Unknown without calibration'),
              conditionRow('Display filters', 'Not detectable by a web page — see the note below'),
              conditionRow('Generated', formatDate(new Date().toISOString())))))),

      h('div.callout.callout--info.no-print',
        h('div.callout__icon', icon('info')),
        h('div.callout__body',
          h('p.callout__title', 'Why we cannot check some things'),
          h('p', 'A web page has no way to read your screen brightness, or to tell whether ' +
                 'Night Shift, Night Light, f.lux or an OS colour filter is running. Those ' +
                 'change colours after the browser has drawn them. If any was on, treat the ' +
                 'colour results as unreliable and run them again.'))),

      h('div.row.no-print',
        h('button.btn.btn--primary', { type: 'button', onclick: () => window.print() },
          icon('printer', { size: 18 }), 'Save as PDF or print'),
        h('button.btn.btn--secondary', { type: 'button', onclick: downloadJson },
          icon('download', { size: 18 }), 'Download my data'),
        h('a.btn.btn--ghost', { href: '#/tests' }, 'Take another check'))));

  const view = createView(el);

  // Persist as they type so nothing is lost if they navigate away mid-edit.
  const save = () => {
    store.setProfile({ name: nameInput.value.trim(), ageBand: ageSelect.value });
    nameOut.textContent = nameInput.value.trim() || 'Not provided';
    ageOut.textContent = ageSelect.value || 'Not provided';
  };
  view.listen(nameInput, 'input', save);
  view.listen(ageSelect, 'change', save);

  return view;
}

function resultRow(result) {
  const test = byId(result.testId);
  return h('tr',
    h('td', h('strong', test?.name ?? result.testId)),
    h('td', result.eye === 'both' ? 'Both' : result.eye === 'right' ? 'Right' : 'Left'),
    h('td', result.summary ?? '—'),
    h('td.muted', { style: { fontSize: 'var(--text-xs)' } }, detailFor(result)));
}

function detailFor(result) {
  if (result.testId === 'color-plates') {
    const parts = [`${result.counts.typicalResponses}/${result.counts.scoreable} plates as expected`];
    if (result.axis?.type) parts.push(`best fit: ${result.axis.label} (${result.axis.confidence} confidence)`);
    if (result.severity) parts.push(`rough strength: ${result.severity.band}`);
    return parts.join(' · ');
  }
  return result.detail ?? '—';
}

function conditionRow(label, value) {
  return h('tr',
    h('th', { scope: 'row', style: { width: '40%' } }, label),
    h('td', value));
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

/** Data portability: if it all lives on your device, you must be able to take it off. */
function downloadJson() {
  const blob = new Blob([JSON.stringify(store.exportAll(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fovea-results-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
