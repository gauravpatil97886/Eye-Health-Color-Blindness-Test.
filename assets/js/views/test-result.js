/**
 * Fovea — single-test result.
 *
 * Fixed reading order, and it is not negotiable:
 *   1. the disclaimer, before any finding
 *   2. the headline, phrased as "your responses are consistent with…"
 *   3. the evidence
 *   4. what it means AND what it does not, at equal visual weight
 *   5. what to do next
 */

import { h, icon, createView } from '../core/dom.js';
import { byId } from '../tests/registry.js';
import { store } from '../core/store.js';
import { interpret } from '../tests/color-plates.js';
import { lastResult } from './test-run.js';

export function testResultView({ params }) {
  const test = byId(params.id);
  const result = lastResult?.testId === params.id ? lastResult : findLatest(params.id);

  if (!result) {
    return createView(h('div.view.container.section',
      h('div.empty',
        h('h1', 'No result to show'),
        h('p', 'Take the check first and the result will appear here.'),
        h('p', h('a.btn.btn--primary', { href: `#/t/${params.id}` }, 'Start the check')))));
  }

  const reading = interpret(result);
  const toneClass = { ok: 'badge--ok', watch: 'badge--watch', info: 'badge--info' }[reading.tone];

  const el = h('div.view.container.container--md.section',
    h('div.stack.stack--xl',

      h('div.disclaimer',
        h('p', h('strong', 'This is a check, not a diagnosis. '),
          'Fovea ran on a screen whose brightness, colour profile and filters it cannot ' +
          'see, in lighting it cannot measure. It can suggest something is worth looking ' +
          'at — it cannot confirm or rule out anything.'),
        h('p', h('strong', 'A clear result is not reassurance. '),
          'Several serious eye conditions cause no symptoms until they are advanced and ' +
          'would not appear in any test on this site.')),

      h('div.stack.stack--sm',
        h('p.eyebrow', test?.name ?? 'Result'),
        h('h1.result-headline', reading.headline),
        h('div.row',
          h('span', { class: `badge badge--lg ${toneClass}` },
            icon(reading.tone === 'ok' ? 'check-circle' : 'info', { size: 14 }),
            result.summary),
          result.axis?.type && h('span.badge.badge--lg',
            `Type confidence: ${result.axis.confidence}`))),

      evidenceBlock(result),

      h('div.means-grid',
        h('div.means',
          h('h4', 'What this means'),
          h('ul', reading.means.map((m) => h('li', m)))),
        h('div.means',
          h('h4', 'What this does not mean'),
          h('ul', reading.notMeans.map((m) => h('li', m))))),

      h('div.card.card--sunken.stack.stack--sm',
        h('h3', { style: { fontSize: 'var(--text-lg)' } }, 'What to do next'),
        h('p.muted', nextSteps(result))),

      h('div.row',
        h('a.btn.btn--primary', { href: '#/report' }, icon('chart', { size: 18 }), 'Build my report'),
        h('a.btn.btn--secondary', { href: `#/t/${params.id}/run` }, icon('refresh', { size: 18 }), 'Take it again'),
        h('a.btn.btn--ghost', { href: '#/tests' }, 'Other checks'))));

  return createView(el);
}

function evidenceBlock(result) {
  if (result.testId !== 'color-plates') return null;

  const c = result.counts;
  return h('div.stack.stack--sm',
    h('h3', { style: { fontSize: 'var(--text-lg)' } }, 'The evidence'),
    h('div.grid', { style: { '--gap': 'var(--space-3)', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))' } },
      metric(`${c.typicalResponses} of ${c.scoreable}`, 'Plates read as expected',
             'Excludes the type-identifying plates, which are scored separately.'),
      metric(`${Math.round(result.ratio * 100)}%`, 'Agreement with the typical pattern',
             'Above 81% reads as typical; 62% or below indicates a difference.'),
      result.axis?.type
        ? metric(result.axis.label.split(' ')[0], 'Best-fitting type',
                 `protan ${pct(result.axisEvidence.protan)} · deutan ${pct(result.axisEvidence.deutan)} · tritan ${pct(result.axisEvidence.tritan)}`)
        : metric('—', 'Type', 'Not separable from these answers.'),
      result.severity
        ? metric(result.severity.band, 'Rough strength',
                 'Low confidence. Plate tests separate "likely" from "unlikely" far better than they grade strength.')
        : null));
}

const pct = (v) => `${Math.round(v * 100)}%`;

function metric(value, label, note) {
  return h('div.result-metric',
    h('div.result-metric__value', value),
    h('div.result-metric__label', label),
    note && h('div.result-metric__note', note));
}

function nextSteps(result) {
  if (result.verdict === 'typical') {
    return 'Nothing here needs following up. Book a routine eye exam anyway if it has been ' +
           'more than two years — the conditions that matter most are the ones you cannot feel.';
  }
  if (result.verdict === 'void') {
    return 'Run it again in a well-lit room, with screen brightness up and any night-mode or ' +
           'colour filter switched off.';
  }
  if (result.verdict === 'inconclusive') {
    return 'Try it again under better conditions before drawing anything from it. If it stays ' +
           'unclear and you have a reason to wonder, an optometrist can settle it in minutes.';
  }
  return 'Mention this to an optometrist. Inherited colour vision differences need no treatment ' +
         'and do not change over time — but a colour change that is new, or that affects one eye ' +
         'more than the other, is worth checking promptly because that pattern has other causes.';
}

function findLatest(testId) {
  for (const session of store.get().sessions) {
    const r = session.results.find((x) => x.testId === testId);
    if (r) return r;
  }
  return null;
}
