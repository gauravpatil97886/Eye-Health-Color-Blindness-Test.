/**
 * Fovea — screen calibration and optotype geometry.
 *
 * A browser has no idea how physically large its pixels are or how far away the
 * viewer is sitting, and without both numbers an acuity test is meaningless.
 * We recover them the only way a web page can:
 *
 *   px-per-mm         the user drags an on-screen rectangle until it matches a
 *                     real object of known size held against the display
 *   viewing distance  the user tells us, guided by presets and a pacing aid
 *
 * Everything downstream — optotype size, grating frequency, Amsler grid pitch,
 * blind-spot geometry — is derived from these two values.
 */

/* --------------------------------------------------- reference objects */

/**
 * Objects a user is likely to have within reach. ID-1 is the ISO/IEC 7810 bank
 * card standard and is identical worldwide, which makes it the default.
 */
export const REFERENCE_OBJECTS = [
  { id: 'card',    label: 'Bank / ID card',   widthMm: 85.60, heightMm: 53.98,
    hint: 'Any debit, credit, Aadhaar or PAN card — they are all the same size.' },
  { id: 'inr500',  label: '₹500 note',        widthMm: 150.0, heightMm: 66.0,
    hint: 'Hold the note flat against the screen, long edge horizontal.' },
  { id: 'inr100',  label: '₹100 note',        widthMm: 142.0, heightMm: 66.0,
    hint: 'The newer lavender ₹100 note.' },
  { id: 'cd',      label: 'CD / DVD',         widthMm: 120.0, heightMm: 120.0,
    hint: 'Match the outer edge of the disc.' },
  { id: 'a4',      label: 'A4 paper (width)', widthMm: 210.0, heightMm: 297.0,
    hint: 'Only works on a large screen — match the short edge.' },
];

/** Rough fallback when the user skips calibration entirely. */
export const NOMINAL_PX_PER_MM = 96 / 25.4; // the CSS reference pixel, ~3.7795

/* --------------------------------------------------------- unit helpers */

const ARCMIN_TO_RAD = Math.PI / (180 * 60);

export const mmToPx = (mm, pxPerMm) => mm * pxPerMm;
export const pxToMm = (px, pxPerMm) => px / pxPerMm;

/** Physical size subtended by an angle at a distance (exact, not small-angle). */
export function angleToMm(arcmin, distanceMm) {
  return 2 * distanceMm * Math.tan((arcmin * ARCMIN_TO_RAD) / 2);
}

export function mmToAngle(mm, distanceMm) {
  return (2 * Math.atan(mm / (2 * distanceMm))) / ARCMIN_TO_RAD;
}

/* ------------------------------------------------------------- acuity */

/**
 * Acuity is expressed internally as MAR — the minimum angle of resolution in
 * arcminutes, i.e. the angular width of one stroke of the optotype.
 *
 *   MAR 1.0  = 6/6  = 20/20 = logMAR 0.00   (reference "normal" acuity)
 *   MAR 2.0  = 6/12 = 20/40 = logMAR 0.30
 *
 * A Snellen optotype is 5 strokes tall, so the letter subtends 5 x MAR.
 */
export const marToLogMar = (mar) => Math.log10(mar);
export const logMarToMar = (logMar) => 10 ** logMar;

/** 6/x metric notation (Indian/UK convention). */
export const marToSnellen6 = (mar) => 6 * mar;
/** 20/y imperial notation (US convention). */
export const marToSnellen20 = (mar) => 20 * mar;

export function formatAcuity(mar, notation = 'metric') {
  if (notation === 'logmar') return marToLogMar(mar).toFixed(2);
  if (notation === 'imperial') return `20/${snap(marToSnellen20(mar), SNELLEN_20_LINES)}`;
  return `6/${snap(marToSnellen6(mar), SNELLEN_6_LINES)}`;
}

/**
 * The printed denominators on a real chart. Each notation has its own ladder —
 * 6/12 and 20/40 are the same acuity, but 20/38 is not a line that exists, so
 * the two cannot share one table.
 */
const SNELLEN_6_LINES  = [3, 3.8, 4.8, 6, 7.5, 9.5, 12, 15, 19, 24, 30, 38, 48, 60, 75, 95, 120];
const SNELLEN_20_LINES = [10, 12.5, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400];

/** Nearest chart line in log space, since the ladder is geometric, not linear. */
function snap(value, lines) {
  let best = lines[0];
  for (const l of lines) {
    if (Math.abs(Math.log10(l) - Math.log10(value)) < Math.abs(Math.log10(best) - Math.log10(value))) {
      best = l;
    }
  }
  return best % 1 === 0 ? String(best) : best.toFixed(1);
}

/** The standard logMAR chart progression: 0.1 log units per line. */
export const LOGMAR_LINES = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0, -0.1, -0.2];

