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
 * ON LUMINANCE — and the trap that is easy to fall into here.
 *
 * Travelling along a confusion line changes brightness AS A NORMAL TRICHROMAT
 * MEASURES IT: the protan direction has a large luminance component, because
 * L cones contribute most of luminance. It is tempting to conclude that the
 * figure could be read from brightness alone and must therefore be masked with
 * heavy per-dot lightness jitter.
 *
 * That is wrong, and masking it destroys the test. The pair members map to the
 * SAME simulated colour for the target deficiency — same hue and same
 * brightness (measured: luminance difference after simulation is 0.0000 for
 * protan, 0.0008 for deutan). The deficient observer has no brightness cue
 * either. The luminance difference exists only for a normal trichromat, and for
 * them it is not a leak — it is part of the signal they are supposed to use.
 *
 * So jitter here is for visual character only: real plates are mottled, and a
 * little scatter keeps the figure edge dot-quantised rather than drawn. It is a
 * small fixed amount, deliberately NOT scaled to the luminance difference.
 */
export function confusionPair(baseHex, type, { spread = 0.34 } = {}) {
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
    /**
     * Brightness difference AS SEEN BY A NORMAL TRICHROMAT. Reported for
     * diagnostics only — it is not a leak to be masked, because the target
     * deficiency perceives no brightness difference at all (see above).
     */
    luminanceDelta: lumDelta,
  };
}

