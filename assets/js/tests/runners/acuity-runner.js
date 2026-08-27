/**
 * Fovea — visual acuity, by Landolt ring.
 *
 * WHY A RING AND NOT LETTERS
 * A Landolt ring is pure geometry defined by ISO 8596: outer diameter 5 units,
 * stroke 1 unit, gap 1 unit, gap presented in one of 8 orientations. That gives
 * four things at once that a letter chart cannot:
 *   - no font to license, and no font-loading failure mode on the one thing
 *     that must be pixel-exact
 *   - language independence — nothing to read
 *   - nothing to memorise between runs
 *   - proper psychophysics: 8-alternative forced choice has a 12.5% guess rate,
 *     against ~50% for "can you see it? yes/no". Asking someone whether they
 *     can see something measures their willingness to say yes as much as their
 *     vision; asking WHICH WAY the gap points does not.
 *
 * THE STAIRCASE
 * 1-up / 3-down on a 0.1 logMAR ladder — the same step as a real chart line.
 * Three correct in a row to go smaller, one wrong to go bigger, which converges
 * near 79% correct. Threshold is the mean of the last four reversals.
 *
 * THE REFUSAL
 * The test will not render an optotype whose stroke lands on under ~1.5
 * physical pixels. At that point the screen is drawing its own anti-aliasing
 * and any acuity reported is a property of the display, not the eye. Instead
 * of quietly reporting a flattering number, it stops and says how far back to
 * move. This is the single biggest reason to trust this over most home tests.
 */

import { h, icon, fitCanvas } from '../../core/dom.js';
import { announce } from '../../core/a11y.js';
import { store } from '../../core/store.js';
import {
  optotypeHeightPx, finestRenderableMar, requiredDistanceMm,
  formatAcuity, marToLogMar, logMarToMar, LOGMAR_LINES,
} from '../../core/calibration.js';

/** The 8 ISO 8596 gap orientations, clockwise from right. */
const ORIENTATIONS = [
  { deg: 0, label: 'Right', key: 'ArrowRight' },
  { deg: 45, label: 'Down-right', key: null },
  { deg: 90, label: 'Down', key: 'ArrowDown' },
  { deg: 135, label: 'Down-left', key: null },
  { deg: 180, label: 'Left', key: 'ArrowLeft' },
  { deg: 225, label: 'Up-left', key: null },
  { deg: 270, label: 'Up', key: 'ArrowUp' },
  { deg: 315, label: 'Up-right', key: null },
];

const START_LOGMAR = 0.7;   // 6/30 — comfortably visible for almost everyone
const MAX_TRIALS = 34;
const REVERSALS_TO_END = 6;
const REVERSALS_TO_AVERAGE = 4;

