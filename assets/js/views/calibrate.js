/**
 * Fovea — screen calibration.
 *
 * Two numbers make every angular measurement possible: how many pixels sit in a
 * millimetre, and how far away the viewer is. The first is recovered by matching
 * an on-screen rectangle to a real ID-1 card. The second is the harder one and
 * the bigger error source — a 2 mm slip on the card costs about 2%, while being
 * half a metre out at three metres costs 20%, and it errs in the flattering
 * direction. So the distance step is deliberately more insistent than it looks.
 */

import { h, icon, createView } from '../core/dom.js';
import { store } from '../core/store.js';
import {
  REFERENCE_OBJECTS, DISTANCE_PRESETS, NOMINAL_PX_PER_MM,
  calibrationStatus, acuityCapability, detectZoom,
} from '../core/calibration.js';
import { announce } from '../core/a11y.js';

export function calibrateView({ params }) {
  const step = params.step ?? 'index';
  if (step === 'size') return sizeStep();
  if (step === 'distance') return distanceStep();
  if (step === 'display') return displayStep();
  return indexStep();
}

/* -------------------------------------------------------------- overview */

function indexStep() {
  const cal = store.get().calibration;
  const status = calibrationStatus(cal);

  const el = h('div.view.container.container--md.section',
    h('div.stack.stack--xl',
      h('div.stack.stack--sm',
        h('p.eyebrow', 'Set-up'),
        h('h1', 'Teach Fovea about your screen'),
        h('p.lede',
          'A browser has no idea how physically large its pixels are or how far away you ' +
          'are sitting. Without both, an acuity or contrast result is a number with no units.')),

      h('div.stack',
        stepRow('Screen size', cal.pxPerMm
          ? `${cal.pxPerMm.toFixed(2)} px per mm`
          : 'Not set', '#/calibrate/size', Boolean(cal.pxPerMm)),
        stepRow('Viewing distance', cal.viewingDistanceMm
          ? `${(cal.viewingDistanceMm / 10).toFixed(0)} cm`
          : 'Not set', '#/calibrate/distance', Boolean(cal.viewingDistanceMm)),
        stepRow('Display check', 'Colour and brightness sanity', '#/calibrate/display', false)),

      status.ok && h('div.callout.callout--ok',
        h('div.callout__icon', icon('check-circle')),
        h('div.callout__body',
          h('p.callout__title', `Set up — finest acuity this screen can show is ${status.finestLabel}`),
          h('p', status.canReach66
            ? 'That is enough to test down to 6/6 from where you are sitting.'
            : `To test down to 6/6 you would need to sit about ${(status.distanceFor66Mm / 1000).toFixed(1)} m away. ` +
              'Below that, the optotype stroke is thinner than one physical pixel and the screen ' +
              'simply cannot draw it.'))),

      h('a.btn.btn--secondary', { href: '#/tests' }, 'Back to checks')));

  return createView(el);
}

function stepRow(title, value, href, done) {
  return h('a.test-card', { href, style: { flexDirection: 'row', alignItems: 'center' } },
    h('div.test-card__icon', icon(done ? 'check-circle' : 'ruler', { size: 20 })),
    h('div', { style: { flex: '1' } },
      h('div.test-card__title', title),
      h('div.subtle', { style: { fontSize: 'var(--text-sm)' } }, value)),
    icon('arrow-right', { size: 18 }));
}

/* ------------------------------------------------------------ px per mm */

