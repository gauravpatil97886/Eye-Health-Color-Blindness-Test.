/**
 * Fovea — colour vision deficiency: confusion lines and simulation.
 *
 * This module is the reason the plate test works at all.
 *
 * A dichromat is missing one cone class, which collapses their colour space
 * from three dimensions to two. Every colour that projects onto the same point
 * in that reduced space looks identical to them. In the CIE 1931 xy plane those
 * sets of colours fall along straight lines that all radiate from a single
 * point — the COPUNCTAL POINT — which is the chromaticity of the missing cone's
 * fundamental. Pick two colours on one such line and you have a pair that a
 * normal trichromat separates easily and that dichromat cannot separate at all.
 *
 * That is precisely how a pseudoisochromatic plate hides a figure: the figure
 * dots and the background dots sit on a shared confusion line.
 *
 * Copunctal points below are Smith & Pokorny (1975) cone fundamentals in
 * CIE 1931 xy. The deutan and tritan points lie outside the spectrum locus —
 * they are imaginary chromaticities, which is expected and correct.
 */

import {
  hexToRgb, rgbToHex, rgbToLinear, linearToRgb,
  linearRgbToXyz, xyzToLinearRgb, xyzToXy, xyToXyz,
  inGamut, relativeLuminance, mul3, hexToOklab,
} from './convert.js';

/** @typedef {'protan'|'deutan'|'tritan'} CvdType */

export const COPUNCTAL = {
  protan: { x: 0.74550, y:  0.25450 },
  deutan: { x: 1.40000, y: -0.40000 },
  tritan: { x: 0.17045, y:  0.00000 },
};

export const CVD_TYPES = /** @type {CvdType[]} */ (['protan', 'deutan', 'tritan']);

export const CVD_LABELS = {
  protan: { short: 'Protan', long: 'Red-weak (protan-type)',  cone: 'L-cone (long wavelength)' },
  deutan: { short: 'Deutan', long: 'Green-weak (deutan-type)', cone: 'M-cone (medium wavelength)' },
  tritan: { short: 'Tritan', long: 'Blue-yellow (tritan-type)', cone: 'S-cone (short wavelength)' },
};

/* ================================================================== lines */

/**
 * Walk along the confusion line through `base` for a given deficiency and
 * return the chromaticity at parameter `t`.
 *
 * t = 0 is the base chromaticity; positive t moves away from the copunctal
 * point, negative t moves toward it. The step is normalised by the distance to
 * the copunctal point so `t` behaves consistently across the three types even
 * though their copunctal points sit at wildly different distances.
 */
export function alongConfusionLine([x, y], type, t) {
  const c = COPUNCTAL[type];
  const dx = x - c.x;
  const dy = y - c.y;
  return [x + dx * t, y + dy * t];
}

/**
 * The exact confusion directions, derived from the simulation model itself.
 *
 * Viénot simulation is a linear map in linear RGB:  S = Mlms2rgb . P . Mrgb2lms
 * where P zeroes the missing cone's axis. S therefore has rank 2, and its null
 * space is one-dimensional. Any two colours differing by a vector in that null
 * space map to the SAME simulated colour — which is the precise definition of
 * a confusion pair.
 *
 * Because P zeroes exactly one LMS axis, the null direction in linear RGB is
 * simply the corresponding column of the LMS->RGB matrix. No search, no
 * approximation, and — crucially — guaranteed consistent with the simulator we
 * validate against. (Deriving the line from published copunctal points instead
 * leaves a residual mismatch, because those points come from a different set of
 * cone fundamentals than the simulation matrices.)
 */
export const CONFUSION_DIRECTION = {
  protan: normalise([ 0.0809444479, -0.0102485335, -0.0003652968]),
  deutan: normalise([-0.1305044090,  0.0540193266, -0.0041216147]),
  tritan: normalise([ 0.1167721270, -0.1136147080,  0.6935114310]),
};

function normalise(v) {
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
}

