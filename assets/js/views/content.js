/**
 * Fovea — static content screens.
 *
 * These are the trust surface. The argument the whole project rests on is that
 * publishing your own limitations is worth more than claiming accuracy, so
 * these pages are written to be read, not skimmed past.
 */

import { h, s, icon, createView } from '../core/dom.js';
import { screeningTests, perceptionTests, TOOLS } from '../tests/registry.js';
import { testPreview } from '../ui/preview.js';

const page = (...children) =>
  createView(h('div.view.container.container--md.section', h('div.stack.stack--xl', ...children)));

const GITHUB_USER = 'https://github.com/gauravpatil97886';
const GITHUB_REPO = 'https://github.com/gauravpatil97886/Eye-Health-Color-Blindness-Test.';

/**
 * The author card. Deliberately a real, prominent credit rather than a line of
 * grey text at the bottom — this is one person's work, done in the open, and
 * the whole trust argument of the site rests on being able to see who made it
 * and check what they did.
 */
function authorCard() {
  return h('div.author-card',
    h('div.author-card__mark',
      // Must be built with s(), not h(): h() uses createElement, which produces
      // an HTML <svg> that renders as nothing. SVG needs createElementNS.
      s('svg', { viewBox: '0 0 24 24', width: 44, height: 44, 'aria-hidden': 'true', focusable: 'false' },
        s('circle', { cx: 12, cy: 12, r: 8, fill: 'none', stroke: 'currentColor',
                      'stroke-width': 4, 'stroke-dasharray': '46.3 4',
                      transform: 'rotate(-3.6 12 12)' }),
        s('circle', { cx: 12, cy: 12, r: 3.2, fill: 'none', stroke: 'currentColor',
                      'stroke-width': 1, opacity: 0.45 }),
        s('circle', { cx: 12, cy: 12, r: 1.4, fill: 'currentColor' }))),

    h('div.author-card__body',
      h('p.eyebrow', 'Built by'),
      h('h3.author-card__name', 'Gaurav Patil'),
      h('p.author-card__role',
        'Backend engineer. Fovea began as a college project in 2020 and was rebuilt from ' +
        'scratch in 2026 — new engine, generated plates, twelve checks, and a great deal ' +
        'more honesty about what a browser can and cannot measure.'),
      h('div.author-card__links',
        h('a.btn.btn--secondary.btn--sm', { href: GITHUB_USER, target: '_blank', rel: 'noopener noreferrer' },
          icon('user', { size: 16 }), 'github.com/gauravpatil97886', icon('external', { size: 12 })),
        h('a.btn.btn--ghost.btn--sm', { href: GITHUB_REPO, target: '_blank', rel: 'noopener noreferrer' },
          icon('layers', { size: 16 }), 'Source code', icon('external', { size: 12 })))),

    h('p.author-card__note',
      'Worth knowing: this is written by a developer working from published sources, not by ' +
      'a clinician. No optometrist has reviewed it. Every clinical claim on the site is ' +
      'traceable to a source listed below, and where the research disagreed with itself the ' +
      'more cautious reading was taken.'));
}

/** A visual index of everything built, using each test's own stimulus. */
function builtIndex() {
  const groups = [
    ['Vision checks', screeningTests()],
    ['Eye & brain games', perceptionTests()],
    ['Tools', TOOLS],
  ];
  return h('div.stack.stack--lg',
    groups.map(([label, items]) =>
      h('div.stack.stack--sm',
        h('h3', { style: { fontSize: 'var(--text-base)', color: 'var(--text-2)' } },
          `${label} · ${items.length}`),
        h('div.built-grid',
          items.map((t) =>
            h('a.built-tile', { href: t.route ?? `#/t/${t.id}` },
              h('span.built-tile__media', testPreview(t.id, { size: 44 })),
              h('span.built-tile__name', t.name)))))));
}

