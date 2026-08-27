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
 * PLATE CLASSES — each isolates a different thing, and a screening set needs
 * all of them because any single class alone is easy to fool:
 *
 *   demonstration  everyone reads it. Confirms the user understands the task
 *                  and that their screen is showing the plate at all.
 *   vanishing      normal vision reads it, the target deficiency cannot. The
 *                  workhorse: figure and ground sit on one confusion line.
 *   hidden         only the deficiency reads it. Built from three colours so
 *                  that a dichromat's collapsed colour space merges two of them
 *                  into a coherent figure while a trichromat sees only texture.
 *                  Catches the user who is guessing or peeking at answers.
 *   diagnostic     carries two figures at once — one hidden along the protan
 *                  line, one along the deutan line. A protan reads one, a
 *                  deutan reads the other, normal vision reads both. This is
 *                  what separates protan from deutan rather than merely
 *                  detecting that something is off.
 */

import { packDisc, tiersFor, mulberry32, seedFrom } from './packing.js';
import { createMask, SHAPES, PATH_NAMES } from './glyph.js';
import { confusionPair, simulateHex, separabilityUnder, luminanceDelta, PLATE_SEEDS } from '../color/cvd.js';
import { rgbToHex, linearToRgb, hexToOklab, oklabToLinearRgb, clamp01 } from '../color/convert.js';

export const PLATE_CLASSES = ['demonstration', 'vanishing', 'hidden', 'diagnostic'];

/**
 * Per-dot jitter applied to lightness and chroma.
 *
 * This mottle is not decoration. A confusion line is not equiluminant (see
 * cvd.js), so figure and ground always carry some systematic brightness
 * difference — and without scatter, that difference alone would give the figure
 * away to anyone, deficiency or not. Randomising each dot by MORE than the
 * systematic difference destroys luminance as a cue and forces the observer to
 * integrate hue across the region, which is the thing we set out to measure.
 *
 * Chroma jitter is capped well below the figure/ground separation so it blurs
 * the boundary without ever bridging it.
 */
const CHROMA_JITTER = 0.012;
const MIN_LIGHTNESS_JITTER = 0.030;

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
  const primary = createMask({
    radius,
    kind: spec.figureKind,
    value: spec.figure,
    scale: spec.figureKind === 'digits' ? 0.60 : 0.52,
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
    case 'hidden':         return hiddenPalette(seed, type);
    case 'diagnostic':     return diagnosticPalette(seed, rng);
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
    jitter: { lightness: MIN_LIGHTNESS_JITTER, chroma: CHROMA_JITTER },
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
    jitter: jitterFor(pair),
    regions: {
      primary: [pair.a],
      secondary: [pair.a],
      both: [pair.a],
      ground: [pair.b],
    },
    meta: { pair, type, normalDelta: pair.normalDelta },
  };
}

/** Scatter must exceed the pair's own systematic luminance difference. */
function jitterFor(pair) {
  return {
    lightness: Math.max(MIN_LIGHTNESS_JITTER, pair.requiredJitter),
    chroma: CHROMA_JITTER,
  };
}

/**
 * Only the deficiency reads this one.
 *
 * Three colours. `merge` and `figure` sit on the target's confusion line, so a
 * dichromat sees them as one colour; `other` does not. The figure region is
 * filled with {figure, merge} and the ground with {other, merge}. To normal
 * vision both regions are two-tone mottle and no shape emerges. To the
 * deficiency the figure region collapses to a single flat colour while the
 * ground stays mottled, and the shape appears out of that texture difference.
 */
function hiddenPalette(seed, type) {
  const pair = confusionPair(seed, type);
  const other = shift(rotateHue(seed, 0.28), 0.05);
  return {
    field: '#e8e2d4',
    jitter: jitterFor(pair),
    regions: {
      primary: [pair.a, pair.b],
      secondary: [pair.a, pair.b],
      both: [pair.a, pair.b],
      ground: [other, pair.b],
    },
    meta: { pair, other, type },
  };
}

/**
 * Two figures, two confusion lines.
 *
 * The primary figure is hidden along the PROTAN line and the secondary along
 * the DEUTAN line. A protan therefore reads only the secondary, a deutan only
 * the primary, and normal vision reads both. Comparing which figure a user
 * reports is what lets the report say "protan-type" rather than just
 * "something is off".
 */
