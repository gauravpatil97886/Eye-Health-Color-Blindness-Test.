/**
 * Fovea — the Stroop test.
 *
 * Colour words printed in mismatched ink. Naming the ink is slower when the
 * word fights it, and the size of that slowdown — the Stroop effect — is the
 * measurement. It is one of the most robust findings in psychology and it is
 * genuinely fun to feel happening.
 *
 * THE THING THAT MAKES THIS TEST DIFFERENT HERE
 * A Stroop test is meaningless for someone who cannot separate the ink colours
 * in the first place. Every implementation on the web ignores this. Fovea has
 * already run a colour vision check, so it looks at that result first and says
 * so plainly rather than handing someone a number built on colours they never
 * saw. Where no colour result exists, it warns rather than assumes.
 *
 * Reported as a DIFFERENCE (incongruent minus congruent), which is the right
 * measure for a browser: both conditions carry the same unknown display and
 * input latency, so the offset cancels out of the subtraction even though it
 * would corrupt either raw number on its own.
 */

import { h, icon } from '../../core/dom.js';
import { announce } from '../../core/a11y.js';
import { store } from '../../core/store.js';

/** Chosen to stay mutually distinguishable and to sit far apart in lightness. */
const INKS = [
  { id: 'red', label: 'Red', hex: '#c0392b' },
  { id: 'green', label: 'Green', hex: '#1e7a3c' },
  { id: 'blue', label: 'Blue', hex: '#1f5fbf' },
  { id: 'yellow', label: 'Yellow', hex: '#b8860b' },
];

const TRIALS = 24;
const CONGRUENT_SHARE = 0.5;

export const runner = {
  id: 'stroop',
  testMode: 'dark',

  create({ onComplete }) {
    const cvd = findColourResult();
    const trials = buildTrials();

    let index = 0;
    let shownAt = 0;
    let disposed = false;
    const responses = [];

    const host = h('div.stage');
    const word = h('div', {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 'var(--weight-bold)',
        fontSize: 'clamp(3rem, 14vw, 6rem)',
        letterSpacing: '-0.02em',
        lineHeight: '1',
        minHeight: '1.1em',
      },
      'aria-live': 'off',
    });

    function buildTrials() {
      const out = [];
      for (let i = 0; i < TRIALS; i++) {
        const ink = INKS[(Math.random() * INKS.length) | 0];
        const congruent = i < TRIALS * CONGRUENT_SHARE;
        let text = ink;
        if (!congruent) {
          do { text = INKS[(Math.random() * INKS.length) | 0]; } while (text.id === ink.id);
        }
        out.push({ ink, text, congruent });
      }
      // Shuffle so congruent and incongruent are interleaved unpredictably.
      for (let i = out.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    }

    function answerPad() {
      return h('div.chip-group', { style: { justifyContent: 'center' } },
        INKS.map((ink) =>
          h('button.chip', {
            type: 'button',
            style: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', minWidth: '84px' },
            onclick: () => respond(ink.id),
          }, ink.label)));
    }

    function showTrial() {
      if (index >= trials.length) { finish(); return; }
      const t = trials[index];
      word.textContent = t.text.label.toUpperCase();
      word.style.color = t.ink.hex;
      word.setAttribute('aria-label', `The word ${t.text.label}, printed in ${t.ink.label} ink`);
      shownAt = performance.now();
    }

    function respond(id) {
      if (disposed || index >= trials.length) return;
      const t = trials[index];
      responses.push({
        congruent: t.congruent,
        correct: id === t.ink.id,
        ms: Math.round(performance.now() - shownAt),
      });
      index++;
      if (index >= trials.length) finish();
      else { render(); showTrial(); }
    }

    function render() {
      host.replaceChildren(
        h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' }, icon('x', { size: 16 }), 'Stop'),
        h('p.stage__prompt', 'Name the COLOUR of the ink — not the word'),
        word,
        answerPad(),
        h('div.stage__progress',
          h('p.stage__hint', `${index + 1} of ${trials.length}`)));
    }

    function finish() {
      const valid = responses.filter((r) => r.correct);
      const con = valid.filter((r) => r.congruent).map((r) => r.ms);
      const inc = valid.filter((r) => !r.congruent).map((r) => r.ms);
      const mean = (a) => (a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : null);
      const conMean = mean(con);
      const incMean = mean(inc);
      const effect = conMean != null && incMean != null ? incMean - conMean : null;
      const accuracy = Math.round((valid.length / responses.length) * 100);

      onComplete({
        testId: 'stroop',
        eye: 'both',
        congruentMs: conMean,
        incongruentMs: incMean,
        stroopEffectMs: effect,
        accuracy,
        colourVisionCaveat: cvd?.verdict === 'difference-indicated' || cvd?.verdict === 'inconclusive',
        summary: effect == null
          ? 'Not enough correct answers to score'
          : `Stroop effect ${effect} ms`,
        detail:
          (effect == null
            ? 'Too few correct responses to compute a difference.'
            : `matching words ${conMean} ms · clashing words ${incMean} ms · ` +
              `difference ${effect} ms · ${accuracy}% correct. The difference is the ` +
              'measurement; the raw times include an unknown display and input delay ' +
              'that cancels out of the subtraction.') +
          (cvd?.verdict === 'difference-indicated'
            ? ' NOTE: your colour vision check indicated a difference, which makes this ' +
              'particular result unreliable — naming ink colours is exactly what it depends on.'
            : ''),
      });
    }

    function start() {
      render();
      showTrial();
      announce('Name the ink colour');
    }

    /* Gate on the colour vision result before doing anything else. */
    if (cvd?.verdict === 'difference-indicated') {
      host.append(
        h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' }, icon('x', { size: 16 }), 'Stop'),
        h('p.stage__prompt', 'This one may not work for you'),
        h('div.card', {
          style: {
            maxWidth: '34rem', textAlign: 'left',
            background: 'var(--test-panel)', borderColor: 'var(--test-border)', color: 'var(--test-fg)',
          },
        },
          h('p', { style: { marginBottom: 'var(--space-3)' } },
            'Your colour vision check indicated a difference. The Stroop test asks you to ' +
            'name ink colours, so it measures colour discrimination as much as attention — ' +
            'and the score would not mean what it is supposed to mean.'),
          h('p', { style: { color: 'var(--test-fg-2)' } },
            'You are welcome to try it anyway; the result will carry this note.')),
        h('div.row.row--center',
          h('button.btn.btn--primary', { type: 'button', onclick: start }, 'Try it anyway'),
          h('a.btn.btn--secondary', { href: '#/tests' }, 'Skip this one')));
    } else {
      host.append(
        h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' }, icon('x', { size: 16 }), 'Stop'),
        h('p.stage__prompt', 'Name the ink colour, ignore the word'),
        h('p.stage__hint',
          'A word like GREEN might be printed in red ink — the answer is red. ' +
          'Go as fast as you can while staying accurate. 24 goes.'),
        !cvd && h('p.stage__hint', { style: { opacity: '0.8' } },
          'You have not taken the colour vision check yet. If you have trouble telling these ' +
          'colours apart, this score will reflect that rather than your attention.'),
        h('button.btn.btn--primary.btn--lg', { type: 'button', onclick: start },
          'Start', icon('arrow-right', { size: 18 })));
    }

    return { el: host, destroy() { disposed = true; } };
  },
};

function findColourResult() {
  for (const session of store.get().sessions) {
    const r = session.results.find((x) => x.testId === 'color-plates');
    if (r) return r;
  }
  return null;
}
