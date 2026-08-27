/**
 * Fovea — colour vision plate runner.
 *
 * Presentation rules that matter for validity:
 *   - the surround is a strict neutral grey, never the app theme
 *   - no timer by default (a timed test fails WCAG 2.2.1, and haste adds noise
 *     without adding information)
 *   - a short neutral gap between plates so an afterimage from one plate cannot
 *     contaminate the next
 *   - "Nothing / can't tell" is offered as an equal, unstigmatised answer —
 *     without it, users guess, and guesses are indistinguishable from vision
 *   - the plate's accessible name deliberately does NOT describe the image,
 *     because describing it would give away the answer
 */

import { h, icon, fitCanvas } from '../../core/dom.js';
import { announce } from '../../core/a11y.js';
import { renderPlate } from '../../plate/generator.js';
import { createPlateSession, recordResponse, scorePlateSession } from '../color-plates.js';

/** Blank neutral interval between plates, in ms. */
const ISI = 260;

export const runner = {
  id: 'color-plates',
  testMode: 'neutral',

  /**
   * @param {object} ctx
   * @param {(result: object) => void} ctx.onComplete
   * @param {object} ctx.options
   * @returns {{ el: Element, destroy(): void }}
   */
  create({ onComplete, options = {} }) {
    const session = createPlateSession({
      count: options.count ?? 24,
      figureKind: options.figureKind ?? 'digits',
    });

    let index = 0;
    let shownAt = performance.now();
    let disposed = false;

    const canvas = h('canvas.plate', { role: 'img' });
    const progressBar = h('div.progress__bar');
    const progressText = h('p.stage__hint');
    const answersHost = h('div.stage__answers');
    const prompt = h('p.stage__prompt');

    const el = h('div.stage',
      h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' },
        icon('x', { size: 16 }), 'Stop'),
      prompt,
      canvas,
      answersHost,
      h('div.stage__progress',
        h('div.progress', { role: 'progressbar', 'aria-label': 'Test progress' }, progressBar),
        progressText));

    function plateSize() {
      const vw = Math.min(window.innerWidth, window.innerHeight * 0.92);
      return Math.round(Math.max(220, Math.min(440, vw * 0.62)));
    }

    function drawCurrent() {
      const plate = session.plates[index];
      const size = plateSize();
      const ctx = fitCanvas(canvas, size, { alpha: false });
      renderPlate(ctx, plate, { size });

      canvas.setAttribute(
        'aria-label',
        `Plate ${index + 1} of ${session.plates.length}: a circle of coloured dots. ` +
        'This image cannot be described without revealing the answer.'
      );

      prompt.textContent = plate.figureKind === 'digits'
        ? 'What number do you see?'
        : 'What shape do you see?';

      progressBar.style.width = `${((index) / session.plates.length) * 100}%`;
      progressText.textContent = `Plate ${index + 1} of ${session.plates.length}`;
      el.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', String(index + 1));
      el.querySelector('[role="progressbar"]').setAttribute('aria-valuemax', String(session.plates.length));
      el.querySelector('[role="progressbar"]').setAttribute('aria-valuetext', `Plate ${index + 1} of ${session.plates.length}`);

      renderAnswers(plate);
      shownAt = performance.now();
      announce(`Plate ${index + 1} of ${session.plates.length}`);
    }

    function renderAnswers(plate) {
      answersHost.replaceChildren(
        plate.figureKind === 'digits' ? digitPad() : shapePad(plate),
        h('button.btn.btn--secondary', {
          type: 'button',
          style: { marginTop: 'var(--space-4)' },
          onclick: () => submit(null),
        }, 'Nothing / can’t tell')
      );
    }

    let typed = '';

    function digitPad() {
      const display = h('div.calibrator__readout', {
        style: {
          minHeight: '2.2rem',
          minWidth: '5rem',
          letterSpacing: '0.15em',
          fontSize: 'var(--text-3xl)',
          padding: '0 var(--space-4)',
          borderBottom: '2px solid currentColor',
          opacity: typed ? '1' : '0.45',
        },
        'aria-live': 'polite',
        'aria-label': 'Your answer',
      }, typed || '––');

      const keys = h('div.chip-group', { style: { justifyContent: 'center' } },
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) =>
          h('button.chip', {
            type: 'button',
            onclick: () => {
              if (typed.length >= 2) typed = '';
              typed += d;
              display.textContent = typed;
              display.style.opacity = '1';
            },
          }, d)),
        h('button.chip', {
          type: 'button', 'aria-label': 'Delete last digit',
          onclick: () => { typed = typed.slice(0, -1); display.textContent = typed || '—'; },
        }, '⌫'));

      return h('div.stack.stack--sm',
        display,
        keys,
        h('button.btn.btn--primary.btn--block', {
          type: 'button',
          style: { marginTop: 'var(--space-3)' },
          onclick: () => typed && submit(typed),
        }, 'Next plate', icon('arrow-right', { size: 18 })));
    }

    function shapePad(plate) {
      const options = ['circle', 'square', 'triangle', 'star', 'heart', 'cross'];
      return h('div.chip-group', { style: { justifyContent: 'center' } },
        options.map((name) =>
          h('button.chip', {
            type: 'button',
            style: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)' },
            onclick: () => submit(name),
          }, name)));
    }

    function submit(answer) {
      if (disposed) return;
      const plate = session.plates[index];
      recordResponse(session, plate.id, answer, Math.round(performance.now() - shownAt));
      typed = '';
      index++;

      if (index >= session.plates.length) {
        finish();
        return;
      }

      // Neutral gap so the previous plate cannot leave an afterimage on the next.
      answersHost.replaceChildren();
      canvas.style.visibility = 'hidden';
      setTimeout(() => {
        if (disposed) return;
        canvas.style.visibility = 'visible';
        drawCurrent();
      }, ISI);
    }

    function finish() {
      const result = scorePlateSession(session);
      onComplete(result);
    }

    function onKey(e) {
      if (disposed) return;
      if (/^[0-9]$/.test(e.key)) {
        if (typed.length >= 2) typed = '';
        typed += e.key;
        const d = answersHost.querySelector('.calibrator__readout');
        if (d) { d.textContent = typed; d.style.opacity = '1'; }
      } else if (e.key === 'Backspace') {
        typed = typed.slice(0, -1);
        const d = answersHost.querySelector('.calibrator__readout');
        if (d) { d.textContent = typed || '––'; d.style.opacity = typed ? '1' : '0.45'; }
      } else if (e.key === 'Enter' && typed) {
        submit(typed);
      }
    }

    let resizeTimer;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { if (!disposed) drawCurrent(); }, 150);
    }

    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    requestAnimationFrame(drawCurrent);

    return {
      el,
      destroy() {
        disposed = true;
        clearTimeout(resizeTimer);
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('resize', onResize);
      },
    };
  },
};
