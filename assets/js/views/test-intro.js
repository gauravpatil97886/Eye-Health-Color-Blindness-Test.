/**
 * Fovea — per-test intro.
 *
 * States what the test measures and what it cannot BEFORE the user starts,
 * checks prerequisites, and never begins without a deliberate action.
 */

import { h, icon, createView } from '../core/dom.js';
import { byId, REQUIREMENT_LABELS } from '../tests/registry.js';
import { store } from '../core/store.js';
import { calibrationStatus } from '../core/calibration.js';
import { hasRunner } from '../tests/runners.js';

export function testIntroView({ params }) {
  const test = byId(params.id);
  if (!test) {
    return createView(h('div.view.container.section',
      h('div.empty',
        h('h1', 'No such check'),
        h('p', 'That link does not match any test.'),
        h('p', h('a.btn.btn--secondary', { href: '#/tests' }, 'See all checks')))));
  }

  const cal = calibrationStatus(store.get().calibration);
  const missing = test.requires.filter((req) => !meets(req, cal));
  const built = hasRunner(test.id);

  const el = h('div.view.container.container--md.section',
    h('div.stack.stack--xl',

      h('div.stack.stack--sm',
        h('a.btn.btn--ghost.btn--sm', { href: '#/tests' }, icon('arrow-left', { size: 16 }), 'All checks'),
        h('p.eyebrow', test.tagline),
        h('h1', test.name),
        h('div.row',
          h('span.badge', icon('timer', { size: 12 }), `${test.minutes} min`),
          h('span.badge', icon('eye', { size: 12 }),
            test.eyes === 'each' ? 'One eye at a time' : 'Both eyes open'))),

      h('div.means-grid',
        h('div.means',
          h('h4', 'What this measures'),
          h('ul', h('li', test.measures))),
        h('div.means',
          h('h4', 'What it cannot tell you'),
          h('ul', h('li', test.cannot)))),

      missing.length > 0 && h('div.callout.callout--watch',
        h('div.callout__icon', icon('alert')),
        h('div.callout__body',
          h('p.callout__title', 'Set-up needed first'),
          h('p', 'This check measures real angular sizes, so it cannot run honestly ' +
                 'without knowing your screen and your distance from it.'),
          h('div.row', { style: { marginTop: 'var(--space-3)' } },
            missing.map((req) =>
              h('a.btn.btn--secondary.btn--sm', { href: REQUIREMENT_LABELS[req].route },
                icon(REQUIREMENT_LABELS[req].icon, { size: 16 }),
                REQUIREMENT_LABELS[req].label))))),

      !built && h('div.callout.callout--info',
        h('div.callout__icon', icon('info')),
        h('div.callout__body',
          h('p.callout__title', 'Not built yet'),
          h('p', 'This check is designed and specified but the module is still being ' +
                 'written. It is listed here so the plan is visible — not to imply it works.'))),

      h('div.card.card--sunken.stack.stack--sm',
        h('h3', { style: { fontSize: 'var(--text-lg)' } }, 'How it works'),
        h('ol.stack.stack--sm', { style: { paddingLeft: 'var(--space-5)', listStyle: 'decimal' } },
          instructionsFor(test).map((line) => h('li', { style: { color: 'var(--text-2)' } }, line)))),

      h('div.disclaimer',
        h('p', h('strong', 'This is a check, not a diagnosis. '),
          'Fovea runs on a screen it cannot measure, in a room it cannot see. It can ' +
          'suggest that something is worth looking at. It cannot confirm anything, and ' +
          'it cannot rule anything out.'),
        h('p', h('strong', 'A clear result here is not reassurance. '),
          'Several serious eye conditions cause no symptoms until they are advanced, ' +
          'and none of them would show up in this test.')),

      h('div.row',
        built && missing.length === 0
          ? h('a.btn.btn--primary.btn--lg', { href: `#/t/${test.id}/run` },
              'Begin', icon('arrow-right'))
          : h('button.btn.btn--primary.btn--lg', { disabled: true }, 'Begin'),
        h('a.btn.btn--ghost', { href: '#/tests' }, 'Not now'))));

  return createView(el);
}