export function creditsView() {
  return page(
    h('div.stack.stack--sm',
      h('p.eyebrow', 'Credits'),
      h('h1', 'Who built this, and what it was built from')),

    authorCard(),

    h('div.stack.stack--sm',
      h('h2', { style: { fontSize: 'var(--text-xl)' } }, 'What was built'),
      h('p.muted', { style: { maxWidth: 'var(--measure)' } },
        'Twelve checks and two tools, every stimulus generated in the browser. Nothing here ' +
        'loads a pre-made image — the plates, optotypes, grids and hue circles are all drawn ' +
        'from the geometry and colour science described below.'),
      builtIndex()),

    h('div.stack.stack--sm',
      h('h2', { style: { fontSize: 'var(--text-xl)' } }, 'The research behind it'),
      h('p.muted', { style: { maxWidth: 'var(--measure)' } },
        'Each of these shaped a specific decision, and the note says which. Where a figure ' +
        'appears anywhere on this site, it came from one of them.'),
      sourceList()),

    h('div.callout.callout--info',
      h('div.callout__icon', icon('info')),
      h('div.callout__body',
        h('p.callout__title', 'Corrections are welcome'),
        h('p', 'Particularly from anyone with clinical training. Open an issue on the ',
          h('a', { href: GITHUB_REPO, target: '_blank', rel: 'noopener noreferrer' }, 'repository'),
          '. Please don’t send screenshots of your results — we don’t want them.'))),

    section('Not affiliated with anyone',
      'Fovea is independent. It is not affiliated with, endorsed by, or connected to Kanehara ' +
      'Trading, the Isshinkai Foundation, X-Rite, Pantone, Precision Vision, Good-Lite, ' +
      'Richmond Products or Lea-Test. Where the names of classic clinical tests appear, they ' +
      'are used descriptively to explain what a check is modelled on.'),

    section('Licence',
      'Code is MIT. Written content is CC BY-SA 4.0. Use it, fork it, improve it.'));
}

export function aboutView() {
  return page(
    h('div.stack.stack--sm',
      h('p.eyebrow', 'About'),
      h('h1', 'What Fovea is, and what it isn’t')),

    h('p.lede',
      'Fovea is a set of vision and perception checks that run entirely in your browser. ' +
      'It is free, open source, and has no server to send anything to.'),

    section('Why it exists',
      'Most online eye tests are built to capture an email address or sell a product. They ' +
      'rarely mention that a browser cannot measure your screen’s brightness, cannot detect ' +
      'a blue-light filter, and usually has no idea how far away you are sitting — all of ' +
      'which change the answer. Fovea takes the opposite position: state the conditions, ' +
      'refuse to render a stimulus the screen cannot draw honestly, and say plainly when a ' +
      'result cannot be trusted.'),

    h('div.stack.stack--sm',
      h('h2', { style: { fontSize: 'var(--text-xl)' } }, 'Who built it'),
      authorCard(),
      h('p', { style: { marginTop: 'var(--space-4)' } },
        h('a.btn.btn--secondary', { href: '#/credits' },
          icon('layers', { size: 18 }), 'Credits and the research behind it',
          icon('arrow-right', { size: 16 })))),

    section('What it will never do',
      null,
      h('ul.stack.stack--sm', { style: { color: 'var(--text-2)' } },
        [
          'Ask for an account, an email address, or a payment.',
          'Load analytics, fonts, or scripts from anyone else’s server.',
          'Sell you glasses, lenses, or supplements based on your results.',
          'Give you a spectacle prescription — that requires a refraction, not a web page.',
          'Tell you that you are fit or unfit for any job or licence.',
        ].map((t) => h('li', { style: { paddingLeft: 'var(--space-5)', position: 'relative' } }, '• ' + t)))),

    h('div.disclaimer',
      h('p', h('strong', 'Full statement. '),
        'Fovea is provided for education and self-checking only. It is not a medical device, ' +
        'has not been evaluated or cleared by any regulatory authority, and is not intended ' +
        'to diagnose, treat, cure or prevent any disease. Using it does not create a ' +
        'clinician–patient relationship. Results depend on your screen, lighting, distance ' +
        'and attention, none of which can be verified.'),
      h('p', h('strong', 'Seek medical attention immediately '), 'if you have sudden vision ' +
        'loss, flashes of light, a sudden increase in floaters, a curtain or shadow across ' +
        'your vision, or eye pain. Do not use this site to decide whether that is urgent.')),

    section('Not affiliated with anyone',
      'Fovea is independent. It is not affiliated with, endorsed by, or connected to Kanehara ' +
      'Trading, the Isshinkai Foundation, X-Rite, Pantone, Precision Vision, Good-Lite, ' +
      'Richmond Products or Lea-Test. Where the names of classic clinical tests appear on this ' +
      'site, they are used descriptively to explain what a check is modelled on. All plates ' +
      'and optotypes here are generated by this software.'),

    section('Licence',
      'The code is MIT licensed. The written content is CC BY-SA 4.0. Contributions and ' +
      'corrections are welcome — particularly from anyone with clinical training.'));
}