/** On-screen height in px of an optotype at a given acuity. */
export function optotypeHeightPx(mar, { pxPerMm, viewingDistanceMm }) {
  return mmToPx(angleToMm(mar * 5, viewingDistanceMm), pxPerMm);
}

/** Stroke width — the limb of an E, the gap of a Landolt C. */
export function strokeWidthPx(mar, cal) {
  return optotypeHeightPx(mar, cal) / 5;
}

/* ------------------------------------------------- the resolution limit */

/**
 * The honest constraint most online eye tests ignore.
 *
 * At a normal laptop distance a 6/6 optotype is under a millimetre tall, so its
 * stroke lands on well under one physical pixel. The screen literally cannot
 * draw it, and any "6/6" the site reports is measuring the anti-aliaser, not
 * the eye. We compute the real floor and make the UI move the user back until
 * the target acuity is actually renderable.
 *
 * @param {number} [minStrokePx] physical pixels needed per stroke to render honestly
 */
export function finestRenderableMar({ pxPerMm, viewingDistanceMm }, minStrokePx = 1.5) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const physicalPxPerMm = pxPerMm * dpr;
  const strokeMm = minStrokePx / physicalPxPerMm;
  return mmToAngle(strokeMm, viewingDistanceMm);
}

/** How far back must they sit for `targetMar` to be renderable? */
export function requiredDistanceMm(targetMar, pxPerMm, minStrokePx = 1.5) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const strokeMm = minStrokePx / (pxPerMm * dpr);
  return strokeMm / (2 * Math.tan((targetMar * ARCMIN_TO_RAD) / 2));
}

/**
 * Summarises whether the current setup can support a real acuity test.
 * The UI turns this straight into a sentence.
 */
export function acuityCapability(cal) {
  const finest = finestRenderableMar(cal);
  const canReach66 = finest <= 1.0;
  return {
    finestMar: finest,
    finestLabel: formatAcuity(finest),
    canReach66,
    distanceFor66Mm: requiredDistanceMm(1.0, cal.pxPerMm),
  };
}

/* --------------------------------------------------------- near vision */

/** N-notation is print size in typographic points. 1 pt = 1/72 inch. */
export const POINT_MM = 25.4 / 72;
export const NEAR_STANDARD_DISTANCE_MM = 400; // 40 cm, the clinical reading distance

/** N-size print scaled to the actual reading distance the user set. */
export function nSizeHeightPx(nPoints, { pxPerMm, nearDistanceMm = NEAR_STANDARD_DISTANCE_MM }) {
  const mmAtStandard = nPoints * POINT_MM;
  const angle = mmToAngle(mmAtStandard, NEAR_STANDARD_DISTANCE_MM);
  return mmToPx(angleToMm(angle, nearDistanceMm), pxPerMm);
}

export const N_SIZES = [48, 36, 24, 18, 14, 12, 10, 8, 6, 5, 4];

/* -------------------------------------------------------- distance aids */

export const DISTANCE_PRESETS = [
  { id: 'near',    label: '40 cm — reading distance', mm: 400,
    hint: 'About the distance you hold a book.' },
  { id: 'desk',    label: '60 cm — arm’s length',     mm: 600,
    hint: 'Normal laptop or desktop viewing distance.' },
  { id: 'mid',     label: '1 metre',                  mm: 1000,
    hint: 'One long stride back from the screen.' },
  { id: 'far2',    label: '2 metres',                 mm: 2000,
    hint: 'Recommended for a phone or tablet held by someone else.' },
  { id: 'far3',    label: '3 metres',                 mm: 3000,
    hint: 'Best accuracy on a laptop or monitor.' },
];

/**
 * Browser zoom silently rescales every CSS pixel and would invalidate a stored
 * calibration. We cannot read the zoom level directly, but the ratio of the
 * outer window width to the inner viewport width tracks it closely enough to
 * warn on.
 */
export function detectZoom() {
  const ratio = window.devicePixelRatio || 1;
  const viewport = window.visualViewport;
  const scale = viewport ? viewport.scale : 1;
  // Only meaningful on desktop; mobile pinch-zoom reports via visualViewport.scale
  const likelyZoomed = Math.abs(scale - 1) > 0.02;
  return { devicePixelRatio: ratio, pageScale: scale, likelyZoomed };
}

/* ------------------------------------------------------------ validity */

/** Everything a test module needs to decide whether it can run honestly. */
export function calibrationStatus(cal) {
  if (!cal?.pxPerMm) {
    return { ok: false, reason: 'not-calibrated',
             message: 'Screen size has not been calibrated yet.' };
  }
  if (!cal.viewingDistanceMm) {
    return { ok: false, reason: 'no-distance',
             message: 'Viewing distance has not been set.' };
  }
  const plausible = cal.pxPerMm > 1.5 && cal.pxPerMm < 30;
  if (!plausible) {
    return { ok: false, reason: 'implausible',
             message: 'The saved calibration looks wrong. Please calibrate again.' };
  }
  return { ok: true, ...acuityCapability(cal) };
}
