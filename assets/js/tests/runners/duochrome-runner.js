/**
 * Fovea — red/green duochrome balance.
 *
 * Chromatic aberration in the eye focuses long wavelengths slightly behind
 * short ones, so red and green halves of a chart come to focus at marginally
 * different planes. If letters look crisper on RED, the eye's focus sits
 * behind the retina for that half (under-minused / over-plussed); crisper on
 * GREEN is the opposite. Equal is what a well-corrected eye reports.
 *
 * THE DETAIL THAT MAKES OR BREAKS IT — LUMINANCE MATCHING
 * The obvious choice of #FF0000 against #00FF00 is wrong: pure green is about
 * 3.4x brighter than pure red, so the observer ends up judging BRIGHTNESS, not
 * focus, and the test measures nothing. The green here is darkened until its
 * relative luminance matches the red almost exactly:
 *
 *     #FF0000  Y = 0.2126
 *     #009400  Y = 0.2118        difference 0.0008
 *
 * Also note this test is meaningfully less reliable for anyone with a red-green
 * colour vision difference, so we check for that and say so.
 */

import { h, icon } from '../../core/dom.js';
import { store } from '../../core/store.js';

const RED = '#ff0000';
const GREEN = '#009400';   // luminance-matched to the red above
const EYES = ['right', 'left'];

export const runner = {
  id: 'duochrome',
  testMode: 'dark',

  create({ onComplete }) {
    let eyeIndex = 0;
    const perEye = [];
    const cvd = findColourResult();
    const host = h('div.stage');

    function panel(bg, side) {
      return h('div', {
        style: {
          flex: '1', background: bg, display: 'grid', placeItems: 'center',
          padding: 'var(--space-8) var(--space-4)', minHeight: 'min(30vh, 14rem)',
        },
      },
        h('div', {
          style: {
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(1.6rem, 5vw, 2.6rem)',
            fontWeight: '700', color: '#000', letterSpacing: '0.12em', lineHeight: '1.5',
            textAlign: 'center',
          },
        }, side === 'left' ? 'O X O\nH V H' : 'V O V\nX H X'));
    }

    function render() {
      const eye = EYES[eyeIndex];
      host.replaceChildren(
        h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' }, icon('x', { size: 16 }), 'Stop'),
        h('p.stage__prompt', `Cover your ${eye === 'right' ? 'LEFT' : 'RIGHT'} eye`),
        h('p.stage__hint',
          'Keep your glasses on. Look at both halves without staring — the two panels are ' +
          'matched for brightness, so judge SHARPNESS only, not which looks bolder.'),

        h('div', {
          style: {
            display: 'flex', width: 'min(92vw, 40rem)',
            borderRadius: 'var(--radius-md)', overflow: 'hidden',
          },
        }, panel(RED, 'left'), panel(GREEN, 'right')),

        h('p.stage__hint', 'Which side looks sharper and clearer?'),

        h('div.chip-group', { style: { justifyContent: 'center' } },
          h('button.chip', {
            type: 'button',
            style: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', minWidth: 'auto' },
            onclick: () => answer('red'),
          }, 'The red side'),
          h('button.chip', {
            type: 'button',
            style: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', minWidth: 'auto' },
            onclick: () => answer('equal'),
          }, 'They look the same'),
          h('button.chip', {
            type: 'button',
            style: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', minWidth: 'auto' },
            onclick: () => answer('green'),
          }, 'The green side')),

        h('p.stage__hint', { style: { opacity: '0.75' } }, `Eye ${eyeIndex + 1} of 2`));
    }

    function answer(side) {
      perEye.push({ eye: EYES[eyeIndex], clearer: side });
      eyeIndex++;
      if (eyeIndex >= EYES.length) finish();
      else render();
    }

    function finish() {
      const reading = (s) => ({
        red: 'focus may sit behind the retina — under-corrected for distance, or over-plussed',
        green: 'focus may sit in front of the retina — over-minused',
        equal: 'balanced, which is what a well-corrected eye reports',
      }[s]);

      onComplete({
        testId: 'duochrome',
        eye: 'each',
        perEye,
        cvdCaveat: cvd?.verdict === 'difference-indicated',
        summary: perEye.map((e) => `${e.eye}: ${e.clearer}`).join(' · '),
        detail:
          perEye.map((e) => `${e.eye}: ${e.clearer} — ${reading(e.clearer)}`).join(' · ') +
          (cvd?.verdict === 'difference-indicated'
            ? ' NOTE: your colour vision check indicated a red-green difference, which makes ' +
              'this result substantially less reliable.'
            : '') +
          ' This hints at the direction of any focusing error; it does not give a power.',
      });
    }

    render();
    return { el: host, destroy() {} };
  },
};

function findColourResult() {
  for (const session of store.get().sessions) {
    const r = session.results.find((x) => x.testId === 'color-plates');
    if (r) return r;
  }
  return null;
}
