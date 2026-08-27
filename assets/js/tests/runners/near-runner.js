/**
 * Fovea — near vision.
 *
 * The smallest print you can read comfortably at 40 cm, reported in N-notation
 * (N-size is simply the print size in typographic points, so N6 is 6 pt).
 *
 * ON THE READING ADD
 * Unlike distance acuity, the age-to-reading-add relationship is reasonably
 * defensible: accommodation declines with age along a well-characterised curve,
 * and the add needed to read comfortably at 40 cm follows it. We show that
 * age-expected add as CONTEXT — what is typical for someone your age — and are
 * explicit that it is not your prescription. It is the difference between "here
 * is the population curve you sit on" and "here is your number", and only the
 * first is honest from a web page.
 */

import { h, icon } from '../../core/dom.js';
import { announce } from '../../core/a11y.js';
import { store } from '../../core/store.js';
import { N_SIZES, nSizeHeightPx, NEAR_STANDARD_DISTANCE_MM } from '../../core/calibration.js';

/** Short, unpredictable strings — nothing memorisable, nothing guessable. */
const PASSAGES = [
  'the quiet harbour filled with morning light',
  'she folded the letter and set it down again',
  'a narrow road climbs between the olive trees',
  'the kettle boiled while the rain kept falling',
  'he counted the coins twice before answering',
  'small birds gathered on the telephone wire',
];

/** Typical reading add by age. Population curve, not a prescription. */
const AGE_ADD = [
  ['Under 18', null], ['18–29', null], ['30–39', null],
  ['40–49', '+0.75 to +1.25 D'], ['50–59', '+1.50 to +2.00 D'],
  ['60–69', '+2.00 to +2.50 D'], ['70+', '+2.50 D'],
];

export const runner = {
  id: 'near',
  testMode: 'white',

  create({ onComplete }) {
    const cal = store.get().calibration;
    const EYES = ['right', 'left'];
    let eyeIndex = 0;
    let sizeIndex = 0;               // walks N48 down to N4
    const perEye = [];
    let disposed = false;
    const host = h('div.stage');

    if (!cal.pxPerMm) {
      host.append(
        h('h1', { style: { color: 'var(--test-fg)' } }, 'Set your screen size first'),
        h('p.stage__hint',
          'Print size is a physical measurement. Without knowing how big your pixels are, ' +
          'rendering "N6" would be guesswork.'),
        h('div.row.row--center',
          h('a.btn.btn--primary', { href: '#/calibrate/size' }, 'Calibrate my screen'),
          h('a.btn.btn--ghost', { href: '#/tests' }, 'Back')));
      return { el: host, destroy() {} };
    }

    function render() {
      const n = N_SIZES[sizeIndex];
      const px = nSizeHeightPx(n, { pxPerMm: cal.pxPerMm });
      const eye = EYES[eyeIndex];
      const passage = PASSAGES[(sizeIndex + eyeIndex) % PASSAGES.length];

      host.replaceChildren(
        h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' }, icon('x', { size: 16 }), 'Stop'),
        h('p.stage__prompt', `Cover your ${eye === 'right' ? 'LEFT' : 'RIGHT'} eye`),
        h('p.stage__hint',
          'Hold your face about 40 cm from the screen — roughly a forearm. Keep your reading ' +
          'glasses on if you use them.'),

        h('div', {
          style: {
            background: '#fff', color: '#000',
            padding: 'var(--space-8) var(--space-6)',
            borderRadius: 'var(--radius-md)',
            maxWidth: 'min(92vw, 42rem)',
          },
        },
          h('p', {
            style: {
              fontSize: `${px}px`,
              lineHeight: '1.45',
              fontFamily: 'Georgia, "Times New Roman", serif',
              margin: '0',
            },
          }, passage)),

        h('p.stage__hint', `N${n} · can you read this comfortably?`),

        h('div.row.row--center',
          h('button.btn.btn--primary', {
            type: 'button',
            onclick: () => {
              if (sizeIndex >= N_SIZES.length - 1) { recordEye(N_SIZES[sizeIndex]); return; }
              sizeIndex++;
              render();
            },
          }, 'Yes — show me smaller', icon('arrow-right', { size: 18 })),
          h('button.btn.btn--secondary', {
            type: 'button',
            // The last size they could read is the one above this.
            onclick: () => recordEye(sizeIndex === 0 ? null : N_SIZES[sizeIndex - 1]),
          }, 'No — that is too small')),

        h('p.stage__hint', { style: { opacity: '0.75' } }, `Eye ${eyeIndex + 1} of 2`));
    }

    function recordEye(smallestN) {
      perEye.push({ eye: EYES[eyeIndex], smallestN, distanceMm: NEAR_STANDARD_DISTANCE_MM });
      sizeIndex = 0;
      eyeIndex++;
      if (eyeIndex >= EYES.length) finish();
      else { render(); announce(`Now the ${EYES[eyeIndex]} eye`); }
    }

    function finish() {
      const ageBand = store.get().profile.ageBand;
      const expected = AGE_ADD.find(([b]) => b === ageBand)?.[1] ?? null;
      const worst = perEye.reduce((w, e) =>
        e.smallestN == null ? w : Math.max(w, e.smallestN), 0);

      onComplete({
        testId: 'near',
        eye: 'each',
        perEye,
        ageBand: ageBand || null,
        typicalAddForAge: expected,
        summary: perEye.every((e) => e.smallestN == null)
          ? 'Could not read the largest size'
          : perEye.map((e) => `${e.eye} N${e.smallestN ?? '—'}`).join(' · '),
        detail:
          perEye.map((e) => e.smallestN == null
            ? `${e.eye}: could not read even N48`
            : `${e.eye}: smallest comfortable N${e.smallestN}`).join(' · ') +
          (expected
            ? ` · People in the ${ageBand} band typically need a reading add of about ` +
              `${expected}. That is the population curve for your age, NOT your prescription — ` +
              'only a refraction can give you that.'
            : '') +
          (worst >= 10
            ? ' · Needing print this large at 40 cm is worth mentioning to an optometrist.'
            : ''),
      });
    }

    render();
    return { el: host, destroy() { disposed = true; } };
  },
};
