/**
 * Fovea — astigmatism dial (a "sunburst" or clock dial).
 *
 * An astigmatic eye focuses one meridian more sharply than the one at right
 * angles to it, so lines running along the sharply-focused meridian look darker
 * and crisper than the rest. Every line on the dial is physically identical, so
 * any difference the viewer reports comes from their own optics.
 *
 * This is one of the few checks where a yes/no question is genuinely the right
 * psychophysics: "do any lines look darker?" is exactly the judgement being
 * made, and there is no meaningful guess rate to correct for.
 *
 * NOTE the dial convention: a line at clock position n corresponds to an axis
 * of n x 30 degrees, and the eye's astigmatic axis is at RIGHT ANGLES to the
 * meridian that appears sharpest. We report the axis, not the line.
 */

import { h, icon, fitCanvas } from '../../core/dom.js';
import { announce } from '../../core/a11y.js';

const SPOKES = 12;         // every 30 degrees, the standard clock dial
const EYES = ['right', 'left'];

export const runner = {
  id: 'astigmatism',
  testMode: 'white',

  create({ onComplete }) {
    const perEye = [];
    let eyeIndex = 0;
    let selected = new Set();
    let disposed = false;

    const canvas = h('canvas', { role: 'img', style: { cursor: 'pointer', touchAction: 'manipulation' } });
    const host = h('div.stage');

    const dialSize = () =>
      Math.round(Math.min(window.innerWidth * 0.8, window.innerHeight * 0.5, 420));

    function draw() {
      const size = dialSize();
      const ctx = fitCanvas(canvas, size, { alpha: false });
      const r = size / 2;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.save();
      ctx.translate(r, r);

      for (let i = 0; i < SPOKES; i++) {
        // Spokes are drawn as opposing pairs, so 12 spokes cover 180 degrees of
        // meridian in 15-degree steps of drawn line.
        const angle = (i * Math.PI) / SPOKES;
        const highlighted = selected.has(i);
        ctx.strokeStyle = highlighted ? '#c0392b' : '#000000';
        ctx.lineWidth = highlighted ? size / 90 : size / 150;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * r * 0.22, Math.sin(angle) * r * 0.22);
        ctx.lineTo(Math.cos(angle) * r * 0.94, Math.sin(angle) * r * 0.94);
        ctx.moveTo(-Math.cos(angle) * r * 0.22, -Math.sin(angle) * r * 0.22);
        ctx.lineTo(-Math.cos(angle) * r * 0.94, -Math.sin(angle) * r * 0.94);
        ctx.stroke();
      }

      // Central fixation ring.
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = size / 200;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      canvas.setAttribute('aria-label',
        `A dial of ${SPOKES} evenly spaced lines radiating from a central ring, ` +
        `for the ${EYES[eyeIndex]} eye. All lines are drawn identically.`);
    }

    /** Map a click to the nearest spoke. */
    function pick(e) {
      const rect = canvas.getBoundingClientRect();
      const dx = e.clientX - rect.left - rect.width / 2;
      const dy = e.clientY - rect.top - rect.height / 2;
      if (Math.hypot(dx, dy) < rect.width * 0.1) return;
      let a = Math.atan2(dy, dx);
      if (a < 0) a += Math.PI;                       // fold to 0..pi
      const idx = Math.round((a * SPOKES) / Math.PI) % SPOKES;
      selected.has(idx) ? selected.delete(idx) : selected.add(idx);
      draw();
    }

    function renderStep() {
      const eye = EYES[eyeIndex];
      host.replaceChildren(
        h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' }, icon('x', { size: 16 }), 'Stop'),
        h('p.stage__prompt',
          `Cover your ${eye === 'right' ? 'LEFT' : 'RIGHT'} eye and look at the centre.`),
        h('p.stage__hint',
          'Keep your glasses or contacts on if you normally wear them, and sit at your ' +
          'usual distance. Every line here is drawn exactly the same.'),
        canvas,
        h('p.stage__hint',
          'Do some lines look darker, sharper or blacker than the others? Tap those lines. ' +
          'If they all look the same, that is the common answer — just continue.'),
        h('div.row.row--center',
          h('button.btn.btn--secondary', {
            type: 'button', onclick: () => { selected.clear(); draw(); },
          }, 'All look the same'),
          h('button.btn.btn--primary', {
            type: 'button',
            onclick: () => {
              perEye.push({ eye, spokes: [...selected], axisDeg: axisFrom(selected) });
              selected = new Set();
              eyeIndex++;
              if (eyeIndex >= EYES.length) finish();
              else { renderStep(); announce(`Now the ${EYES[eyeIndex]} eye`); }
            },
          }, eyeIndex === 0 ? 'Next — other eye' : 'Finish', icon('arrow-right', { size: 18 }))),
        h('p.stage__hint', { style: { opacity: '0.75' } }, `Eye ${eyeIndex + 1} of 2`));
      draw();
    }

    /**
     * The sharpest-looking meridian; the corrective cylinder axis lies 90
     * degrees away from it. Returns null when nothing was marked.
     */
    function axisFrom(set) {
      if (set.size === 0) return null;
      // Circular mean over a 180-degree space: double the angles, average, halve.
      let sx = 0;
      let sy = 0;
      for (const i of set) {
        const a = (i * Math.PI) / SPOKES;
        sx += Math.cos(2 * a);
        sy += Math.sin(2 * a);
      }
      let mean = Math.atan2(sy, sx) / 2;
      if (mean < 0) mean += Math.PI;
      const meridian = Math.round((mean * 180) / Math.PI);
      return { sharpestMeridianDeg: meridian, cylinderAxisDeg: (meridian + 90) % 180 };
    }

    function finish() {
      const flagged = perEye.filter((e) => e.spokes.length > 0);
      onComplete({
        testId: 'astigmatism',
        eye: flagged.length === 2 ? 'both' : flagged[0]?.eye ?? 'both',
        perEye,
        present: flagged.length > 0 ? 'possible' : 'not-indicated',
        summary: flagged.length === 0
          ? 'All lines looked equal'
          : `Uneven lines — ${flagged.map((e) => e.eye).join(' and ')} eye`,
        detail: flagged.length === 0
          ? 'No orientation stood out in either eye'
          : flagged.map((e) =>
              `${e.eye}: sharpest near ${e.axisDeg.sharpestMeridianDeg}° ` +
              `(would suggest an axis near ${e.axisDeg.cylinderAxisDeg}°)`).join(' · '),
      });
    }

    canvas.addEventListener('click', pick);
    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { if (!disposed) draw(); }, 150);
    };
    window.addEventListener('resize', onResize);

    renderStep();

    return {
      el: host,
      destroy() {
        disposed = true;
        clearTimeout(resizeTimer);
        window.removeEventListener('resize', onResize);
      },
    };
  },
};