/**
 * Build a pair of colours that a given deficiency cannot tell apart.
 *
 * ON LUMINANCE — the subtle part, and the part naive generators get wrong.
 *
 * A confusion direction is NOT equiluminant, and it cannot be made so: the
 * confusion line is one-dimensional and the equiluminant plane is
 * two-dimensional, so in general they meet at a single point. A protanope is
 * missing L cones, and L cones contribute to luminance, so travelling along a
 * protan confusion line necessarily changes brightness for a normal observer.
 *
 * Real plates resolve this exactly the way we do: not by forcing equal
 * luminance, but by scattering each dot's lightness randomly by MORE than the
 * systematic figure/ground difference. Luminance then carries no reliable
 * signal about where the figure is, which is what "pseudoisochromatic" —
 * falsely of the same colour — actually means. `requiredJitter` below reports
 * how much scatter this particular pair needs.
 */
export function confusionPair(baseHex, type, { spread = 0.09 } = {}) {
  const base = rgbToLinear(hexToRgb(baseHex));
  const dir = CONFUSION_DIRECTION[type];

  // Walk symmetrically outward, shrinking until both ends are inside sRGB.
  let t = spread;
  let a = null;
  let b = null;
  for (let i = 0; i < 48 && t > 0.002; i++) {
    const pa = base.map((v, k) => v + dir[k] * t);
    const pb = base.map((v, k) => v - dir[k] * t);
    if (inGamut(pa) && inGamut(pb)) { a = pa; b = pb; break; }
    t *= 0.92;
  }
  if (!a) { a = base; b = base; t = 0; }

  const hexA = rgbToHex(linearToRgb(a));
  const hexB = rgbToHex(linearToRgb(b));
  const lumDelta = Math.abs(luminanceOfLinear(a) - luminanceOfLinear(b));

  return {
    a: hexA,
    b: hexB,
    separation: t,
    /** How different the pair looks to NORMAL vision (higher = easier plate). */
    normalDelta: oklabDistance(hexA, hexB),
    /** Systematic brightness difference the dot jitter has to bury. */
    luminanceDelta: lumDelta,
    /** Per-dot lightness scatter needed so luminance stops being a cue. */
    requiredJitter: lumDelta * 2.5,
  };
}