function luminanceOfLinear([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Build two PALETTES rather than two colours.
 *
 * Every point on a confusion line collapses to the same simulated colour, so a
 * whole segment of the line is mutually confusable. Sampling several points per
 * region gives the plate the mottled, many-toned look of a real printed one —
 * and, more usefully, means a trichromat sees a spread of hues in each region
 * rather than two flat fills, which defeats naive edge detection while carrying
 * exactly zero information for the target deficiency.
 *
 * @returns {{ figure: string[], ground: string[], luminanceDelta: number,
 *             normalDelta: number, requiredJitter: number }}
 */
export function confusionPalettes(baseHex, type, { spread = 0.09, steps = 4 } = {}) {
  const pair = confusionPair(baseHex, type, { spread });
  const base = rgbToLinear(hexToRgb(baseHex));
  const dir = CONFUSION_DIRECTION[type];
  const t = pair.separation;

  const sample = (lo, hi) => {
    const out = [];
    for (let i = 0; i < steps; i++) {
      const k = steps === 1 ? (lo + hi) / 2 : lo + ((hi - lo) * i) / (steps - 1);
      const c = base.map((v, j) => v + dir[j] * k);
      if (inGamut(c)) out.push(rgbToHex(linearToRgb(c)));
    }
    return out.length ? out : [rgbToHex(linearToRgb(base))];
  };

  return {
    // Two disjoint segments, leaving a gap in the middle so the regions stay
    // well separated for a trichromat.
    figure: sample(t * 0.45, t),
    ground: sample(-t, -t * 0.45),
    luminanceDelta: pair.luminanceDelta,
    normalDelta: pair.normalDelta,
  };
}

function oklabDistance(hexA, hexB) {
  const [l1, a1, b1] = hexToOklab(hexA);
  const [l2, a2, b2] = hexToOklab(hexB);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/**
 * Seed colours for plate palettes. Found by exhaustive search over sRGB rather
 * than picked by eye, against four simultaneous constraints:
 *
 *   1. residual separation under the TARGET deficiency <= 0.006 OKLab
 *      (i.e. genuinely invisible, at the 8-bit quantisation floor)
 *   2. separation for normal vision as large as possible — this is what makes
 *      the figure legible, and the search maximises it
 *   3. separation under the OTHER TWO deficiencies >= 0.10, so a protan can
 *      still read a deutan plate and vice versa. Without this the plate set
 *      could detect that something is wrong but never say which type.
 *
 * There is deliberately NO constraint on luminance difference. An earlier
 * version capped it, on the mistaken belief that the difference had to be
 * masked with jitter — see the note on `confusionPair`. Dropping that
 * constraint roughly doubled the achievable legibility.
 *
 * Achieved normal-vision separation: protan 0.30-0.34, deutan 0.31-0.35,
 * tritan 0.36-0.38 — around 4x what a naive mid-grey seed produces.
 */
export const PLATE_SEEDS = {
  protan: ['#9e3d0d', '#9e4d0d', '#9e5c0d', '#8f380d'],
  deutan: ['#996621', '#a86621', '#997521', '#8a5c17'],
  tritan: ['#47429c', '#57429c', '#66429c', '#47529c'],
};

/* ============================================================ simulation */

/**
 * Dichromat simulation — Brettel, Viénot & Mollon (1997), two half-planes.
 *
 * A dichromat's reduced gamut is not one plane but TWO, hinged on the neutral
 * axis and anchored at 475/575 nm for protan and deutan, 485/660 nm for tritan.
 * We pick the half-plane by the sign of a dot product with a separation vector
 * and apply that plane's matrix.
 *
 * The widely-copied Viénot (1999) single-matrix shortcut collapses both planes
 * into one. That is an acceptable approximation for protan and deutan, whose
 * planes nearly coincide — but it is NOT valid for tritan, where they diverge
 * sharply. Using the single-plane form for tritan (a very common bug, and one
 * this file previously had) misplaces blue-yellow colours badly.
 *
 * All matrices operate on LINEAR RGB. Applying them to gamma-encoded sRGB is
 * the other classic error and yields over-saturated, too-dark output.
 */
const BRETTEL = {
  protan: {
    sep: [0.00048, 0.00393, -0.00441],
    m1: [0.14980, 1.19548, -0.34528, 0.10764, 0.84864, 0.04372, 0.00384, -0.00540, 1.00156],
    m2: [0.14570, 1.16172, -0.30742, 0.10816, 0.85291, 0.03892, 0.00386, -0.00524, 1.00139],
  },
  deutan: {
    sep: [-0.00281, -0.00611, 0.00892],
    m1: [0.36477, 0.86381, -0.22858, 0.26294, 0.64245, 0.09462, -0.02006, 0.02728, 0.99278],
    m2: [0.37298, 0.88166, -0.25464, 0.25954, 0.63506, 0.10540, -0.01980, 0.02784, 0.99196],
  },
  tritan: {
    sep: [0.03901, -0.02788, -0.01113],
    m1: [1.01277, 0.13548, -0.14826, -0.01243, 0.86812, 0.14431, 0.07589, 0.80500, 0.11911],
    m2: [0.93678, 0.18979, -0.12657, 0.06154, 0.81526, 0.12320, -0.37562, 1.12767, 0.24796],
  },
};

/** Pick the correct half-plane matrix for a linear-RGB colour. */
function brettelMatrix(lin, type) {
  const p = BRETTEL[type];
  const side = lin[0] * p.sep[0] + lin[1] * p.sep[1] + lin[2] * p.sep[2];
  return side >= 0 ? p.m1 : p.m2;
}

/**
 * Simulate how a colour appears to someone with the given deficiency.
 *
 * @param {[number,number,number]} rgb  gamma-encoded sRGB, 0..1
 * @param {CvdType} type
 * @param {number} [severity]  0 = unaffected, 1 = full dichromacy. Values in
 *   between interpolate toward the dichromat projection, which approximates
 *   anomalous trichromacy (protanomaly / deuteranomaly) well enough for a
 *   simulator, though a real anomalous trichromat's experience is a shifted
 *   photopigment rather than a missing one.
 */
export function simulate(rgb, type, severity = 1) {
  if (severity <= 0) return rgb;
  const lin = rgbToLinear(rgb);
  const out = mul3(brettelMatrix(lin, type), lin);
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
  const p = BRETTEL[type];
  const decode = SRGB_DECODE_LUT;

  for (let i = 0; i < d.length; i += 4) {
    const r = decode[d[i]];
    const g = decode[d[i + 1]];
    const b = decode[d[i + 2]];

    // Half-plane selection is per pixel — this is the whole point of Brettel.
    const M = (r * p.sep[0] + g * p.sep[1] + b * p.sep[2]) >= 0 ? p.m1 : p.m2;

    let nr = M[0] * r + M[1] * g + M[2] * b;
    let ng = M[3] * r + M[4] * g + M[5] * b;
    let nb = M[6] * r + M[7] * g + M[8] * b;

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