function meets(requirement, cal) {
  if (requirement === 'screen-size') return Boolean(store.get().calibration.pxPerMm);
  if (requirement === 'distance') return Boolean(store.get().calibration.viewingDistanceMm);
  if (requirement === 'display-check') return true; // advisory, handled on the gate
  return true;
}

function instructionsFor(test) {
  const common = {
    'color-plates': [
      'A circle of coloured dots appears with a number hidden inside it.',
      'Type the number you see, or choose “Nothing” — that is a real answer, not a failure.',
      'Do not strain or tilt your head. Answer with your first impression.',
      'Keep both eyes open and stay about an arm’s length from the screen.',
    ],
    amsler: [
      'Cover one eye with a cupped hand — do not press on it.',
      'Look only at the dot in the centre. Keep looking at it the whole time.',
      'Without moving your eyes, notice whether any lines look wavy, blurred or missing.',
      'Mark any area that looks wrong, then repeat with the other eye.',
    ],
    acuity: [
      'Cover one eye. Keep your glasses or contacts on if you normally wear them.',
      'A shape appears with a gap in it. Say which way the gap points.',
      'It gets smaller as you go. Guess when you are unsure — guessing is part of the method.',
      'Then swap eyes and do it again.',
    ],
    reaction: [
      'Wait for the screen to change.',
      'Click, tap or press the spacebar as soon as it does.',
      'Do not anticipate — starting early voids that trial.',
      'Several rounds are averaged, so one slow go will not skew it.',
    ],
    astigmatism: [
      'Cover one eye and look at the centre of the dial.',
      'Every line is drawn identically — any difference you see comes from your own eye.',
      'Tap any lines that look darker, blacker or sharper than the rest.',
      'All looking the same is the common answer, not a failure.',
    ],
    contrast: [
      'Digits appear against grey, getting fainter each time.',
      'Type the digit you see. Guess when you cannot tell — the method depends on it.',
      'Turn your screen brightness up first, and avoid glare on the screen.',
      'One eye at a time.',
    ],
    near: [
      'Hold your face about 40 cm from the screen — roughly a forearm.',
      'Keep your reading glasses on if you use them.',
      'Say whether you can read each passage comfortably, without straining.',
      'The text gets smaller until you say stop.',
    ],
    duochrome: [
      'Cover one eye and look at the red and green panels.',
      'The two halves are matched for brightness, so judge sharpness only.',
      'Say which side looks crisper — or that they look the same.',
      '“The same” is the answer a well-corrected eye usually gives.',
    ],
    'hue-arrangement': [
      'Fifteen caps differ only in hue — same lightness, same intensity.',
      'Put them into a smooth colour sequence starting from the fixed cap.',
      'Tap one cap, then tap another, and they swap. No dragging needed.',
      'Take your time; this one is not timed.',
    ],
    blindspot: [
      'Cover one eye and stare at the cross — do not glance at the dot.',
      'Drag the slider slowly to move the dot away from the cross.',
      'At some point the dot vanishes while the line through it stays unbroken.',
      'That gap is where your optic nerve leaves your retina. Everyone has one.',
    ],
    stroop: [
      'A colour word appears printed in a different colour of ink.',
      'Name the INK, not the word. GREEN printed in red is “red”.',
      'Go as fast as you can while staying accurate.',
      'The measurement is how much the clashing words slow you down.',
    ],
    peripheral: [
      'A number in the centre changes every second or so — type each one.',
      'Dots flash briefly around the edges. Press Space the moment you notice one.',
      'Do not go hunting for the dots; keep your eyes on the number.',
      'Typing the numbers is how we know you kept looking at the centre.',
    ],
  };
  return common[test.id] ?? [
    'Read the on-screen instructions before each step.',
    'Answer with your first impression rather than straining.',
    'You can stop at any point without saving a result.',
  ];
}