export function privacyView() {
  return page(
    h('div.stack.stack--sm', h('p.eyebrow', 'Privacy'), h('h1', 'Fovea stores nothing and sends nothing')),

    h('div.callout.callout--ok',
      h('div.callout__icon', icon('lock')),
      h('div.callout__body',
        h('p.callout__title', 'The short version'),
        h('p', 'Fovea does not collect anything, because there is no server to collect it with.'))),

    section('What is stored, and where',
      'Your results, your screen calibration, your preferences and the optional name you put ' +
      'on a report live in this browser’s local storage, on this device, in this browser ' +
      'profile only. Nothing is encrypted, because nothing travels. Anyone who can unlock ' +
      'this device and open this browser can read it. On a shared computer, use “Delete ' +
      'everything” in Settings, or a private window.'),

    section('What Fovea does not do',
      'No accounts. No cookies. No analytics — not Google Analytics, not a privacy-friendly ' +
      'one, not a self-hosted one. No error reporting. No fonts, scripts or images loaded ' +
      'from another company. No advertising. Nothing is sold or shared, because there is ' +
      'nothing on our side to sell or share.'),

    section('The one thing outside our control',
      'Fovea is served by GitHub Pages. GitHub sees what any web host sees when it sends you ' +
      'a file — your IP address, your browser, the file requested — under GitHub’s own privacy ' +
      'policy. We never receive or request those logs. If that matters to you, download the ' +
      'repository and open it locally, or install Fovea and use it offline.'),

    section('Verify it yourself',
      'Open your browser’s network tab and use the whole site. You will see the initial file ' +
      'loads and nothing else. The page also ships a Content-Security-Policy that structurally ' +
      'forbids contacting any other origin — that is enforced by your browser, not promised ' +
      'by us.'),

    section('Contact',
      'Issues and corrections go to the GitHub repository. Please do not send us your ' +
      'results — we do not want them.'));
}