function sizeStep() {
  const saved = store.get().calibration.pxPerMm ?? NOMINAL_PX_PER_MM;
  let object = REFERENCE_OBJECTS[0];
  let widthPx = Math.round(object.widthMm * saved);

  const card = h('div.calibrator__card');
  const readout = h('div.calibrator__readout');
  const range = h('input.slider', {
    type: 'range',
    min: '120', max: '900', step: '1', value: String(widthPx),
    'aria-label': 'Width of the on-screen card',
  });

  const picker = h('select.input', { 'aria-label': 'Which object are you using?' },
    REFERENCE_OBJECTS.map((o) => h('option', { value: o.id }, o.label)));
  const hint = h('p.field__hint', object.hint);

  function paint() {
    const heightPx = widthPx * (object.heightMm / object.widthMm);
    card.style.width = `${widthPx}px`;
    card.style.height = `${heightPx}px`;
    // Real cards have a 3.18 mm corner radius, so matching the corners is a
    // second, independent check that the scale is right.
    const pxPerMm = widthPx / object.widthMm;
    card.style.borderRadius = `${3.18 * pxPerMm}px`;
    card.dataset.size = `${object.widthMm} × ${object.heightMm} mm`;
    readout.textContent = `${pxPerMm.toFixed(2)} px per mm`;
  }

  const el = h('div.view.container.container--md.section',
    h('div.stack.stack--xl',
      h('div.stack.stack--sm',
        h('a.btn.btn--ghost.btn--sm', { href: '#/calibrate' }, icon('arrow-left', { size: 16 }), 'Set-up'),
        h('h1', 'Match a real object'),
        h('p.lede',
          'Hold the object flat against your screen and resize the outline until the edges ' +
          'line up exactly. The corner curve should match too.')),

      h('div.field',
        h('label.field__label', 'What are you holding up?'),
        picker,
        hint),

      h('div.calibrator', card, range, readout),

      h('div.callout.callout--info',
        h('div.callout__icon', icon('info')),
        h('div.callout__body',
          h('p', 'Keep your browser zoom at 100% from here on. Zooming rescales every pixel ' +
                 'and quietly invalidates this measurement — the tests will notice and stop ' +
                 'if it changes mid-run.'))),

      h('div.row',
        h('a.btn.btn--primary', {
          href: '#/calibrate/distance',
          onclick: () => {
            store.setCalibration({ pxPerMm: widthPx / object.widthMm });
            announce('Screen size saved');
          },
        }, 'Save and set distance', icon('arrow-right', { size: 18 })),
        h('a.btn.btn--ghost', { href: '#/calibrate' }, 'Cancel'))));

  const view = createView(el);
  view.listen(range, 'input', () => { widthPx = Number(range.value); paint(); });
  view.listen(picker, 'change', () => {
    object = REFERENCE_OBJECTS.find((o) => o.id === picker.value);
    hint.textContent = object.hint;
    paint();
  });
  paint();
  return view;
}

/* ------------------------------------------------------------- distance */

function distanceStep() {
  const cal = store.get().calibration;
  let chosen = cal.viewingDistanceMm ?? 600;

  const capability = h('p.muted');
  const options = h('div.stack.stack--sm',
    DISTANCE_PRESETS.map((preset) =>
      h('label.check',
        h('input', {
          type: 'radio', name: 'distance', value: String(preset.mm),
          checked: preset.mm === chosen,
        }),
        h('div',
          h('div', { style: { fontWeight: 'var(--weight-semibold)' } }, preset.label),
          h('div.subtle', { style: { fontSize: 'var(--text-sm)' } }, preset.hint)))));

  function updateCapability() {
    if (!cal.pxPerMm) {
      capability.textContent = 'Set your screen size first to see what this distance can measure.';
      return;
    }
    const c = acuityCapability({ pxPerMm: cal.pxPerMm, viewingDistanceMm: chosen });
    capability.textContent = c.canReach66
      ? `At this distance your screen can show detail down to ${c.finestLabel}. That is enough for a full acuity check.`
      : `At this distance your screen tops out at ${c.finestLabel} — it physically cannot draw anything finer. ` +
        `For a 6/6 measurement you would need about ${(c.distanceFor66Mm / 1000).toFixed(1)} m.`;
  }

  const el = h('div.view.container.container--md.section',
    h('div.stack.stack--xl',
      h('div.stack.stack--sm',
        h('a.btn.btn--ghost.btn--sm', { href: '#/calibrate' }, icon('arrow-left', { size: 16 }), 'Set-up'),
        h('h1', 'How far away are you?'),
        h('p.lede',
          'This is the number that matters most, and the one people guess worst. Being half a ' +
          'metre out at three metres shifts the result by about a fifth — and it shifts it in ' +
          'the flattering direction, so a guess makes your eyes look better than they are.')),

      options,
      h('div.card.card--sunken', capability),

      h('div.callout.callout--watch',
        h('div.callout__icon', icon('alert')),
        h('div.callout__body',
          h('p.callout__title', 'Please actually measure it'),
          h('p', 'Pace it out, use a tape, or lay a known object end to end. An estimate here ' +
                 'is the single biggest source of error in any home acuity test.'))),

      h('div.row',
        h('a.btn.btn--primary', {
          href: '#/calibrate',
          onclick: () => {
            store.setCalibration({ viewingDistanceMm: chosen });
            announce('Viewing distance saved');
          },
        }, 'Save distance', icon('check', { size: 18 })),
        h('a.btn.btn--ghost', { href: '#/calibrate' }, 'Cancel'))));

  const view = createView(el);
  view.listen(options, 'change', (e) => {
    chosen = Number(e.target.value);
    updateCapability();
  });
  updateCapability();
  return view;
}

