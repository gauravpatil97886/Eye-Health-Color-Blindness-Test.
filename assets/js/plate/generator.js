/**
 * Fovea — pseudoisochromatic plate generator.
 *
 * Builds colour vision plates from scratch on a canvas. Nothing is loaded from
 * disk, which solves three problems at once:
 *
 *   licensing     the classic printed plates are trademarked and the modern
 *                 editions are firmly in copyright
 *   cheating      a fixed image can be reverse-image-searched, and its answer
 *                 memorised; here the figure is randomised every session
 *   validity      we can hold luminance equal and place colours exactly on a
 *                 confusion line, which a scanned JPEG cannot promise
 *
 * PLATE CLASSES
 *
 *   demonstration  everyone reads it, whatever their colour vision. Confirms
 *                  the user understands the task and that the plate is
 *                  rendering at all. Failing it voids the run.
 *   vanishing      normal vision reads it, the target deficiency cannot.
 *                  Figure and ground sit on one confusion line.
 *
 * Two further classes were built and REMOVED, which is worth recording so they
 * are not reinvented:
 *
 *   diagnostic     carried two figures at once, one on the protan line and one
 *                  on the deutan line, on the theory that each type would read
 *                  a different digit. Rendered, it is unreadable mush — two
 *                  overlapping glyphs quantised into the same dot field give
 *                  neither figure enough coherent area. Typing is instead done
 *                  by comparing miss rates across protan- and deutan-targeted
 *                  vanishing plates, which works and is legible.
 *   hidden         a figure only the deficiency sees. The three-colour
 *                  construction leaked: the figure stayed partly visible to
 *                  normal vision, so it measured nothing reliably.
 *
 * A smaller set of plates that are all legible beats a larger set where a third
 * of them are noise.
 */

import { packDisc, tiersFor, mulberry32, seedFrom } from './packing.js';
import { createMask, SHAPES, PATH_NAMES } from './glyph.js';
import { confusionPair, simulateHex, separabilityUnder, luminanceDelta, PLATE_SEEDS } from '../color/cvd.js';
import { rgbToHex, linearToRgb, hexToOklab, oklabToLinearRgb, clamp01 } from '../color/convert.js';

export const PLATE_CLASSES = ['demonstration', 'vanishing'];

/**
 * Per-dot jitter applied to lightness and chroma.
 *
 * Real plates are visibly mottled and this reproduces that, but the amount is
 * deliberately SMALL and fixed. An earlier version scaled it to the pair's
 * luminance difference on the theory that brightness would otherwise give the
 * figure away. That reasoning was wrong: the target deficiency sees no
 * brightness difference across the pair at all (both members simulate to the
 * same colour), so the only observer that difference reaches is a normal
 * trichromat — for whom it is part of the signal, not a leak. Scaling jitter to
 * it actively erased the figure, worst on protan plates, which have the largest
 * difference and were consequently the hardest to read.
 *
 * Both values stay well below the figure/ground separation so the mottle
 * softens the boundary without ever bridging it.
 */
const CHROMA_JITTER = 0.010;
const LIGHTNESS_JITTER = 0.022;

function jitterHex(hex, rng, amount) {
  const [L, a, b] = hexToOklab(hex);
  const dL = (rng() - 0.5) * 2 * amount.lightness;
  const dA = (rng() - 0.5) * 2 * amount.chroma;
  const dB = (rng() - 0.5) * 2 * amount.chroma;
  return oklabToHexSafe([L + dL, a + dA, b + dB]);
}

/** OKLab round-trip that clamps back into sRGB rather than emitting a clipped colour. */
function oklabToHexSafe(lab) {
  return rgbToHex(linearToRgb(oklabToLinearRgb(lab).map(clamp01)));
}

/* ==================================================================== API */

/**
 * @typedef {object} PlateSpec
 * @property {string} id
 * @property {'demonstration'|'vanishing'|'hidden'|'diagnostic'} plateClass
 * @property {'digits'|'shape'|'path'} figureKind
 * @property {string} figure          what normal vision should read
 * @property {string|null} altFigure  what the deficiency reads (diagnostic/hidden)
 * @property {'protan'|'deutan'|'tritan'|null} targets
 * @property {number} seed
 */

/**
 * Render a plate onto a canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {PlateSpec} spec
 * @param {object} opts
 * @param {number} opts.size          plate diameter in CSS px
 * @param {number} [opts.density]     dot density multiplier
 * @returns {{ dots: number, palette: object }}
 */