export function methodologyView() {
  return page(
    h('div.stack.stack--sm', h('p.eyebrow', 'Methodology'), h('h1', 'How each check works, and where it falls short')),

    h('p.lede', 'Everything below is deliberately specific enough to argue with.'),

    section('Colour vision plates',
      'Twelve plates, generated in your browser rather than loaded as images: one ' +
      'demonstration plate everyone can read, and eleven where the figure is visible to ' +
      'typical colour vision but not to one specific deficiency. Protan and deutan carry ' +
      'equal weight, with a smaller tritan block. Figure and ground colours sit on a ' +
      'confusion line — the set of colours a given deficiency cannot tell apart — derived ' +
      'from the null space of the Brettel–Viénot–Mollon simulation, so the generator and its ' +
      'validator provably agree. Every plate is checked before it is shown and rejected if ' +
      'the figure would still be separable to the deficiency it targets.'),

    section('Why there are twelve and not twenty-four',
      'An earlier build had 24 plates across four classes. Two classes were removed after ' +
      'rendering them and looking honestly at the output. “Diagnostic” plates carried two ' +
      'overlapping figures, meaning to show a different digit to each deficiency type — ' +
      'quantised into dots they were unreadable mush. “Hidden” plates, meant to be visible ' +
      'only to a deficiency, leaked: the figure stayed partly visible to typical vision, so ' +
      'they measured nothing reliable. Twelve legible plates beat twenty-four where a third ' +
      'are noise.'),

    section('On mottle, and a mistake worth recording',
      'Travelling along a confusion line changes brightness as a typical trichromat measures ' +
      'it. It is tempting to conclude the figure could be read by brightness alone and to ' +
      'mask it with heavy per-dot lightness scatter. That is wrong, and doing it wrecks the ' +
      'test. Both members of the pair simulate to the same colour for the target deficiency, ' +
      'brightness included — the measured difference after simulation is 0.0000 for protan. ' +
      'The luminance difference reaches only a typical trichromat, and for them it is part of ' +
      'the signal. An early version of this app scaled the scatter to that difference and ' +
      'quietly erased its own figures, worst on protan plates, which have the largest ' +
      'difference. The mottle is now a small fixed amount, and a test asserts it stays well ' +
      'below the figure/ground gap.'),

    section('How the plates are scored',
      'A run is judged on its WORST axis, not on the overall score. With plates balanced ' +
      'across three axes, someone with a strong single-axis deficiency misses only about a ' +
      'third of the set; their overall ratio lands mid-band and reads as inconclusive even ' +
      'though the pattern is unmistakable — every plate on one axis missed, every plate on ' +
      'the others read. Averaging dilutes exactly the signal that matters. Missing 60% or ' +
      'more of one axis indicates a difference; 25% or less on every axis reads as typical; ' +
      'in between is reported as inconclusive, because that is the honest answer there. The ' +
      'demonstration plate is a control rather than a question: failing it voids the run.'),

    section('Why plates are generated fresh every session',
      'A fixed set of plate images can be memorised, reverse-image-searched, or read straight ' +
      'off the filenames. Generating them removes that, and lets the figure be randomised per ' +
      'run — which the clinical instructions themselves ask for.'),

    section('The screen resolution limit',
      'A 6/6 optotype at 60 cm is under a millimetre tall, so its stroke lands on well under ' +
      'one physical pixel on a typical laptop. Any site reporting 6/6 under those conditions ' +
      'is measuring its own anti-aliasing. Fovea computes the finest acuity your screen and ' +
      'distance can actually render and will ask you to move back rather than report a number ' +
      'it cannot draw.'),

    section('What cannot be checked at all',
      'A web page cannot read your screen brightness, and cannot detect Night Shift, Night ' +
      'Light, f.lux or an operating-system colour filter — those are applied after the browser ' +
      'has finished drawing, so reading pixels back tells us nothing. Anything claiming ' +
      'otherwise is measuring its own output. We ask instead, and record your answer alongside ' +
      'the result.'),

    h('div.callout.callout--watch',
      h('div.callout__icon', icon('alert')),
      h('div.callout__body',
        h('p.callout__title', 'How accurate is this, honestly?'),
        h('p',
          'Not 100%, and nothing on a web page could be. Every check here runs on a display ' +
          'whose brightness, colour profile and filters cannot be measured, at a distance we ' +
          'have to take your word for, in lighting we cannot see. Published comparisons of ' +
          'screen-based colour plate tests against the printed booklet put sensitivity around ' +
          '94–96% and specificity around 82–95% — good enough to be worth doing, nowhere near ' +
          'good enough to decide anything on.'),
        h('p', { style: { marginTop: 'var(--space-3)' } },
          'Treat a result here as a reason to book an appointment, or a reason not to worry ' +
          'much — never as an answer. The one thing we can promise is that where this tool ' +
          'does not know something, it says so instead of guessing.'))),

    h('div.stack.stack--sm',
      h('h2', { style: { fontSize: 'var(--text-xl)' } }, 'Sources'),
      h('p.muted', { style: { maxWidth: 'var(--measure)' } },
        'What this was built from. Where a figure appears anywhere on this site, it came from ' +
        'one of these — and where the research disagreed with itself, the more cautious ' +
        'reading was taken.'),
      sourceList()),

    h('p', h('a.btn.btn--secondary', { href: '#/credits' },
      icon('user', { size: 18 }), 'Credits', icon('arrow-right', { size: 16 }))));
}

