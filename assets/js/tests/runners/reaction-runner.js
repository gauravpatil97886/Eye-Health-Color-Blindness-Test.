/**
 * Fovea — visual reaction time.
 *
 * Measures the interval between a stimulus appearing and the user responding,
 * over several trials.
 *
 * TWO HONEST CAVEATS, both surfaced in the result rather than buried:
 *
 * 1. A browser reaction time carries a constant positive offset of roughly
 *    10-80 ms from display latency, input polling and event dispatch. That
 *    offset is unknown and unmeasurable from inside the page, so the absolute
 *    number should never be compared against published norms. Comparing your
 *    own runs to each other is fine — the offset cancels.
 * 2. This measures eye AND brain AND hand AND hardware. It is not a vision
 *    test, and we say so.
 *
 * Anticipations (responses under 100 ms) are discarded rather than scored: they
 * are guesses that happened to land, and including them flatters the result.
 */

import { h, icon } from '../../core/dom.js';
import { announce } from '../../core/a11y.js';

const TRIALS = 7;
const MIN_WAIT = 1400;
const MAX_WAIT = 4200;
const ANTICIPATION_MS = 100;

export const runner = {
  id: 'reaction',
  testMode: 'dark',

  create({ onComplete }) {
    /** @type {number[]} */
    const times = [];
    let falseStarts = 0;
    let trial = 0;
    let state = 'idle';        // idle | waiting | go | result
    let shownAt = 0;
    let timer = null;
    let disposed = false;

    const target = h('button', {
      type: 'button',
      style: {
        width: 'min(78vw, 30rem)',
        height: 'min(42vh, 20rem)',
        borderRadius: 'var(--radius-xl)',
        border: '2px solid var(--test-border)',
        background: 'var(--test-panel)',
        color: 'var(--test-fg)',
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--text-xl)',
        fontWeight: 'var(--weight-semibold)',
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-6)',
      },
    }, 'Tap or press Space to begin');

    const readout = h('p.stage__hint');
    const host = h('div.stage',
      h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' }, icon('x', { size: 16 }), 'Stop'),
      h('p.stage__prompt', 'React as soon as the panel changes'),
      h('p.stage__hint',
        'Wait for it. Responding before it changes voids that go — anticipating is not reacting.'),
      target,
      readout);

    function setPanel(bg, fg, text) {
      target.style.background = bg;
      target.style.color = fg;
      target.textContent = text;
    }

    function updateReadout() {
      const valid = times.length;
      readout.textContent = `${valid} of ${TRIALS} recorded` +
        (falseStarts ? ` · ${falseStarts} false start${falseStarts === 1 ? '' : 's'}` : '');
    }

    function armTrial() {
      state = 'waiting';
      setPanel('var(--test-panel)', 'var(--test-fg)', 'Wait…');
      const wait = MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT);
      timer = setTimeout(() => {
        if (disposed) return;
        state = 'go';
        shownAt = performance.now();
        setPanel('#e8e8e8', '#111', 'NOW');
      }, wait);
    }

    function respond() {
      if (disposed) return;

      if (state === 'idle' || state === 'result') { trial++; armTrial(); return; }

      if (state === 'waiting') {
        clearTimeout(timer);
        falseStarts++;
        state = 'result';
        setPanel('var(--test-panel)', 'var(--test-fg)', 'Too early — that one does not count. Tap to try again.');
        announce('Too early');
        updateReadout();
        return;
      }

      if (state === 'go') {
        const ms = Math.round(performance.now() - shownAt);
        state = 'result';
        if (ms < ANTICIPATION_MS) {
          falseStarts++;
          setPanel('var(--test-panel)', 'var(--test-fg)',
            `${ms} ms — too fast to be a real reaction. Discarded. Tap to continue.`);
        } else {
          times.push(ms);
          setPanel('var(--test-panel)', 'var(--test-fg)',
            times.length >= TRIALS ? `${ms} ms — done. Tap for your result.` : `${ms} ms — tap to continue`);
          announce(`${ms} milliseconds`);
        }
        updateReadout();

        if (times.length >= TRIALS) state = 'complete';
      }
    }

    function onClick() {
      if (state === 'complete') { finish(); return; }
      respond();
    }

    function onKey(e) {
      if (e.code !== 'Space' && e.key !== ' ') return;
      e.preventDefault();
      onClick();
    }

    function finish() {
      const sorted = [...times].sort((a, b) => a - b);
      const median = sorted.length % 2
        ? sorted[(sorted.length - 1) / 2]
        : Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2);
      const best = sorted[0];
      const mean = Math.round(times.reduce((s, v) => s + v, 0) / times.length);
      // Spread matters as much as speed: consistency is the more stable trait.
      const sd = Math.round(Math.sqrt(
        times.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, times.length - 1)
      ));

      onComplete({
        testId: 'reaction',
        eye: 'both',
        trials: times,
        falseStarts,
        median,
        best,
        mean,
        sd,
        summary: `${median} ms (median of ${times.length})`,
        detail: `best ${best} ms · mean ${mean} ms · spread ±${sd} ms · ${falseStarts} false start(s). ` +
                'Includes an unknown display and input delay, so treat the absolute number as ' +
                'comparable only to your own other runs.',
      });
    }

    target.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    updateReadout();

    return {
      el: host,
      destroy() {
        disposed = true;
        clearTimeout(timer);
        document.removeEventListener('keydown', onKey);
      },
    };
  },
};
