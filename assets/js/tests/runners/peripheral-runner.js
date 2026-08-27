/**
 * Fovea — peripheral awareness.
 *
 * How far from your point of focus can something appear and still be noticed?
 *
 * The whole test hinges on the user actually holding fixation, and simply
 * asking them to is not enough — people look. So the centre runs a real task:
 * a digit changes every second or so and must be reported. If they glance away
 * they miss it, and a run with poor central accuracy is reported as unreliable
 * rather than quietly scored.
 *
 * This is emphatically NOT a visual field test. Perimetry uses a bowl, a fixed
 * head, controlled luminance and an eye tracker. This measures a mix of
 * peripheral sensitivity, attention and how honest you were about not looking —
 * which is interesting, and is not a screen for anything.
 */

import { h, icon } from '../../core/dom.js';
import { announce } from '../../core/a11y.js';

const ECCENTRICITIES = [0.18, 0.30, 0.42, 0.54];   // fraction of the field radius
const TRIALS = 20;
const TARGET_MS = 220;

export const runner = {
  id: 'peripheral',
  testMode: 'dark',

  create({ onComplete }) {
    let disposed = false;
    let trial = 0;
    let running = false;
    const results = [];

    let centralDigit = 0;
    let centralShownAt = 0;
    let centralHits = 0;
    let centralMisses = 0;
    let centralTimer = null;
    let targetTimer = null;
    let pendingTarget = null;      // {ring, angle, at}

    const field = h('div', {
      style: {
        position: 'relative',
        width: 'min(88vw, 46rem)',
        height: 'min(58vh, 30rem)',
        background: 'var(--test-panel)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--test-border)',
      },
    });

    const centre = h('div', {
      style: {
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        fontFamily: 'var(--font-mono)',
        fontSize: '2.4rem', fontWeight: '700',
        color: 'var(--test-fg)',
      },
      'aria-live': 'off',
    }, '–');

    const status = h('p.stage__hint');
    const host = h('div.stage');

    function newCentralDigit() {
      centralDigit = 1 + ((Math.random() * 9) | 0);
      centre.textContent = String(centralDigit);
      centralShownAt = performance.now();
    }

    function spawnTarget() {
      if (!running || disposed) return;
      const rect = field.getBoundingClientRect();
      const radius = Math.min(rect.width, rect.height) / 2;
      const ring = ECCENTRICITIES[(Math.random() * ECCENTRICITIES.length) | 0];
      const angle = Math.random() * Math.PI * 2;
      const x = rect.width / 2 + Math.cos(angle) * radius * 2 * ring;
      const y = rect.height / 2 + Math.sin(angle) * radius * 2 * ring;

      const dot = h('div', {
        style: {
          position: 'absolute',
          left: `${x}px`, top: `${y}px`,
          transform: 'translate(-50%, -50%)',
          width: '18px', height: '18px', borderRadius: '50%',
          background: 'var(--test-fg)',
        },
      });

      pendingTarget = { ring, angle, at: performance.now(), seen: false };
      field.append(dot);

      setTimeout(() => {
        dot.remove();
        // Grace period after it disappears, then score it as a miss.
        setTimeout(() => {
          if (pendingTarget && !pendingTarget.seen) {
            results.push({ ring: pendingTarget.ring, seen: false, ms: null });
            pendingTarget = null;
            nextTrial();
          }
        }, 700);
      }, TARGET_MS);
    }

    function nextTrial() {
      if (disposed) return;
      trial++;
      if (trial > TRIALS) { finish(); return; }
      status.textContent = `${trial} of ${TRIALS} · keep your eyes on the number`;
      targetTimer = setTimeout(spawnTarget, 900 + Math.random() * 1800);
    }

    function onSpace(e) {
      if (e.code !== 'Space' && e.key !== ' ') return;
      e.preventDefault();
      if (!running || !pendingTarget || pendingTarget.seen) return;
      pendingTarget.seen = true;
      results.push({
        ring: pendingTarget.ring,
        seen: true,
        ms: Math.round(performance.now() - pendingTarget.at),
      });
      pendingTarget = null;
      nextTrial();
    }

    function onDigit(e) {
      if (!running) return;
      if (!/^[1-9]$/.test(e.key)) return;
      if (Number(e.key) === centralDigit) centralHits++;
      else centralMisses++;
    }

    function start() {
      running = true;
      trial = 0;
      host.replaceChildren(
        h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' }, icon('x', { size: 16 }), 'Stop'),
        h('p.stage__prompt', 'Watch the number. Press Space the instant a dot appears.'),
        h('p.stage__hint',
          'Type each number as it changes — that is how we know you kept looking at the centre. ' +
          'Do not hunt for the dots; let them come to you.'),
        field,
        status);
      field.replaceChildren(centre);
      newCentralDigit();
      centralTimer = setInterval(() => { if (running) newCentralDigit(); }, 1400);
      nextTrial();
      announce('Started');
    }

    function finish() {
      running = false;
      clearInterval(centralTimer);
      clearTimeout(targetTimer);

      const byRing = ECCENTRICITIES.map((ring) => {
        const at = results.filter((r) => r.ring === ring);
        const seen = at.filter((r) => r.seen);
        return {
          ring,
          presented: at.length,
          seen: seen.length,
          rate: at.length ? seen.length / at.length : null,
          meanMs: seen.length
            ? Math.round(seen.reduce((s, r) => s + r.ms, 0) / seen.length)
            : null,
        };
      });

      const overall = results.filter((r) => r.seen).length / Math.max(1, results.length);
      const centralTotal = centralHits + centralMisses;
      const fixationOk = centralTotal > 0 && centralHits / centralTotal >= 0.6;

      onComplete({
        testId: 'peripheral',
        eye: 'both',
        byRing,
        overallDetection: Math.round(overall * 100),
        fixationHeld: fixationOk,
        centralAccuracy: centralTotal ? Math.round((centralHits / centralTotal) * 100) : null,
        summary: `${Math.round(overall * 100)}% noticed`,
        detail:
          byRing.map((r) =>
            `${Math.round(r.ring * 200)}% out: ${r.seen}/${r.presented}` +
            (r.meanMs ? ` (${r.meanMs} ms)` : '')).join(' · ') +
          (fixationOk
            ? ' · fixation held'
            : ' · CENTRAL TASK ACCURACY WAS LOW, so this run probably involved looking around ' +
              'rather than true peripheral detection — treat it as unreliable.') +
          ' This is not a visual field test and cannot screen for field loss.',
      });
    }

    document.addEventListener('keydown', onSpace);
    document.addEventListener('keydown', onDigit);
    field.addEventListener('pointerdown', () => {
      if (running && pendingTarget && !pendingTarget.seen) {
        onSpace({ code: 'Space', preventDefault() {} });
      }
    });

    host.append(
      h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' }, icon('x', { size: 16 }), 'Stop'),
      h('p.stage__prompt', 'Seeing without looking'),
      h('p.stage__hint',
        'A number sits in the middle and changes every second or so — type each one as it ' +
        'appears. Meanwhile dots will flash briefly around the edges. Press Space (or tap) ' +
        'the moment you notice one, without moving your eyes.'),
      h('p.stage__hint', { style: { opacity: '0.8' } },
        'This is a game, not a field test. Perimetry needs a bowl, a fixed head and an eye ' +
        'tracker; this cannot screen for anything.'),
      h('button.btn.btn--primary.btn--lg', { type: 'button', onclick: start },
        'Start', icon('arrow-right', { size: 18 })));

    return {
      el: host,
      destroy() {
        disposed = true;
        running = false;
        clearInterval(centralTimer);
        clearTimeout(targetTimer);
        document.removeEventListener('keydown', onSpace);
        document.removeEventListener('keydown', onDigit);
      },
    };
  },
};