export function learnIndexView() {
  const articles = [
    ['what-is-colour-blindness', 'What colour vision deficiency actually is',
     'It is a difference in cone photopigments, not an absence of colour. Roughly 1 in 12 men and 1 in 200 women have one.'],
    ['types', 'Protan, deutan, tritan — and why “red-green” misleads',
     'What each type confuses, which are common, and which are usually acquired rather than inherited.'],
    ['when-to-see-a-doctor', 'When to see an eye doctor',
     'The symptoms that need attention today, what an exam involves, and why a clear online result is not reassurance.'],
    ['living-with-cvd', 'Living with a colour vision difference',
     'What actually helps day to day, and an honest look at what is marketed as a fix.'],
    ['eye-strain', 'Digital eye strain: what the evidence supports',
     'The 20-20-20 rule is weaker evidence than it is usually presented as. Here is what holds up.'],
    ['myths', 'Nine myths about eye health',
     'Reading in dim light, carrots, sitting close to the TV, blue-light glasses, and more.'],
  ];

  return page(
    h('div.stack.stack--sm', h('p.eyebrow', 'Learn'), h('h1', 'Understanding your eyes')),
    h('p.lede', 'Written from cited sources. Where the evidence is weak, it says so.'),
    h('div.grid.grid--auto',
      articles.map(([slug, title, summary]) =>
        h('a.test-card', { href: `#/learn/${slug}` },
          h('div.test-card__title', title),
          h('p.test-card__desc', summary),
          h('div.test-card__meta', h('span', 'Read'), icon('arrow-right', { size: 14 }))))));
}

export function learnArticleView({ params }) {
  return page(
    h('a.btn.btn--ghost.btn--sm', { href: '#/learn' }, icon('arrow-left', { size: 16 }), 'All articles'),
    h('h1', 'Article coming'),
    h('p.lede', `The "${params.slug}" article has not been written yet.`),
    h('p.muted',
      'It is listed on the index so the plan is visible rather than hidden. Writing health ' +
      'content properly means sourcing every factual claim, and that has not been done for ' +
      'this one yet — so there is nothing here rather than something unsourced.'));
}