export function renderPlate(ctx, spec, { size, density = 1 }) {
  const radius = size / 2;
  const rng = mulberry32(spec.seed);
  const palette = buildPalette(spec, rng);

  const dots = packDisc({
    radius,
    tiers: tiersFor(radius, density),
    gap: radius / 320,
    attempts: 1100,
    rng,
  });

  ctx.save();
  ctx.translate(radius, radius);

  // The plate sits on its own light disc, exactly as a printed plate does on
  // its page — never on the app background, which would tint the surround.
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = palette.field;
  ctx.fill();
  ctx.clip();

  const masks = buildMasks(spec, radius);

  for (const dot of dots) {
    const region = classify(dot, masks);
    const base = palette.regions[region] ?? palette.regions.ground;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
    ctx.fillStyle = jitterHex(pickFrom(base, rng), rng, palette.jitter);
    ctx.fill();
  }

  ctx.restore();
  return { dots: dots.length, palette };
}

function pickFrom(colours, rng) {
  return Array.isArray(colours) ? colours[(rng() * colours.length) | 0] : colours;
}

/* ------------------------------------------------------------- geometry */

function buildMasks(spec, radius) {
  const twoDigit = spec.figureKind === 'digits' && String(spec.figure).length > 1;
  const primary = createMask({
    radius,
    kind: spec.figureKind,
    // Figure HEIGHT as a fraction of the plate diameter. A two-digit string
    // gets a slightly shorter figure so the pair still fits the disc, but
    // nothing like the halving that width-fitting used to cause.
    scale: spec.figureKind !== 'digits' ? 0.52 : twoDigit ? 0.46 : 0.54,
    value: spec.figure,
  });

  // Diagnostic plates carry a second figure. It is offset and scaled slightly
  // so the two glyphs overlap only partially — full overlap would make both
  // unreadable.
  const secondary = spec.altFigure
    ? createMask({
        radius,
        kind: spec.figureKind,
        value: spec.altFigure,
        scale: spec.figureKind === 'digits' ? 0.60 : 0.52,
      })
    : null;

  return { primary, secondary };
}

function classify(dot, { primary, secondary }) {
  const inA = primary.test(dot.x, dot.y);
  const inB = secondary ? secondary.test(dot.x, dot.y) : false;
  if (inA && inB) return 'both';
  if (inA) return 'primary';
  if (inB) return 'secondary';
  return 'ground';
}

/* -------------------------------------------------------------- palettes */

function buildPalette(spec, rng) {
  const type = spec.targets ?? 'deutan';
  const seeds = PLATE_SEEDS[type] ?? PLATE_SEEDS.deutan;
  const seed = seeds[(rng() * seeds.length) | 0];

  switch (spec.plateClass) {
    case 'demonstration':  return demonstrationPalette(rng);
    case 'vanishing':      return vanishingPalette(seed, type);
    default:               return vanishingPalette(seed, type);
  }
}

/**
 * Everyone must read this one. Figure and ground differ in hue AND lightness,
 * deliberately off any confusion line, so it stays legible to every deficiency
 * including full achromatopsia.
 */
function demonstrationPalette(rng) {
  const warm = ['#c4622d', '#b8552b', '#cc7033'];
  const cool = ['#d9cfa8', '#d2c69c', '#e0d6b2'];
  return {
    field: '#efe9d8',
    jitter: jitterFor(),
    regions: {
      primary: warm,
      secondary: warm,
      both: warm,
      ground: cool,
    },
  };
}

/** Normal vision reads the figure; the target deficiency cannot. */
function vanishingPalette(seed, type) {
  const pair = confusionPair(seed, type);
  return {
    field: '#e8e2d4',
    jitter: jitterFor(),
    regions: {
      primary: [pair.a],
      secondary: [pair.a],
      both: [pair.a],
      ground: [pair.b],
    },
    meta: { pair, type, normalDelta: pair.normalDelta },
  };
}

/** Fixed mottle. See the note on JITTER above for why this is not scaled. */
function jitterFor() {
  return { lightness: LIGHTNESS_JITTER, chroma: CHROMA_JITTER };
}

/* ---------------------------------------------------------------- colour */

function shift(hex, dL) {
  const [L, a, b] = hexToOklab(hex);
  return oklabToHexSafe([L + dL, a, b]);
}

function rotateHue(hex, radians) {
  const [L, a, b] = hexToOklab(hex);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return oklabToHexSafe([L, a * cos - b * sin, a * sin + b * cos]);
}

/* =============================================================== the set */

/**
 * Weighted toward single digits, which quantise into dots far more cleanly.
 * The two-digit entries kept are ones whose two glyphs have clearly different
 * silhouettes — '17' and '71' are avoided because a partly-read plate makes
 * them easy to confuse with each other.
 */
