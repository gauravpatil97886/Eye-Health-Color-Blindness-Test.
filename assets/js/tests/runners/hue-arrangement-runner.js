/**
 * Fovea — hue arrangement.
 *
 * Fifteen caps that differ ONLY in hue — matched lightness, matched chroma —
 * to be put back into a smooth colour sequence. Someone with typical colour
 * vision orders them almost perfectly. Someone with a deficiency makes errors,
 * and crucially the errors are not random: they cluster along that person's
 * confusion axis, which is what lets an arrangement test say something the
 * plates cannot.
 *
 * WHY NOT MUNSELL CAPS
 * The classic cap test uses Munsell notation, and "Munsell" is a registered
 * mark held in the software class. The caps here are generated on our own
 * equally-spaced OKLab hue circle instead — same principle, same diagnostic
 * geometry, nothing borrowed.
 *
 * WHY THE AXIS IS COMPUTED BY SIMULATION, NOT BY A PUBLISHED ANGLE
 * Published confusion-angle ranges are stated in CIE u'v'. Quoting those
 * numbers against an OKLab hue circle would be borrowing authority the maths
 * does not support. Instead, for every mistake the user actually made, we ask
 * the simulator which deficiency would make that specific pair of caps look
 * alike — and tally. The evidence is then internally consistent with the rest
 * of the app.
 *
 * ACCESSIBILITY
 * Arranging is tap-a-cap-then-tap-another-to-swap. There is no drag anywhere:
 * WCAG 2.2 SC 2.5.7 requires a non-drag path, and for a test whose users
 * include people with low vision that is not a nice-to-have.
 */

import { h, icon } from '../../core/dom.js';
import { announce } from '../../core/a11y.js';
import { oklabToHex, hexToOklab } from '../../color/convert.js';
import { simulateHex, CVD_TYPES, CVD_LABELS } from '../../color/cvd.js';

const CAP_COUNT = 15;
const CAP_L = 0.64;        // constant lightness — hue must be the only cue
const CAP_C = 0.085;       // constant chroma, chosen to stay in sRGB all the way round

