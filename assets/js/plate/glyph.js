/**
 * Fovea — glyph masks for plate figures.
 *
 * A mask is just "is this point inside the figure?". We render the figure once
 * into an offscreen canvas and sample its alpha channel, which lets digits,
 * geometric shapes and winding paths all share one code path.
 *
 * Three figure kinds, matching the editions of the real test:
 *   digits — the familiar numerals, for anyone who can read
 *   shape  — circle/square/triangle/star, for young children (pre-literate)
 *   path   — a winding line the user traces, for children who cannot name shapes
 */

const OVERSAMPLE = 2; // mask resolution multiplier; costs memory, buys a cleaner edge

function makeCanvas(size) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(size, size);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

/**
 * @param {object} opts
 * @param {number} opts.radius  plate radius in px (mask spans [-r, r])
 * @param {'digits'|'shape'|'path'} opts.kind
 * @param {string} opts.value   "74" | "circle" | a path preset name
 * @param {number} [opts.scale] figure size as a fraction of plate diameter
 * @returns {{ test(x:number, y:number): boolean, kind: string, value: string }}
 */
export function createMask({ radius, kind, value, scale = 0.62 }) {
  const size = Math.ceil(radius * 2 * OVERSAMPLE);
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';

  const span = radius * 2 * OVERSAMPLE * scale;

  if (kind === 'digits') drawDigits(ctx, String(value), span);
  else if (kind === 'shape') drawShape(ctx, value, span);
  else if (kind === 'path') drawPath(ctx, value, radius * OVERSAMPLE);

  ctx.restore();

  const { data } = ctx.getImageData(0, 0, size, size);
  const half = size / 2;

  return {
    kind,
    value: String(value),
    /** x, y are plate-space coordinates centred on 0. */
    test(x, y) {
      const px = Math.round(x * OVERSAMPLE + half);
      const py = Math.round(y * OVERSAMPLE + half);
      if (px < 0 || py < 0 || px >= size || py >= size) return false;
      return data[(py * size + px) * 4 + 3] > 128; // alpha
    },
  };
}

/**
 * Numerals are drawn with a heavy geometric face and tracked apart slightly —
 * the figure has to survive being chopped into dots, so thin strokes and tight
 * spacing both read as noise.
 */
function drawDigits(ctx, text, span) {
  const stack = '"Archivo Black", "Arial Black", Impact, system-ui, sans-serif';
  let fontSize = span;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Shrink until the whole string fits the target span.
  for (let i = 0; i < 24; i++) {
    ctx.font = `900 ${fontSize}px ${stack}`;
    const w = ctx.measureText(text).width;
    if (w <= span) break;
    fontSize *= span / w * 0.98;
  }

  ctx.font = `900 ${fontSize}px ${stack}`;
  // Optical centring: cap-height glyphs sit high of the em box midpoint.
  const m = ctx.measureText(text);
  const capMid = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  ctx.fillText(text, 0, capMid);
}

function drawShape(ctx, name, span) {
  const r = span / 2;
  ctx.beginPath();
  switch (name) {
    case 'circle':
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      break;
    case 'square':
      ctx.rect(-r * 0.86, -r * 0.86, r * 1.72, r * 1.72);
      break;
    case 'triangle':
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.92, r * 0.72);
      ctx.lineTo(-r * 0.92, r * 0.72);
      ctx.closePath();
      break;
    case 'star':
      polygon(ctx, 5, r, r * 0.45, -Math.PI / 2);
      break;
    case 'heart':
      heart(ctx, r);
      break;
    case 'cross':
      ctx.rect(-r * 0.3, -r, r * 0.6, r * 2);
      ctx.rect(-r, -r * 0.3, r * 2, r * 0.6);
      break;
    default:
      ctx.arc(0, 0, r, 0, Math.PI * 2);
  }
  ctx.fill();
}

function polygon(ctx, points, outer, inner, rotation) {
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? outer : inner;
    const a = rotation + (i * Math.PI) / points;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function heart(ctx, r) {
  const s = r / 16;
  ctx.moveTo(0, 14 * s);
  ctx.bezierCurveTo(-18 * s, 1 * s, -10 * s, -14 * s, 0, -5 * s);
  ctx.bezierCurveTo(10 * s, -14 * s, 18 * s, 1 * s, 0, 14 * s);
  ctx.closePath();
}

/**
 * Winding lines for the tracing plates. Each preset is a cubic through the
 * plate, stroked thick enough to survive dot quantisation.
 */
const PATHS = {
  wave: (r) => [[-0.78 * r, 0], [-0.3 * r, -0.55 * r], [0.3 * r, 0.55 * r], [0.78 * r, 0]],
  arc:  (r) => [[-0.75 * r, 0.35 * r], [-0.35 * r, -0.7 * r], [0.35 * r, -0.7 * r], [0.75 * r, 0.35 * r]],
  ess:  (r) => [[-0.6 * r, 0.7 * r], [0.7 * r, 0.25 * r], [-0.7 * r, -0.25 * r], [0.6 * r, -0.7 * r]],
};

function drawPath(ctx, name, r) {
  const pts = (PATHS[name] ?? PATHS.wave)(r);
  ctx.lineWidth = r * 0.17;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  ctx.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
  ctx.stroke();
}

export const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'cross'];
export const PATH_NAMES = Object.keys(PATHS);
