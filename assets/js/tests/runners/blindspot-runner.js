/**
 * Fovea — find your physiological blind spot.
 *
 * Where the optic nerve leaves the retina there are no photoreceptors, so
 * everyone has a real hole in each eye's visual field. You never notice it
 * because your brain fills it in from the surroundings — which this demo makes
 * vivid by running a continuous line through the gap: the dot vanishes and the
 * line still looks unbroken.
 *
 * GEOMETRY (from perimetry, not folklore)
 *   centre   15.5 degrees temporal, 1.5 degrees BELOW the horizontal meridian
 *            (the optic disc sits above the fovea on the retina, so its
 *            projection falls below the meridian in the field)
 *   size     roughly 5.3 degrees wide by 7.5 degrees tall — a vertical oval
 *   spread   13.0 to 17.9 degrees across individuals, which is why the dot has
 *            to sweep rather than sit at one fixed offset
 *
 * The projection uses exact tangents, NOT the small-angle approximation. At
 * 15.5 degrees the small-angle error is 2.45%, which at 50 cm is 3.4 mm — about
 * 7% of the blind spot's own width, i.e. enough to miss it.
 *
 *   x = D * tan(azimuth)
 *   y = D * tan(elevation) / cos(azimuth)      <- the /cos term matters off-axis
 *
 * Because the eye's blind spot is TEMPORAL, the right eye's spot lies to the
 * RIGHT of fixation and the left eye's to the LEFT. Getting that backwards is
 * the most common way this demo fails.
 */

import { h, icon } from '../../core/dom.js';
import { announce } from '../../core/a11y.js';
import { store } from '../../core/store.js';

const DEG = Math.PI / 180;
const CENTRE_AZIMUTH = 15.5;
const CENTRE_ELEVATION = -1.5;
const SWEEP_MIN = 10.0;
const SWEEP_MAX = 21.0;