const SOURCES = [
  ['Colour vision simulation', [
    ['Brettel, Viénot & Mollon (1997) — Computerized simulation of color appearance for dichromats',
     'https://doi.org/10.1364/JOSAA.14.002647',
     'The two half-plane model this app uses. The widely-copied single-matrix shortcut is a fair approximation for protan and deutan but not for tritan.'],
    ['Viénot, Brettel & Mollon (1999) — Digital video colourmaps for checking the legibility of displays by dichromats',
     'https://doi.org/10.1002/(SICI)1520-6378(199908)24:4<243::AID-COL5>3.0.CO;2-3',
     'The single-plane simplification, and the reason it is not used here for tritan.'],
    ['Machado, Oliveira & Fernandes (2009) — A physiologically-based model for simulation of color vision deficiency',
     'https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html',
     'Severity-parameterised matrices, and a useful acceptance test: every row must sum to 1 and grey must be invariant.'],
  ]],
  ['Colour vision testing', [
    ['Ishihara plate instructions (Kanehara) — 38, 24 and 14 plate editions',
     'https://web.stanford.edu/group/vista/wikiupload/0/0a/Ishihara.14.Plate.Instructions.pdf',
     'Plate classes, the official pass thresholds, and the deliberate indeterminate band that most online versions collapse into a binary.'],
    ['Validation of Ishihara presentation on a smartphone vs a calibrated monitor (2024)',
     'https://pmc.ncbi.nlm.nih.gov/articles/PMC11287189/',
     'Where the 94–96% sensitivity figure above comes from.'],
    ['A proposed correction in the weighted method to score the Ishihara test',
     'https://pmc.ncbi.nlm.nih.gov/articles/PMC6537449/',
     'Plate-category grouping and weighted scoring.'],
  ]],
  ['Optotypes and acuity', [
    ['ISO 8596 — Ophthalmic optics: visual acuity testing, standard optotype',
     'https://www.iso.org/standard/69042.html',
     'The Landolt ring construction used here: outer diameter 5 units, stroke 1, gap 1, eight orientations.'],
    ['Bailey & Lovie (1976) — New design principles for visual acuity letter charts',
     'https://doi.org/10.1097/00006324-197611000-00006',
     'The logMAR progression, 0.1 log units per line — also the ratio this site’s type scale steps by.'],
    ['ISO/IEC 7810 ID-1',
     'https://www.iso.org/standard/70483.html',
     'The 85.60 × 53.98 mm card dimensions the screen calibration matches against.'],
  ]],
  ['Contrast and psychophysics', [
    ['Allard & Faubert (2008) — The noisy-bit method for digital displays',
     'https://doi.org/10.3758/BRM.40.3.735',
     'Dithering below the visible level so an 8-bit screen can present contrasts finer than one code value. Without it the contrast test measures the panel, not the eye.'],
    ['Campbell & Robson (1968) — Application of Fourier analysis to the visibility of gratings',
     'https://pmc.ncbi.nlm.nih.gov/articles/PMC1351748/',
     'The spatial-frequency channels result underneath contrast sensitivity.'],
    ['García-Pérez (1998) — Forced-choice staircases with fixed step sizes',
     'https://doi.org/10.1016/S0042-6989(97)00340-4',
     'Why the staircases here use 1-up/2-down and 1-up/3-down rather than the simple 1-up/1-down.'],
  ]],
  ['Anatomy and the blind spot', [
    ['Rohrschneider (2004) — Determination of the location of the fovea on the fundus',
     'https://doi.org/10.1167/iovs.03-1157',
     'The blind spot centre at 15.5° temporal, 1.5° below the meridian, and the 13–18° spread across individuals.'],
    ['Ramachandran & Gregory (1991) — Perceptual filling in of artificially induced scotomas',
     'https://doi.org/10.1038/350699a0',
     'Why a line drawn through your blind spot still looks unbroken.'],
  ]],
  ['Accessibility and safety', [
    ['WCAG 2.2',
     'https://www.w3.org/TR/WCAG22/',
     'The conformance target for all chrome, instructions and results — with a documented exception for the test stimuli themselves, where low contrast is the measurement.'],
    ['MHRA — Guidance on medical device stand-alone software including apps',
     'https://www.gov.uk/government/publications/medical-devices-software-applications-apps',
     'Intended use decides regulatory status, not disclaimer text. This is why the site says “check” rather than “screening” and never mentions occupational fitness.'],
  ]],
];

function sourceList() {
  return h('div.stack.stack--lg',
    SOURCES.map(([group, items]) =>
      h('div.stack.stack--sm',
        h('h3', { style: { fontSize: 'var(--text-base)', color: 'var(--text-2)' } }, group),
        h('ul.stack.stack--sm',
          items.map(([title, url, why]) =>
            h('li', {
              style: {
                paddingLeft: 'var(--space-4)',
                borderLeft: '2px solid var(--border-1)',
              },
            },
              h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' },
                title, ' ', icon('external', { size: 12 })),
              h('p.muted', { style: { fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' } },
                why)))))));
}

function section(heading, body, ...extra) {
  return h('div.stack.stack--sm',
    h('h2', { style: { fontSize: 'var(--text-xl)' } }, heading),
    body && h('p.muted', { style: { maxWidth: 'var(--measure)' } }, body),
    ...extra);
}
