/**
 * Fovea — central field grid (an Amsler grid).
 *
 * Clinically the most valuable thing on this site, and the cheapest to render:
 * a 10x10 grid of 5mm squares viewed at 33cm subtends roughly 20 degrees, and
 * distortion or gaps in it are how macular disease first announces itself.
 *
 * Two rules make or break it:
 *   - it MUST be monocular. Binocular testing hides a one-eyed defect entirely,
 *     because the good eye fills in what the other is missing. This is the
 *     single most common way home versions of this test are useless.
 *   - the eye must stay on the central dot. The finding is what you notice
 *     WITHOUT looking at it; hunting around the grid defeats the whole thing.
 *
 * The user marks what looks wrong by drawing on the grid, which is far more
 * informative than a yes/no and gives a clinician something to look at.
 */

import { h, icon, fitCanvas } from '../../core/dom.js';
import { announce } from '../../core/a11y.js';
import { store } from '../../core/store.js';

const FINDING_TYPES = [
  { id: 'wavy', label: 'Lines look wavy or bent' },
  { id: 'blurred', label: 'An area looks blurred' },
  { id: 'missing', label: 'An area is missing or dark' },
  { id: 'colour', label: 'An area looks the wrong colour' },
];

export const runner = {
  id: 'amsler',
  testMode: 'white',

  create({ onComplete }) {
    /** @type {{eye:string, marks:{x:number,y:number}[], types:string[], cornersVisible:boolean|null, distortion:boolean|null}[]} */
    const perEye = [];
    let eyeIndex = 0;
    const EYES = ['right', 'left'];

    let marks = [];
    let painting = false;

    const canvas = h('canvas', {
      style: { cursor: 'crosshair', touchAction: 'none', borderRadius: 'var(--radius-sm)' },
      role: 'img',
    });
    const host = h('div.stage');
    let disposed = false;

    function gridSize() {
      return Math.round(Math.min(window.innerWidth * 0.82, window.innerHeight * 0.55, 460));
    }

    function drawGrid() {
      const size = gridSize();
      const ctx = fitCanvas(canvas, size, { alpha: false });
      const cells = 20;
      const step = size / cells;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= cells; i++) {
        const p = Math.round(i * step) + 0.5;
        ctx.moveTo(p, 0); ctx.lineTo(p, size);
        ctx.moveTo(0, p); ctx.lineTo(size, p);
      }
      ctx.stroke();

      // The fixation dot. Everything depends on the eye staying here.
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, Math.max(3, size / 110), 0, Math.PI * 2);
      ctx.fill();

      // The user's marks.
      ctx.fillStyle = 'rgba(200, 40, 20, 0.42)';
      for (const m of marks) {
        ctx.beginPath();
        ctx.arc(m.x * size, m.y * size, size / 26, 0, Math.PI * 2);
        ctx.fill();
      }

      canvas.setAttribute('aria-label',
        `A grid of squares with a dot at the centre, for the ${EYES[eyeIndex]} eye. ` +
        'This test requires looking at the centre dot and noticing distortion in ' +
        'peripheral vision; it cannot be conveyed without sight.');
    }

    function addMark(e) {
      const rect = canvas.getBoundingClientRect();
      marks.push({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      });
      drawGrid();
    }

    function renderStep() {
      const eye = EYES[eyeIndex];
      const selected = new Set();

      const typeChips = h('div.chip-group', { style: { justifyContent: 'center' } },
        FINDING_TYPES.map((t) =>
          h('button.chip', {
            type: 'button',
            'aria-pressed': 'false',
            style: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', minWidth: 'auto' },
            onclick: (e) => {
              const on = e.currentTarget.getAttribute('aria-pressed') === 'true';
              e.currentTarget.setAttribute('aria-pressed', String(!on));
              on ? selected.delete(t.id) : selected.add(t.id);
            },
          }, t.label)));

      host.replaceChildren(
        h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' }, icon('x', { size: 16 }), 'Stop'),

        h('p.stage__prompt',
          `Cover your ${eye === 'right' ? 'LEFT' : 'RIGHT'} eye. Look only at the centre dot.`),
        h('p.stage__hint',
          'Cup your hand over the eye — do not press on it. Keep both eyes open behind your hand. ' +
          'Hold your face about 33 cm (a forearm) from the screen, and wear your reading glasses if you use them.'),

        canvas,

        h('p.stage__hint',
          'Without moving your eyes off the dot: does any part of the grid look wavy, blurred, ' +
          'missing or discoloured? Tap or drag on those areas to mark them.'),

        typeChips,

        h('div.row.row--center',
          h('button.btn.btn--secondary', {
            type: 'button',
            onclick: () => { marks = []; drawGrid(); },
          }, icon('refresh', { size: 16 }), 'Clear marks'),
          h('button.btn.btn--primary', {
            type: 'button',
            onclick: () => {
              perEye.push({
                eye,
                marks: marks.slice(),
                types: [...selected],
                distortionReported: marks.length > 0 || selected.size > 0,
              });
              marks = [];
              eyeIndex++;
              if (eyeIndex >= EYES.length) finish();
              else { renderStep(); announce(`Now the ${EYES[eyeIndex]} eye`); }
            },
          }, eyeIndex === 0 ? 'Next — other eye' : 'Finish', icon('arrow-right', { size: 18 }))),

        h('p.stage__hint', { style: { opacity: '0.75' } },
          `Eye ${eyeIndex + 1} of 2`));

      drawGrid();
    }

    function finish() {
      const affected = perEye.filter((e) => e.distortionReported);
      const result = {
        testId: 'amsler',
        eye: affected.length === 2 ? 'both' : affected[0]?.eye ?? 'both',
        perEye,
        distortionReported: affected.length > 0,
        // Distortion on this grid is one of the few findings here that genuinely
        // warrants a prompt appointment rather than a routine one.
        referralUrgency: affected.length > 0 ? 'prompt' : 'routine',
        summary: affected.length === 0
          ? 'No distortion reported'
          : `Distortion reported — ${affected.map((e) => e.eye).join(' and ')} eye`,
        detail: affected.length === 0
          ? 'Both eyes: grid appeared regular'
          : affected.map((e) => `${e.eye}: ${e.types.join(', ') || 'marked area'}`).join(' · '),
      };
      onComplete(result);
    }

    canvas.addEventListener('pointerdown', (e) => {
      painting = true;
      canvas.setPointerCapture(e.pointerId);
      addMark(e);
    });
    canvas.addEventListener('pointermove', (e) => { if (painting) addMark(e); });
    canvas.addEventListener('pointerup', () => { painting = false; });

    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { if (!disposed) drawGrid(); }, 150);
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
