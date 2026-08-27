/**
 * Fovea — "The Mosaic" hero.
 *
 * A render of the foveal cone mosaic with a figure hidden inside it, and one
 * slider that dissolves the figure by applying a dichromat transform. It is the
 * product explaining itself in a single gesture: drag the slider and you
 * experience the exact thing the colour test measures.
 *
 * The anatomy is real, not decorative:
 *
 *   density      cone diameter grows with eccentricity, so the mosaic is
 *                finest at the centre and coarsens outward — the reason your
 *                sharpest vision is a spot the size of a thumbnail at arm's
 *                length
 *   L:M:S ratio  roughly 63:31:6 in a typical trichromat, which is why we are
 *                so much better at red-green discrimination than blue-yellow
 *   the foveola  the very centre contains NO S-cones at all. The middle of
 *                your sharpest vision is, strictly, colour blind to blue.
 *
 * The figure is carried by hue alone at matched luminance, exactly as on a
 * plate, so it cannot be read from brightness.
 */

import { mulberry32, seedFrom } from '../plate/packing.js';
import { createMask } from '../plate/glyph.js';
import { confusionPair, simulate } from '../color/cvd.js';
import { hexToRgb, rgbToHex } from '../color/convert.js';
import { fitCanvas } from '../core/dom.js';

/** Cone radius in px at eccentricity `d` px from the foveal centre. */
const coneRadius = (d, base) => base * (1 + d / 420);

/** No S-cones inside this radius — the real foveola is tritanopic. */
const FOVEOLA_PX = 90;

const S_CONE_FRACTION = 0.06;
const L_SHARE_OF_REST = 0.67; // L:M ~ 63:31 once S is removed

export function createMosaic(canvas, {
  size = 480,
  figure = '6',
  seed = 'fovea',
  coneBase = 3.1,
} = {}) {
  const ctx = fitCanvas(canvas, size, { alpha: false });
  const rng = mulberry32(seedFrom(seed));
  const radius = size / 2;

  // The figure/ground pair sits on the deutan confusion line, so a deutan
  // observer — and anyone who drags the slider to the far end — cannot see it.
  const pair = confusionPair('#8a5c1a', 'deutan');
  const mask = createMask({ radius, kind: 'digits', value: figure, scale: 0.66 });

  /** @type {{x:number,y:number,r:number,rgb:[number,number,number]}[]} */
  const cones = [];

  // Dart throwing with an eccentricity-dependent radius. A uniform grid would
  // look like graph paper; the real mosaic is quasi-random with local order.
  const cells = new Map();
  const CELL = coneBase * 8;
  const key = (cx, cy) => `${cx},${cy}`;

  const attempts = Math.round(size * size * 0.55);
  for (let i = 0; i < attempts; i++) {
    const theta = rng() * Math.PI * 2;
    const dist = Math.sqrt(rng()) * radius;
    const x = Math.cos(theta) * dist;
    const y = Math.sin(theta) * dist;
    const d = Math.hypot(x, y);
    if (d > radius - 2) continue;

    const r = coneRadius(d, coneBase);
    const gap = r * 0.16;

    // Neighbour check across the 3x3 cell block.
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    let hit = false;
    for (let a = -1; a <= 1 && !hit; a++) {
      for (let b = -1; b <= 1 && !hit; b++) {
        const bucket = cells.get(key(cx + a, cy + b));
        if (!bucket) continue;
        for (const c of bucket) {
          const dx = c.x - x;
          const dy = c.y - y;
          const min = c.r + r + gap;
          if (dx * dx + dy * dy < min * min) { hit = true; break; }
        }
      }
    }
    if (hit) continue;

    const inFigure = mask.test(x, y);
    const cone = { x, y, r, rgb: coneColour(inFigure, d, rng, pair) };
    cones.push(cone);
    const k = key(cx, cy);
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(cone);
  }

  let severity = 0;

  function draw() {
    ctx.fillStyle = '#949494';   // achromatic equivalent of the mosaic luminance
    ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.translate(radius, radius);

    for (const cone of cones) {
      const rgb = severity > 0 ? simulate(cone.rgb, 'deutan', severity) : cone.rgb;
      ctx.beginPath();
      ctx.arc(cone.x, cone.y, cone.r, 0, Math.PI * 2);
      ctx.fillStyle = rgbToHex(rgb);
      ctx.fill();
    }

    ctx.restore();
  }

  draw();

  return {
    cones: cones.length,
    /** @param {number} value 0 = normal trichromat, 1 = full deuteranopia */
    setSeverity(value) {
      severity = Math.max(0, Math.min(1, value));
      draw();
    },
    get severity() { return severity; },
  };
}

/**
 * Assign this cone a colour. Figure and ground take the two ends of the
 * confusion pair; a small fraction become S-cones for texture, but never
 * inside the foveola.
 */
function coneColour(inFigure, eccentricity, rng, pair) {
  const base = hexToRgb(inFigure ? pair.a : pair.b);

  const canBeS = eccentricity > FOVEOLA_PX;
  if (canBeS && rng() < S_CONE_FRACTION) {
    // S-cones read as a cooler speck. Kept at the same lightness so they add
    // texture without giving the figure away.
    return [base[0] * 0.88, base[1] * 0.94, Math.min(1, base[2] * 1.28)];
  }

  // Slight L/M scatter so the mosaic mottles the way a real one does, and so
  // the figure edge is quantised by cells rather than drawn as a clean line.
  const warm = rng() < L_SHARE_OF_REST;
  const k = 0.055;
  return warm
    ? [Math.min(1, base[0] * (1 + k)), base[1] * (1 - k * 0.5), base[2]]
    : [base[0] * (1 - k), Math.min(1, base[1] * (1 + k * 0.5)), base[2]];
}
