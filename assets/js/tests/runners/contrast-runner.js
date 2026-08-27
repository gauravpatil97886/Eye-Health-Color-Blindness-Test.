/**
 * Fovea — letter contrast sensitivity.
 *
 * THE 8-BIT PROBLEM, AND WHY MOST WEB VERSIONS OF THIS ARE BROKEN
 *
 * Peak human contrast sensitivity is around log CS 2.3-2.7, i.e. thresholds of
 * 0.2-0.5% contrast. On a plain 8-bit canvas at mid-grey the smallest step you
 * can draw is one code value, which on a gamma-2.2 display is about 1.7%
 * contrast — log CS 1.76. That is BELOW normal peak sensitivity, so on an
 * undithered canvas every observer with normal vision hits the floor and the
 * test reports "normal" no matter what their eyes do. It measures the display.
 *
 * The fix is noisy-bit dithering (Allard & Faubert): add uniform noise of half
 * a code value before rounding, so the quantisation error becomes zero-mean
 * independent noise instead of a deterministic staircase, and the SPATIAL
 * AVERAGE lands on the true intended value. The eye integrates over the letter,
 * so it sees the intended contrast even though no single pixel carries it.
 *
 * We still report the achievable floor honestly, because dithering buys
 * roughly 2-3 extra bits, not infinity.
 */

import { h, icon, fitCanvas } from '../../core/dom.js';
import { announce } from '../../core/a11y.js';
import { srgbToLinear, linearToSrgb } from '../../color/convert.js';

/** Background sits mid-grey so contrast can go both ways and adaptation is stable. */
const BG_SRGB = 0.5;
const BG_LINEAR = srgbToLinear(BG_SRGB);

const START_LOG_CS = 0.4;      // ~40% contrast: trivially visible
const MAX_TRIALS = 30;
const REVERSALS_TO_END = 6;
const REVERSALS_TO_AVERAGE = 4;