export const runner = {
  id: 'hue-arrangement',
  testMode: 'neutral',

  create({ onComplete }) {
    const caps = buildCaps();
    const reference = caps[0];
    // Shuffle everything except the fixed reference cap.
    const order = shuffle(caps.slice(1).map((c) => c.index));
    let selected = null;
    const host = h('div.stage');

    function buildCaps() {
      const out = [];
      for (let i = 0; i < CAP_COUNT; i++) {
        const hue = (i / CAP_COUNT) * Math.PI * 2;
        const hex = oklabToHex([CAP_L, Math.cos(hue) * CAP_C, Math.sin(hue) * CAP_C]);
        out.push({ index: i, hex });
      }
      return out;
    }

    function shuffle(a) {
      const out = a.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    }

    function capButton(capIndex, position) {
      const cap = caps[capIndex];
      const isSelected = selected === position;
      return h('button', {
        type: 'button',
        'aria-label': `Position ${position + 2}` + (isSelected ? ', selected' : ''),
        'aria-pressed': String(isSelected),
        style: {
          width: 'clamp(38px, 8vw, 56px)',
          height: 'clamp(52px, 11vw, 76px)',
          background: cap.hex,
          border: isSelected ? '4px solid #111' : '2px solid rgba(0,0,0,0.35)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          transform: isSelected ? 'translateY(-6px)' : 'none',
        },
        onclick: () => tap(position),
      });
    }

    function tap(position) {
      if (selected === null) { selected = position; }
      else if (selected === position) { selected = null; }
      else {
        [order[selected], order[position]] = [order[position], order[selected]];
        announce('Swapped');
        selected = null;
      }
      render();
    }

    function render() {
      host.replaceChildren(
        h('a.btn.btn--ghost.btn--sm.stage__exit', { href: '#/tests' }, icon('x', { size: 16 }), 'Stop'),
        h('p.stage__prompt', 'Put the colours in a smooth order'),
        h('p.stage__hint',
          'The first cap is fixed. Arrange the rest so the colour changes gradually from left ' +
          'to right and comes back round. Tap one cap, then tap another, to swap them.'),

        h('div', {
          style: {
            display: 'flex', flexWrap: 'wrap', gap: '6px',
            justifyContent: 'center', maxWidth: 'min(94vw, 46rem)',
            padding: 'var(--space-4)', background: 'var(--test-panel)',
            borderRadius: 'var(--radius-md)',
          },
        },
          h('div', {
            style: {
              width: 'clamp(38px, 8vw, 56px)', height: 'clamp(52px, 11vw, 76px)',
              background: reference.hex, borderRadius: 'var(--radius-sm)',
              border: '2px dashed #111', opacity: '0.95',
            },
            'aria-label': 'Fixed starting cap',
          }),
          order.map((capIndex, position) => capButton(capIndex, position))),

        h('p.stage__hint', { style: { opacity: '0.8' } },
          selected === null ? 'Tap a cap to pick it up' : 'Now tap where it should go'),

        h('button.btn.btn--primary.btn--lg', { type: 'button', onclick: finish },
          'I am done', icon('check', { size: 18 })));
    }

    function finish() {
      const arrangement = [reference.index, ...order];

      /* Total colour difference of the arrangement, vs a perfect one. */
      const tcds = pathLength(arrangement);
      const perfect = pathLength(caps.map((c) => c.index));
      const errorScore = Math.round((tcds / perfect) * 100) / 100;

      /* Which deficiency best explains the specific mistakes made? */
      const misplaced = [];
      for (let i = 0; i < arrangement.length - 1; i++) {
        const a = arrangement[i];
        const b = arrangement[i + 1];
        const gap = circularGap(a, b, CAP_COUNT);
        if (gap > 1) misplaced.push([a, b]);
      }

      const votes = { protan: 0, deutan: 0, tritan: 0 };
      for (const [a, b] of misplaced) {
        let best = null;
        let bestDelta = Infinity;
        for (const type of CVD_TYPES) {
          const d = oklabDistance(
            simulateHex(caps[a].hex, type, 1),
            simulateHex(caps[b].hex, type, 1)
          );
          if (d < bestDelta) { bestDelta = d; best = type; }
        }
        if (best) votes[best]++;
      }

      const total = votes.protan + votes.deutan + votes.tritan;
      const ranked = Object.entries(votes).sort((x, y) => y[1] - x[1]);
      const clean = errorScore < 1.25;
      const axis = (!clean && total >= 3 && ranked[0][1] > ranked[1][1])
        ? { type: ranked[0][0], label: CVD_LABELS[ranked[0][0]].long,
            confidence: ranked[0][1] >= total * 0.6 ? 'moderate' : 'low' }
        : null;

      onComplete({
        testId: 'hue-arrangement',
        eye: 'both',
        arrangement,
        errorScore,
        misplacements: misplaced.length,
        axisVotes: votes,
        axis,
        summary: clean
          ? 'Ordered cleanly'
          : axis ? `Errors cluster along a ${axis.label} axis` : 'Some ordering errors',
        detail:
          `error score ${errorScore.toFixed(2)}x a perfect arrangement · ` +
          `${misplaced.length} out-of-sequence step(s)` +
          (axis
            ? ` · errors best explained by ${axis.label} (${axis.confidence} confidence)`
            : clean
              ? ' · no axis to report'
              : ' · errors did not cluster on any one axis, which usually means the ordering ' +
                'was rushed rather than that colour vision is the cause'),
      });
    }

    function pathLength(seq) {
      let sum = 0;
      for (let i = 0; i < seq.length - 1; i++) {
        sum += oklabDistance(caps[seq[i]].hex, caps[seq[i + 1]].hex);
      }
      return sum;
    }

    render();
    return { el: host, destroy() {} };
  },
};

function oklabDistance(hexA, hexB) {
  const p = hexToOklab(hexA);
  const q = hexToOklab(hexB);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** Shortest distance between two positions on a circular sequence. */
function circularGap(a, b, n) {
  const d = Math.abs(a - b);
  return Math.min(d, n - d);
}