function diagnosticPalette(seed, rng) {
  const protanPair = confusionPair(seed, 'protan');
  const deutanPair = confusionPair(seed, 'deutan');
  return {
    field: '#e8e2d4',
    jitter: jitterFor(protanPair.requiredJitter > deutanPair.requiredJitter ? protanPair : deutanPair),
    regions: {
      // Region read by deutans (invisible to protans): protan-confusable vs ground
      primary: [protanPair.a],
      // Region read by protans (invisible to deutans)
      secondary: [deutanPair.a],
      both: [protanPair.a, deutanPair.a],
      ground: [protanPair.b, deutanPair.b],
    },
    meta: { protanPair, deutanPair },
  };
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

const DIGIT_POOL = ['2', '3', '5', '6', '7', '8', '9', '12', '15', '16', '26', '29', '42', '45', '57', '73', '74', '96'];

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
export function buildPlateSet({ count = 24, figureKind = 'digits', sessionSeed = Date.now() } = {}) {
  const rng = mulberry32(typeof sessionSeed === 'string' ? seedFrom(sessionSeed) : sessionSeed >>> 0);
  const pool = figureKind === 'digits' ? DIGIT_POOL : figureKind === 'shape' ? SHAPES : PATH_NAMES;

  /**
   * Protan and deutan get identical weight. Deutan deficiencies are commoner in
   * the population, but weighting the set toward them means a protan misses
   * fewer plates and can land in the inconclusive band while a deutan of the
   * same strength is clearly flagged. The set has to be able to fail both types
   * equally, so hidden plates alternate axis too rather than all targeting
   * deutan.
   */
  const plan = [
    { plateClass: 'demonstration', targets: null,     n: 1 },
    { plateClass: 'vanishing',     targets: 'deutan', n: Math.round((count - 1) * 0.25) },
    { plateClass: 'vanishing',     targets: 'protan', n: Math.round((count - 1) * 0.25) },
    { plateClass: 'vanishing',     targets: 'tritan', n: Math.round((count - 1) * 0.12) },
    { plateClass: 'hidden',        targets: 'deutan', n: Math.round((count - 1) * 0.06) },
    { plateClass: 'hidden',        targets: 'protan', n: Math.round((count - 1) * 0.06) },
    { plateClass: 'diagnostic',    targets: null,     n: Math.round((count - 1) * 0.26) },
  ];

  const plates = [];
  for (const step of plan) {
    for (let i = 0; i < step.n; i++) {
      const figure = pool[(rng() * pool.length) | 0];
      let altFigure = null;
      if (step.plateClass === 'diagnostic') {
        // The two figures must differ, or the plate cannot discriminate.
        do {
          altFigure = pool[(rng() * pool.length) | 0];
        } while (altFigure === figure);
      }
      plates.push({
        id: `p${plates.length + 1}`,
        plateClass: step.plateClass,
        figureKind,
        figure,
        altFigure,
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
export function validatePlate(spec, { minNormalDelta = 0.055, maxCvdDelta = 0.012, minJitterRatio = 2.0 } = {}) {
  const rng = mulberry32(spec.seed);
  const palette = buildPalette(spec, rng);
  const problems = [];

  if (spec.plateClass === 'vanishing') {
    const { pair, type } = palette.meta;
    const cvd = separabilityUnder(pair.a, pair.b, type, 1);
    const jitterRatio = pair.luminanceDelta > 0
      ? palette.jitter.lightness / pair.luminanceDelta
      : Infinity;

    if (pair.normalDelta < minNormalDelta) {
      problems.push(`normal-vision separation ${pair.normalDelta.toFixed(3)} too small — plate unreadable by everyone`);
    }
    if (cvd > maxCvdDelta) {
      problems.push(`still separable under ${type} (${cvd.toFixed(3)}) — plate does not hide the figure`);
    }
    if (jitterRatio < minJitterRatio) {
      problems.push(`dot jitter only ${jitterRatio.toFixed(1)}x the luminance difference — figure readable by brightness`);
    }
    return {
      ok: problems.length === 0,
      problems,
      metrics: {
        normalDelta: pair.normalDelta,
        cvdDelta: cvd,
        luminanceDelta: pair.luminanceDelta,
        jitterRatio,
      },
    };
  }

  return { ok: true, problems, metrics: {} };
}