/* -------------------------------------------------------- display check */

function displayStep() {
  const zoom = detectZoom();
  const checks = autoChecks(zoom);

  const el = h('div.view.container.container--md.section',
    h('div.stack.stack--xl',
      h('div.stack.stack--sm',
        h('a.btn.btn--ghost.btn--sm', { href: '#/calibrate' }, icon('arrow-left', { size: 16 }), 'Set-up'),
        h('h1', 'Display check'),
        h('p.lede', 'What the browser can verify on its own, and what only you can.')),

      h('div.stack.stack--sm',
        h('h2', { style: { fontSize: 'var(--text-lg)' } }, 'Checked automatically'),
        h('div.table-wrap',
          h('table.table',
            h('tbody', checks.map(({ label, value, ok }) =>
              h('tr',
                h('td', { style: { width: '2rem' } },
                  icon(ok ? 'check-circle' : 'alert', { size: 18 })),
                h('th', { scope: 'row' }, label),
                h('td.muted', value))))))),

      h('div.stack.stack--sm',
        h('h2', { style: { fontSize: 'var(--text-lg)' } }, 'Only you can check these'),
        h('p.muted', { style: { fontSize: 'var(--text-sm)' } },
          'A web page cannot see any of the following. Night Shift, Night Light, f.lux and ' +
          'operating-system colour filters are applied after the browser has drawn the page, ' +
          'so reading the pixels back tells us nothing at all about them.'),
        h('ul.stack.stack--sm',
          [
            'Screen brightness turned up, and auto-brightness off.',
            'Night mode / blue-light filter / f.lux switched OFF.',
            'Any operating-system colour filter switched OFF.',
            'Dark Reader or similar page-recolouring extensions disabled.',
            'Your usual glasses or contacts on — but tinted or colour-correcting lenses off.',
            'A neutrally lit room, with no glare or coloured light on the screen.',
          ].map((t) => h('li.check', icon('check', { size: 16 }), h('span', t))))),

      h('a.btn.btn--primary', { href: '#/calibrate' }, 'Done', icon('check', { size: 18 }))));

  return createView(el);
}

function autoChecks(zoom) {
  const mq = (q) => window.matchMedia(q).matches;
  const darkReader = Boolean(
    document.querySelector('meta[name="darkreader"]') ||
    document.querySelector('style.darkreader')
  );

  return [
    { label: 'Page zoom', ok: !zoom.likelyZoomed,
      value: zoom.likelyZoomed ? 'Looks zoomed — reset to 100%' : 'At 100%' },
    { label: 'Forced colours', ok: !mq('(forced-colors: active)'),
      value: mq('(forced-colors: active)')
        ? 'Active — the OS is overriding our palette, colour checks are invalid'
        : 'Off' },
    { label: 'Inverted colours', ok: !mq('(inverted-colors: inverted)'),
      value: mq('(inverted-colors: inverted)') ? 'Inverted — colour checks are invalid' : 'Normal' },
    { label: 'Monochrome display', ok: !mq('(monochrome)'),
      value: mq('(monochrome)') ? 'Monochrome — colour checks cannot run' : 'Colour display' },
    { label: 'Display colour range', ok: true,
      value: mq('(color-gamut: rec2020)') ? 'rec2020' : mq('(color-gamut: p3)') ? 'Display P3' : 'sRGB' },
    { label: 'Page-recolouring extension', ok: !darkReader,
      value: darkReader ? 'Dark Reader detected — please disable it for colour checks' : 'None detected' },
    { label: 'Device pixel ratio', ok: true, value: String(zoom.devicePixelRatio) },
  ];
}