function luminanceOfLinear([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function oklabDistance(hexA, hexB) {
  const [l1, a1, b1] = hexToOklab(hexA);
  const [l2, a2, b2] = hexToOklab(hexB);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/**
 * Seed colours that produce well-separated, in-gamut confusion pairs. Chosen by
 * search (see test/cvd.test.js) rather than by eye — the constraint is that the
 * pair must stay inside sRGB at equal luminance while remaining far apart in
 * OKLab for a normal trichromat.
 */
export const PLATE_SEEDS = {
  protan: ['#8c7a5e', '#9a7f66', '#7d7458', '#94806b'],
  deutan: ['#8d6f62', '#8a7458', '#96745f', '#7f6f5c'],
  tritan: ['#7f7a6a', '#8a7d63', '#78766b', '#877b6d'],
};

/* ============================================================ simulation */

/**
 * Viénot, Brettel & Mollon (1999) dichromat simulation.
 *
 * The dichromat's reduced colour space is a half-plane in LMS bounded by the
 * neutral axis. Simulation projects the stimulus onto that plane along the
 * axis of the missing cone. These are the standard single-plane matrices,
 * applied in LINEAR RGB — running them on gamma-encoded values (a very common
 * bug) produces noticeably wrong, over-saturated output.
 */
const VIENOT_LMS = {
  protan: [
    0.0,      2.02344, -2.52581,
    0.0,      1.0,      0.0,
    0.0,      0.0,      1.0,
  ],
  deutan: [
    1.0,      0.0,      0.0,
    0.494207, 0.0,      1.24827,
    0.0,      0.0,      1.0,
  ],
  tritan: [
    1.0,      0.0,      0.0,
    0.0,      1.0,      0.0,
   -0.395913, 0.801109, 0.0,
  ],
};

/** Linear sRGB -> LMS (Viénot et al. formulation). */
const RGB_TO_LMS_V = [
  17.8824,   43.5161,   4.11935,
   3.45565,  27.1554,   3.86714,
   0.0299566, 0.184309, 1.46709,
];

const LMS_TO_RGB_V = [
   0.0809444479, -0.1305044090,  0.1167721270,
  -0.0102485335,  0.0540193266, -0.1136147080,
  -0.0003652968, -0.0041216147,  0.6935114310,
];

/**
 * Simulate how a colour appears to someone with the given deficiency.
 *
 * @param {[number,number,number]} rgb  gamma-encoded sRGB, 0..1
 * @param {CvdType} type
 * @param {number} [severity]  0 = unaffected, 1 = full dichromacy. Values in
 *   between linearly interpolate, which approximates anomalous trichromacy
 *   (protanomaly / deuteranomaly / tritanomaly) well enough for a simulator.
 */
export function simulate(rgb, type, severity = 1) {
  if (severity <= 0) return rgb;
  const lin = rgbToLinear(rgb);
  const lms = mul3(RGB_TO_LMS_V, lin);
  const projected = mul3(VIENOT_LMS[type], lms);
  const out = mul3(LMS_TO_RGB_V, projected);
  const mixed = severity >= 1
    ? out
    : out.map((v, i) => lin[i] * (1 - severity) + v * severity);
  return linearToRgb(mixed);
}

export function simulateHex(hex, type, severity = 1) {
  return rgbToHex(simulate(hexToRgb(hex), type, severity));
}

/**
 * Apply a simulation across an ImageData buffer in place.
 * Used by the simulator screen; runs over a few million pixels, so the inner
 * loop is deliberately allocation-free.
 */
export function simulateImageData(imageData, type, severity = 1) {
  const d = imageData.data;
  const M = VIENOT_LMS[type];
  const A = RGB_TO_LMS_V;
  const B = LMS_TO_RGB_V;

  // 8-bit sRGB decode is only 256 distinct values — precompute it.
  const decode = SRGB_DECODE_LUT;

  for (let i = 0; i < d.length; i += 4) {
    const r = decode[d[i]];
    const g = decode[d[i + 1]];
    const b = decode[d[i + 2]];

    const l = A[0] * r + A[1] * g + A[2] * b;
    const m = A[3] * r + A[4] * g + A[5] * b;
    const s = A[6] * r + A[7] * g + A[8] * b;

    const l2 = M[0] * l + M[1] * m + M[2] * s;
    const m2 = M[3] * l + M[4] * m + M[5] * s;
    const s2 = M[6] * l + M[7] * m + M[8] * s;

    let nr = B[0] * l2 + B[1] * m2 + B[2] * s2;
    let ng = B[3] * l2 + B[4] * m2 + B[5] * s2;
    let nb = B[6] * l2 + B[7] * m2 + B[8] * s2;

    if (severity < 1) {
      nr = r + (nr - r) * severity;
      ng = g + (ng - g) * severity;
      nb = b + (nb - b) * severity;
    }

    d[i]     = encodeSrgb(nr);
    d[i + 1] = encodeSrgb(ng);
    d[i + 2] = encodeSrgb(nb);
    // alpha untouched
  }
  return imageData;
}

const SRGB_DECODE_LUT = (() => {
  const lut = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    lut[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }
  return lut;
})();

function encodeSrgb(v) {
  if (v <= 0) return 0;
  if (v >= 1) return 255;
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return (s * 255 + 0.5) | 0;
}

/** Full-on achromatopsia — no cone-based colour at all. */
export function simulateAchromatopsia(rgb, severity = 1) {
  const lin = rgbToLinear(rgb);
  const y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  const grey = [y, y, y];
  const mixed = severity >= 1 ? grey : lin.map((v, i) => v * (1 - severity) + grey[i] * severity);
  return linearToRgb(mixed);
}

/**
 * How separable is this pair for a given deficiency? Near zero means the pair
 * is genuinely confusable — which is what a plate needs. Used to validate every
 * generated palette before it is shown to a user.
 */
export function separabilityUnder(hexA, hexB, type, severity = 1) {
  const simA = rgbToHex(simulate(hexToRgb(hexA), type, severity));
  const simB = rgbToHex(simulate(hexToRgb(hexB), type, severity));
  return oklabDistance(simA, simB);
}

/** Luminance difference between a pair — must stay near zero on a valid plate. */
export function luminanceDelta(hexA, hexB) {
  return Math.abs(relativeLuminance(hexToRgb(hexA)) - relativeLuminance(hexToRgb(hexB)));
}