export const runner = {
  id: 'contrast',
  testMode: 'neutral',

  create({ onComplete }) {
    const EYES = ['right', 'left'];
    let eyeIndex = 0;
    const perEye = [];
    let disposed = false;

    let logCS;
    let correctRun;
    let reversals;
    let lastDirection;
    let trial;
    let target;

    const canvas = h('canvas', { role: 'img' });
    const host = h('div.stage');

    /** Smallest Weber contrast this display can carry, with dithering. */
    const floorLogCS = computeFloor();

    function computeFloor() {
      // One code value at mid-grey, divided by the ~6x effective resolution
      // dithering buys through spatial averaging over a letter-sized area.
      const step = 1 / 255;
      const lHi = srgbToLinear(BG_SRGB + step);
      const weberOneStep = (lHi - BG_LINEAR) / BG_LINEAR;
      return Math.log10(1 / (weberOneStep / 6));
    }

    function reset() {
      logCS = START_LOG_CS;
      correctRun = 0;
      reversals = [];
      lastDirection = null;
      trial = 0;
    }

    /**
     * Draw a digit at a precise Weber contrast, dithered.
     * Coverage comes from an offscreen render so anti-aliased edges keep their
     * fractional alpha, and each pixel's final code value is computed in linear
     * light and then noise-dithered on the way back to 8-bit.
     */
    function drawDigit(digit, weber) {
      const size = Math.round(Math.min(window.innerWidth * 0.5, 260));
      const ctx = fitCanvas(canvas, size, { alpha: false });
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const px = Math.round(size * dpr);

      // 1. coverage mask
      const mask = document.createElement('canvas');
      mask.width = mask.height = px;
      const mctx = mask.getContext('2d', { willReadFrequently: true });
      mctx.fillStyle = '#000';
      mctx.fillRect(0, 0, px, px);
      mctx.fillStyle = '#fff';
      mctx.font = `700 ${Math.round(px * 0.62)}px "JetBrains Mono", ui-monospace, monospace`;
      mctx.textAlign = 'center';
      mctx.textBaseline = 'middle';
      mctx.fillText(String(digit), px / 2, px / 2);
      const cov = mctx.getImageData(0, 0, px, px).data;

      // 2. composite in linear light, dither on the way out
      const out = ctx.createImageData(px, px);
      const d = out.data;
      const targetLinear = BG_LINEAR * (1 + weber);   // Weber contrast, signed

      for (let i = 0; i < d.length; i += 4) {
        const a = cov[i] / 255;                        // 0 = background, 1 = ink
        const lin = BG_LINEAR + a * (targetLinear - BG_LINEAR);
        const srgb = linearToSrgb(lin) * 255;
        // Noisy-bit: uniform +/- half a code value before rounding.
        const dithered = Math.round(srgb + (Math.random() - 0.5));
        const v = dithered < 0 ? 0 : dithered > 255 ? 255 : dithered;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }

      ctx.putImageData(out, 0, 0);
      canvas.setAttribute('aria-label',
        'A single digit at low contrast against grey. This test has no non-visual equivalent.');
    }

    function nextTrial() {
      if (disposed) return;
      if (logCS > floorLogCS) logCS = floorLogCS;
      trial++;
      target = (Math.random() * 10) | 0;
      drawDigit(target, -(10 ** -logCS));   // darker than background
      render();
      announce(`Trial ${trial}`);
    }

    function answer(value) {
      if (disposed) return;
      const correct = value === target;
      let direction = null;

      if (correct) {
        correctRun++;
        if (correctRun >= 2) {           // 1-up / 2-down, converges near 71%
          correctRun = 0;
          direction = 'harder';
          logCS += 0.1;
        }
      } else {
        correctRun = 0;
        direction = 'easier';
        logCS -= 0.1;
      }

      if (direction && lastDirection && direction !== lastDirection) reversals.push(logCS);
      if (direction) lastDirection = direction;
      logCS = Math.max(0, Math.min(floorLogCS, logCS));

      const atFloor = logCS >= floorLogCS && reversals.length >= 2;
      if (reversals.length >= REVERSALS_TO_END || trial >= MAX_TRIALS || atFloor) {
        finishEye(atFloor);
        return;
      }
      nextTrial();
    }

    function finishEye(atFloor) {
      const used = reversals.slice(-REVERSALS_TO_AVERAGE);
      const threshold = used.length ? used.reduce((s, v) => s + v, 0) / used.length : logCS;
      perEye.push({
        eye: EYES[eyeIndex],
        logCS: Math.round(threshold * 100) / 100,
        weberThreshold: 10 ** -threshold,
        limitedByScreen: atFloor,
        trials: trial,
      });
      eyeIndex++;
      if (eyeIndex >= EYES.length) { finishAll(); return; }
      reset();
      renderEyeSwitch();
    }

    function finishAll() {
      onComplete({
        testId: 'contrast',
        eye: 'each',
        perEye,
        displayFloorLogCS: Math.round(floorLogCS * 100) / 100,
        summary: perEye.map((e) => `${e.eye} log CS ${e.logCS.toFixed(2)}`).join(' · '),
        detail:
          perEye.map((e) =>
            `${e.eye}: log CS ${e.logCS.toFixed(2)} ` +
            `(threshold ${(e.weberThreshold * 100).toFixed(1)}% contrast)` +
            (e.limitedByScreen ? ' — reached this display’s floor' : '')).join(' · ') +
          ` · This display can carry about log CS ${floorLogCS.toFixed(2)} with dithering. ` +
          'Screen brightness, room lighting and panel type all shift this number, so compare ' +
          'it only to your own other runs under the same conditions.',
      });
    }

    function renderEyeSwitch() {
      const eye = EYES[eyeIndex];
      host.replaceChildren(
        h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' }, icon('x', { size: 16 }), 'Stop'),
        h('p.stage__prompt', `Now cover your ${eye === 'right' ? 'LEFT' : 'RIGHT'} eye`),
        h('p.stage__hint', 'Give it a few seconds to settle before you continue.'),
        h('button.btn.btn--primary.btn--lg', { type: 'button', onclick: nextTrial },
          `Ready — test my ${eye} eye`, icon('arrow-right', { size: 18 })));
    }

    function render() {
      host.replaceChildren(
        h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' }, icon('x', { size: 16 }), 'Stop'),
        h('p.stage__prompt', 'Which digit is it?'),
        h('p.stage__hint', 'It gets fainter as you go. Guess when you cannot tell — the test expects it.'),
        canvas,
        h('div.chip-group', { style: { justifyContent: 'center' } },
          ['0','1','2','3','4','5','6','7','8','9'].map((dch) =>
            h('button.chip', { type: 'button', onclick: () => answer(Number(dch)) }, dch))),
        h('div.stage__progress',
          h('p.stage__hint',
            `${EYES[eyeIndex]} eye · trial ${trial} · log CS ${logCS.toFixed(2)}`)));
    }

    function onKey(e) {
      if (!/^[0-9]$/.test(e.key)) return;
      if (!host.querySelector('canvas')) return;
      e.preventDefault();
      answer(Number(e.key));
    }
    document.addEventListener('keydown', onKey);

    reset();
    host.append(
      h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' }, icon('x', { size: 16 }), 'Stop'),
      h('p.stage__prompt', 'Contrast sensitivity'),
      h('div.card', {
        style: {
          maxWidth: '34rem', textAlign: 'left',
          background: 'var(--test-panel)', borderColor: 'var(--test-border)', color: 'var(--test-fg)',
        },
      },
        h('p', { style: { marginBottom: 'var(--space-3)' } },
          'Digits will appear against grey, getting fainter each time. Contrast loss often ' +
          'shows up before sharpness does, which is what makes this worth measuring.'),
        h('p', { style: { color: 'var(--test-fg-2)' } },
          `An 8-bit screen cannot draw contrasts as low as a healthy eye can detect, so these ` +
          `digits are dithered — noise is added below the visible level so the average lands ` +
          `on the intended contrast. Even so this display floors at about log CS ` +
          `${floorLogCS.toFixed(2)}, and the result will say if you reach it.`)),
      h('p.stage__hint', 'Turn your screen brightness up. Right eye first.'),
      h('button.btn.btn--primary.btn--lg', { type: 'button', onclick: renderEyeSwitch },
        'Continue', icon('arrow-right', { size: 18 })));

    return {
      el: host,
      destroy() { disposed = true; document.removeEventListener('keydown', onKey); },
    };
  },
};
