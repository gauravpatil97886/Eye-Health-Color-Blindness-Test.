/**
 * Fovea — colour space primitives.
 *
 * Every colour operation in the app has to happen in LINEAR light. Blending,
 * simulating a colour vision deficiency, or computing a contrast ratio directly
 * on 0-255 sRGB values is wrong, and wrong in a way that quietly biases a
 * vision test. So: decode once at the boundary, work linear, encode on the way
 * out.
 *
 * All matrices assume sRGB primaries and a D65 white point.
 */

/* ------------------------------------------------------------------ sRGB */

/** sRGB electro-optical transfer function. Input/output 0..1. */
export function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(c) {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return clamp01(v);
}

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** "#rrggbb" | "#rgb" -> [r, g, b] in 0..1 gamma-encoded sRGB. */
export function hexToRgb(hex) {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbToHex([r, g, b]) {
  const to = (v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export const rgbToLinear = (rgb) => rgb.map(srgbToLinear);
export const linearToRgb = (lin) => lin.map(linearToSrgb);

/* ------------------------------------------------------------- matrices */

export function mul3(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** Linear sRGB (D65) -> CIE XYZ. */
export const RGB_TO_XYZ = [
  0.4124564, 0.3575761, 0.1804375,
  0.2126729, 0.7151522, 0.0721750,
  0.0193339, 0.1191920, 0.9503041,
];

export const XYZ_TO_RGB = [
   3.2404542, -1.5371385, -0.4985314,
  -0.9692660,  1.8760108,  0.0415560,
   0.0556434, -0.2040259,  1.0572252,
];

/** CIE XYZ -> LMS cone responses (Hunt-Pointer-Estevez, D65 normalised). */
export const XYZ_TO_LMS = [
   0.4002, 0.7076, -0.0808,
  -0.2263, 1.1653,  0.0457,
   0.0000, 0.0000,  0.9182,
];

export const LMS_TO_XYZ = [
  1.8600666, -1.1294801, 0.2198983,
  0.3612229,  0.6388043, -0.0000007,
  0.0000000,  0.0000000, 1.0890873,
];

export const linearRgbToXyz = (lin) => mul3(RGB_TO_XYZ, lin);
export const xyzToLinearRgb = (xyz) => mul3(XYZ_TO_RGB, xyz);
export const xyzToLms = (xyz) => mul3(XYZ_TO_LMS, xyz);
export const lmsToXyz = (lms) => mul3(LMS_TO_XYZ, lms);

/* ------------------------------------------------------- chromaticity */

/** CIE xy chromaticity — the plane confusion lines are defined in. */
export function xyzToXy([X, Y, Z]) {
  const sum = X + Y + Z;
  if (sum === 0) return [0, 0];
  return [X / sum, Y / sum];
}

/** Back to XYZ at a chosen luminance Y. */
export function xyToXyz([x, y], Y = 1) {
  if (y === 0) return [0, 0, 0];
  return [(x * Y) / y, Y, ((1 - x - y) * Y) / y];
}

export const hexToXy = (hex) => xyzToXy(linearRgbToXyz(rgbToLinear(hexToRgb(hex))));

/* ------------------------------------------------------------ contrast */

/** WCAG relative luminance. */
export function relativeLuminance(rgb) {
  const [r, g, b] = rgbToLinear(rgb);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio, 1..21. */
export function contrastRatio(hexA, hexB) {
  const a = relativeLuminance(hexToRgb(hexA));
  const b = relativeLuminance(hexToRgb(hexB));
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/* ---------------------------------------------------------------- CIELAB */

const WHITE_D65 = [0.95047, 1.0, 1.08883];

export function xyzToLab([X, Y, Z]) {
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(X / WHITE_D65[0]);
  const fy = f(Y / WHITE_D65[1]);
  const fz = f(Z / WHITE_D65[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export const hexToLab = (hex) => xyzToLab(linearRgbToXyz(rgbToLinear(hexToRgb(hex))));

/** CIE76 colour difference — good enough for ranking plate palette candidates. */
export function deltaE76(labA, labB) {
  return Math.hypot(labA[0] - labB[0], labA[1] - labB[1], labA[2] - labB[2]);
}

/* ----------------------------------------------------------------- OKLab */

/** Perceptually uniform lightness — used to hold plate dots at equal L*. */
export function linearRgbToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

export function oklabToLinearRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

export const hexToOklab = (hex) => linearRgbToOklab(rgbToLinear(hexToRgb(hex)));
export const oklabToHex = (lab) => rgbToHex(linearToRgb(oklabToLinearRgb(lab)));

/** True when a linear RGB triple is displayable without clipping. */
export const inGamut = ([r, g, b], eps = 1e-4) =>
  r >= -eps && g >= -eps && b >= -eps && r <= 1 + eps && g <= 1 + eps && b <= 1 + eps;