export const runner = {
  id: 'acuity',
  testMode: 'white',

  create({ onComplete }) {
    const cal = store.get().calibration;
    const EYES = ['right', 'left'];

    let eyeIndex = 0;
    let perEye = [];
    let disposed = false;

    const host = h('div.stage');

    /* ------------------------------------------------- feasibility gate */

    const finest = finestRenderableMar(cal);
    const finestLogMar = marToLogMar(finest);

    if (!cal.pxPerMm || !cal.viewingDistanceMm) {
      host.append(needsSetup());
      return { el: host, destroy() {} };
    }

    /* ------------------------------------------------------ the staircase */

    let logMar;
    let correctRun;
    let reversals;
    let lastDirection;
    let trial;
    let history;

    function resetStaircase() {
      logMar = START_LOGMAR;
      correctRun = 0;
      reversals = [];
      lastDirection = null;
      trial = 0;
      history = [];
    }

    let currentOrientation = 0;
    const canvas = h('canvas', { role: 'img' });

    function drawRing() {
      const mar = logMarToMar(logMar);
      const outer = optotypeHeightPx(mar, cal);
      const pad = Math.max(40, outer * 0.6);
      const size = Math.ceil(outer + pad * 2);
      const ctx = fitCanvas(canvas, size, { alpha: false });

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // ISO 8596 construction: outer radius 2.5u, inner radius 1.5u, gap 1u.
      const unit = outer / 5;
      const rOuter = 2.5 * unit;
      const rInner = 1.5 * unit;
      const cx = size / 2;
      const cy = size / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((currentOrientation * Math.PI) / 180);

      // Annulus with a 1-unit radial slot on the right, drawn as a filled ring
      // minus a rectangular gap so the gap edges stay exactly parallel.
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, rOuter, 0, Math.PI * 2);
      ctx.arc(0, 0, rInner, 0, Math.PI * 2, true);
      ctx.fill('evenodd');

      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
      ctx.fillRect(rInner - 1, -unit / 2, rOuter - rInner + 2, unit);
      ctx.restore();

      canvas.setAttribute('aria-label',
        'A ring with a gap in it. This test measures how fine a gap you can ' +
        'locate and has no non-visual equivalent.');
    }

    /* ----------------------------------------------------------- trials */

    function nextTrial() {
      if (disposed) return;

      // Never present something the screen cannot draw.
      if (logMar < finestLogMar) {
        logMar = finestLogMar;
      }

      currentOrientation = ORIENTATIONS[(Math.random() * ORIENTATIONS.length) | 0].deg;
      trial++;
      render();
      drawRing();
      announce(`Trial ${trial}`);
    }

    function answer(deg) {
      if (disposed) return;
      const correct = deg === currentOrientation;
      history.push({ logMar, shown: currentOrientation, given: deg, correct });

      let direction = null;
      if (correct) {
        correctRun++;
        if (correctRun >= 3) {
          correctRun = 0;
          direction = 'down';           // harder
          logMar -= 0.1;
        }
      } else {
        correctRun = 0;
        direction = 'up';               // easier
        logMar += 0.1;
      }

      if (direction && lastDirection && direction !== lastDirection) {
        reversals.push(logMar);
      }
      if (direction) lastDirection = direction;

      logMar = Math.min(1.0, Math.max(finestLogMar, logMar));

      const hitFloor = logMar <= finestLogMar && reversals.length >= 2;
      if (reversals.length >= REVERSALS_TO_END || trial >= MAX_TRIALS || hitFloor) {
        finishEye(hitFloor);
        return;
      }
      nextTrial();
    }

    function finishEye(hitFloor) {
      const used = reversals.slice(-REVERSALS_TO_AVERAGE);
      const threshold = used.length
        ? used.reduce((s, v) => s + v, 0) / used.length
        : logMar;

      perEye.push({
        eye: EYES[eyeIndex],
        logMar: Math.round(threshold * 100) / 100,
        mar: logMarToMar(threshold),
        snellen: formatAcuity(logMarToMar(threshold)),
        snellen20: formatAcuity(logMarToMar(threshold), 'imperial'),
        trials: trial,
        reversals: reversals.length,
        limitedByScreen: hitFloor,
        history,
      });

      eyeIndex++;
      if (eyeIndex >= EYES.length) { finishAll(); return; }
      resetStaircase();
      renderEyeSwitch();
    }

    function finishAll() {
      const right = perEye.find((e) => e.eye === 'right');
      const left = perEye.find((e) => e.eye === 'left');
      const diff = Math.abs(right.logMar - left.logMar);

      onComplete({
        testId: 'acuity',
        eye: 'each',
        perEye,
        // A two-line difference between eyes is arguably the most clinically
        // useful thing this whole app can surface, and it is exactly what
        // binocular self-testing hides.
        interocularDifferenceLogMar: Math.round(diff * 100) / 100,
        interocularFlag: diff >= 0.2,
        limitedByScreen: perEye.some((e) => e.limitedByScreen),
        summary: `Right ${right.snellen} · Left ${left.snellen}`,
        detail:
          `right ${right.snellen} (logMAR ${right.logMar.toFixed(2)}) · ` +
          `left ${left.snellen} (logMAR ${left.logMar.toFixed(2)})` +
          (diff >= 0.2 ? ` · ${diff.toFixed(1)} logMAR between eyes — worth mentioning` : '') +
          (perEye.some((e) => e.limitedByScreen)
            ? ' · reached this screen’s rendering limit, so true acuity may be better'
            : ''),
      });
    }

    /* ------------------------------------------------------------ views */

    function needsSetup() {
      return h('div.stack',
        h('h1', { style: { color: 'var(--test-fg)' } }, 'Set your screen up first'),
        h('p.stage__hint',
          'Acuity is an angle, not a pixel count. Without knowing how large your ' +
          'pixels are and how far away you are sitting, any number here would be ' +
          'meaningless — so this check will not run until both are set.'),
        h('div.row.row--center',
          h('a.btn.btn--primary', { href: '#/calibrate' }, 'Set up my screen'),
          h('a.btn.btn--ghost', { href: '#/tests' }, 'Back')));
    }

    function renderEyeSwitch() {
      const eye = EYES[eyeIndex];
      host.replaceChildren(
        h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' }, icon('x', { size: 16 }), 'Stop'),
        h('p.stage__prompt', `Now cover your ${eye === 'right' ? 'LEFT' : 'RIGHT'} eye`),
        h('p.stage__hint',
          'Cup your hand over it — do not press. Keep both eyes open behind your hand, ' +
          'and keep your glasses on if you wear them. Give the uncovered eye a few ' +
          'seconds to settle.'),
        h('button.btn.btn--primary.btn--lg', {
          type: 'button',
          onclick: () => { nextTrial(); },
        }, `Ready — test my ${eye} eye`, icon('arrow-right', { size: 18 })));
      announce(`Cover your ${eye === 'right' ? 'left' : 'right'} eye`);
    }

    function render() {
      const eye = EYES[eyeIndex];
      host.replaceChildren(
        h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' }, icon('x', { size: 16 }), 'Stop'),
        h('p.stage__prompt', 'Which way does the gap point?'),
        h('p.stage__hint',
          'Guess if you are not sure — guessing is part of how this works, and the ' +
          'test expects it.'),
        h('div.optotype-field', canvas),
        directionPad(),
        h('div.stage__progress',
          h('p.stage__hint',
            `${eye} eye · trial ${trial} · currently at ${formatAcuity(logMarToMar(logMar))}`)));
    }

    /**
     * Eight buttons laid out as a compass, so the control mirrors the answer
     * rather than making the user translate "up-left" into a list position.
     */
    function directionPad() {
      const cell = (deg) => {
        if (deg === null) return h('div');
        const o = ORIENTATIONS.find((x) => x.deg === deg);
        return h('button.chip', {
          type: 'button',
          'aria-label': `Gap points ${o.label.toLowerCase()}`,
          style: { minWidth: '56px', minHeight: '56px', fontSize: 'var(--text-lg)' },
          onclick: () => answer(deg),
        }, arrowFor(deg));
      };

      return h('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(3, auto)',
          gap: 'var(--space-2)',
          justifyContent: 'center',
        },
      },
        cell(225), cell(270), cell(315),
        cell(180), h('div', {
          style: {
            display: 'grid', placeItems: 'center',
            fontSize: 'var(--text-xs)', color: 'var(--test-fg-2)',
          },
        }, 'gap'), cell(0),
        cell(135), cell(90), cell(45));
    }

    const ARROWS = { 0: '→', 45: '↘', 90: '↓', 135: '↙', 180: '←', 225: '↖', 270: '↑', 315: '↗' };
    const arrowFor = (deg) => ARROWS[deg];

    /* ---------------------------------------------------------- keyboard */

    function onKey(e) {
      const map = {
        ArrowRight: 0, ArrowDown: 90, ArrowLeft: 180, ArrowUp: 270,
        '6': 0, '3': 45, '2': 90, '1': 135, '4': 180, '7': 225, '8': 270, '9': 315,
      };
      const deg = map[e.key];
      if (deg === undefined) return;
      e.preventDefault();
      if (host.querySelector('.optotype-field')) answer(deg);
    }
    document.addEventListener('keydown', onKey);

    /* ------------------------------------------------------------- start */

    resetStaircase();

    // Open with the honest statement of what this screen can and cannot show.
    const canReach66 = finest <= 1.0;
    host.append(
      h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' }, icon('x', { size: 16 }), 'Stop'),
      h('p.stage__prompt', 'Before we start'),
      h('div.card', {
        style: {
          maxWidth: '34rem', textAlign: 'left',
          background: 'var(--test-panel)', borderColor: 'var(--test-border)',
          color: 'var(--test-fg)',
        },
      },
        h('p', { style: { marginBottom: 'var(--space-3)' } },
          `At ${(cal.viewingDistanceMm / 10).toFixed(0)} cm from this screen, the finest ` +
          `detail it can physically draw is ${formatAcuity(finest)}.`),
        canReach66
          ? h('p', { style: { color: 'var(--test-fg-2)' } },
              'That is fine enough for a full measurement down to 6/6 and beyond.')
          : h('p', { style: { color: 'var(--test-fg-2)' } },
              `That is not fine enough to measure 6/6. To do that you would need to be about ` +
              `${(requiredDistanceMm(1.0, cal.pxPerMm) / 1000).toFixed(1)} m away. You can ` +
              `continue — the result will simply stop at ${formatAcuity(finest)} and say so, ` +
              `rather than reporting a number this screen cannot draw.`)),
      h('p.stage__hint',
        'Keep your glasses or contacts on if you normally wear them. Right eye first.'),
      h('button.btn.btn--primary.btn--lg', {
        type: 'button',
        onclick: renderEyeSwitch,
      }, 'Continue', icon('arrow-right', { size: 18 })));

    return {
      el: host,
      destroy() {
        disposed = true;
        document.removeEventListener('keydown', onKey);
      },
    };
  },
};