export const runner = {
  id: 'blindspot',
  testMode: 'white',

  create({ onComplete }) {
    const cal = store.get().calibration;
    const EYES = ['right', 'left'];
    let eyeIndex = 0;
    const perEye = [];
    let disposed = false;

    const host = h('div.stage');

    if (!cal.pxPerMm || !cal.viewingDistanceMm) {
      host.append(
        h('h1', { style: { color: 'var(--test-fg)' } }, 'Set your screen up first'),
        h('p.stage__hint',
          'Your blind spot sits at a fixed ANGLE from where you are looking, so turning ' +
          'that into a position on screen needs your pixel size and your distance. ' +
          'Without them this cannot be placed.'),
        h('div.row.row--center',
          h('a.btn.btn--primary', { href: '#/calibrate' }, 'Set up my screen'),
          h('a.btn.btn--ghost', { href: '#/tests' }, 'Back')));
      return { el: host, destroy() {} };
    }

    const D = cal.viewingDistanceMm;
    const pxPerMm = cal.pxPerMm;

    /** Angular position -> screen offset in px, exact projection. */
    const azimuthToPx = (deg) => D * Math.tan(deg * DEG) * pxPerMm;
    const elevationToPx = (deg, azDeg) =>
      (D * Math.tan(deg * DEG) / Math.cos(azDeg * DEG)) * pxPerMm;

    let azimuth = CENTRE_AZIMUTH;
    let vanished = null;

    const stage = h('div', {
      style: {
        position: 'relative',
        width: '100%',
        height: 'min(46vh, 22rem)',
        background: '#ffffff',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      },
    });

    const slider = h('input.slider', {
      type: 'range',
      min: String(SWEEP_MIN * 10),
      max: String(SWEEP_MAX * 10),
      value: String(CENTRE_AZIMUTH * 10),
      'aria-label': 'Move the dot away from the cross',
    });

    const readout = h('span.mosaic__value');

    function paint() {
      const eye = EYES[eyeIndex];
      const sign = eye === 'right' ? 1 : -1;      // temporal side
      const dx = azimuthToPx(azimuth) * sign;
      const dy = elevationToPx(CENTRE_ELEVATION, azimuth);
      const w = stage.clientWidth || 600;

      // Fixation sits on the opposite side so the dot has room to travel.
      const fixX = sign > 0 ? Math.max(40, w * 0.5 - dx / 2) : Math.min(w - 40, w * 0.5 - dx / 2);
      const dotX = fixX + dx;
      const midY = (stage.clientHeight || 300) / 2;

      const offScreen = dotX < 12 || dotX > w - 12;

      stage.replaceChildren(
        // A continuous line through the gap: the payoff is that it stays
        // unbroken when the dot disappears, which is the filling-in.
        h('div', {
          style: {
            position: 'absolute', left: '0', right: '0',
            top: `${midY + dy}px`, height: '2px', background: '#111',
          },
        }),
        h('div', {
          style: {
            position: 'absolute', left: `${fixX}px`, top: `${midY}px`,
            transform: 'translate(-50%, -50%)',
            fontSize: '28px', lineHeight: '1', color: '#111', fontWeight: '700',
          },
        }, '+'),
        !offScreen && h('div', {
          style: {
            position: 'absolute', left: `${dotX}px`, top: `${midY + dy}px`,
            transform: 'translate(-50%, -50%)',
            width: '22px', height: '22px', borderRadius: '50%', background: '#111',
          },
        }));

      readout.textContent = `${azimuth.toFixed(1)}° from centre` + (offScreen ? ' — off screen' : '');
    }

    function renderStep() {
      const eye = EYES[eyeIndex];
      const other = eye === 'right' ? 'LEFT' : 'RIGHT';
      const side = eye === 'right' ? 'right' : 'left';

      host.replaceChildren(
        h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' }, icon('x', { size: 16 }), 'Stop'),
        h('p.stage__prompt', `Cover your ${other} eye and stare at the +`),
        h('p.stage__hint',
          `Keep looking straight at the cross — do not glance at the dot. Now drag the ` +
          `slider slowly. At some point the dot on the ${side} will disappear completely, ` +
          `while the line through it stays unbroken. That gap is your optic nerve.`),
        stage,
        h('div.mosaic__control',
          h('label.mosaic__label', h('span', 'Move the dot'), readout),
          slider),
        h('div.row.row--center',
          h('button.btn.btn--primary', {
            type: 'button',
            onclick: () => { vanished = azimuth; step(); },
          }, 'It vanished here', icon('check', { size: 18 })),
          h('button.btn.btn--secondary', {
            type: 'button',
            onclick: () => { vanished = null; step(); },
          }, 'Never vanished')),
        h('p.stage__hint', { style: { opacity: '0.75' } }, `Eye ${eyeIndex + 1} of 2`));

      requestAnimationFrame(paint);
    }

    function step() {
      const eye = EYES[eyeIndex];
      perEye.push({
        eye,
        foundAtDeg: vanished,
        expectedDeg: CENTRE_AZIMUTH,
        withinNormalRange: vanished !== null && vanished >= 13.0 && vanished <= 17.9,
      });
      vanished = null;
      azimuth = CENTRE_AZIMUTH;
      slider.value = String(CENTRE_AZIMUTH * 10);
      eyeIndex++;
      if (eyeIndex >= EYES.length) finish();
      else { renderStep(); announce(`Now the ${EYES[eyeIndex]} eye`); }
    }

    function finish() {
      const found = perEye.filter((e) => e.foundAtDeg !== null);
      onComplete({
        testId: 'blindspot',
        eye: 'each',
        perEye,
        summary: found.length === 2
          ? `Found in both eyes (${found.map((e) => `${e.foundAtDeg.toFixed(1)}°`).join(', ')})`
          : found.length === 1
            ? `Found in one eye (${found[0].eye})`
            : 'Not located',
        detail: found.length === 0
          ? 'Not located — usually means fixation drifted, or the dot never reached the right ' +
            'angle for your eyes. It is there; everyone has one.'
          : perEye.map((e) => e.foundAtDeg === null
              ? `${e.eye}: not found`
              : `${e.eye}: ${e.foundAtDeg.toFixed(1)}° temporal` +
                (e.withinNormalRange ? ' (typical range 13–18°)' : ' (outside the usual 13–18°, ' +
                 'most likely a distance or fixation slip rather than anything about your eye)')
            ).join(' · '),
      });
    }

    slider.addEventListener('input', () => {
      azimuth = Number(slider.value) / 10;
      paint();
    });

    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { if (!disposed) paint(); }, 120);
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