const DIGIT_POOL = [
  '2', '3', '5', '6', '7', '8', '9',
  '2', '5', '6', '7',            // repeated: single digits get roughly 2x weight
  '12', '26', '29', '45', '74',
];

/**
 * Build a randomised plate set for one session.
 *
 * Composition mirrors the structure of a clinical screening set rather than its
 * exact contents: one demonstration plate, a majority of vanishing plates split
 * across protan/deutan/tritan, a couple of hidden plates as a guessing check,
 * and a block of diagnostic plates for typing.
 *
 * @param {object} opts
 * @param {number} [opts.count]
 * @param {'digits'|'shape'|'path'} [opts.figureKind]  'shape'/'path' = kids mode
 * @param {string|number} [opts.sessionSeed]
 */
export function buildPlateSet({ count = 12, figureKind = 'digits', sessionSeed = Date.now() } = {}) {
  const rng = mulberry32(typeof sessionSeed === 'string' ? seedFrom(sessionSeed) : sessionSeed >>> 0);
  const pool = figureKind === 'digits' ? DIGIT_POOL : figureKind === 'shape' ? SHAPES : PATH_NAMES;

  /**
   * Twelve plates: one demonstration plus eleven vanishing, weighted equally
   * between protan and deutan with a smaller tritan block.
   *
   * Protan and deutan MUST carry equal weight. Deutan deficiency is commoner,
   * but weighting toward it means a protan misses fewer plates and can land in
   * the inconclusive band while an equally strong deutan is clearly flagged.
   * The set has to be able to fail both types the same way.
   *
   * Tritan gets fewer because congenital tritan defects are genuinely rare; the
   * plates are kept so an acquired blue-yellow change has somewhere to show up.
   */
  const plan = [
    { plateClass: 'demonstration', targets: null,     n: 1 },
    { plateClass: 'vanishing',     targets: 'deutan', n: Math.max(1, Math.round((count - 1) * 0.36)) },
    { plateClass: 'vanishing',     targets: 'protan', n: Math.max(1, Math.round((count - 1) * 0.36)) },
    { plateClass: 'vanishing',     targets: 'tritan', n: Math.max(1, Math.round((count - 1) * 0.28)) },
  ];

  const plates = [];
  for (const step of plan) {
    for (let i = 0; i < step.n; i++) {
      const figure = pool[(rng() * pool.length) | 0];
      plates.push({
        id: `p${plates.length + 1}`,
        plateClass: step.plateClass,
        figureKind,
        figure,
        altFigure: null,
        targets: step.targets,
        seed: (rng() * 0xffffffff) >>> 0,
      });
    }
  }

  // Keep the demonstration plate first; shuffle the rest so class order carries
  // no information the user could learn across attempts.
  const [demo, ...rest] = plates;
  for (let i = rest.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }

  return [demo, ...rest].slice(0, count).map((p, i) => ({ ...p, index: i, id: `p${i + 1}` }));
}

/* ------------------------------------------------------------ validation */

/**
 * Check that a generated palette actually does its job, before a user ever
 * sees it. A plate whose pair is separable to the deficiency it targets, or
 * whose figure can be read from brightness alone, is worse than no plate —
 * it produces a confident wrong answer.
 *
 * @returns {{ ok: boolean, problems: string[], metrics: object }}
 */
export function validatePlate(spec, { minNormalDelta = 0.12, maxCvdDelta = 0.012 } = {}) {
  const rng = mulberry32(spec.seed);
  const palette = buildPalette(spec, rng);
  const problems = [];

  if (spec.plateClass === 'vanishing') {
    const { pair, type } = palette.meta;
    const cvd = separabilityUnder(pair.a, pair.b, type, 1);

    // The mottle must never be large enough to bridge the figure/ground gap,
    // or dots from the two regions would overlap in colour and blur the edge.
    const jitterHeadroom = pair.normalDelta / palette.jitter.lightness;

    if (pair.normalDelta < minNormalDelta) {
      problems.push(`normal-vision separation ${pair.normalDelta.toFixed(3)} too small — figure hard to read for everyone`);
    }
    if (cvd > maxCvdDelta) {
      problems.push(`still separable under ${type} (${cvd.toFixed(3)}) — plate does not hide the figure`);
    }
    if (jitterHeadroom < 3) {
      problems.push(`dot jitter is ${(1 / jitterHeadroom).toFixed(2)}x the figure/ground separation — mottle would bridge the edge`);
    }
    return {
      ok: problems.length === 0,
      problems,
      metrics: {
        normalDelta: pair.normalDelta,
        cvdDelta: cvd,
        luminanceDelta: pair.luminanceDelta,
        jitterHeadroom,
      },
    };
  }

  return { ok: true, problems, metrics: {} };
}
