/**
 * Fovea — dot packing for Ishihara-style plates.
 *
 * Real Ishihara plates are a dense mosaic of non-overlapping circles of mixed
 * radii. We reproduce that with tiered dart throwing: try the biggest radius
 * first and fall back through smaller tiers, so large dots dominate the open
 * field and small dots fill the gaps. A uniform spatial hash keeps the overlap
 * test O(1) per dart instead of O(n).
 *
 * The figure/ground edge is never drawn explicitly — it emerges because each
 * dot is classified by the glyph mask after packing. That dot-quantised edge is
 * exactly what makes a plate readable by hue alone and not by shape.
 */

/** Deterministic PRNG so a seed reproduces a plate exactly. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

class SpatialHash {
  constructor(cell) {
    this.cell = cell;
    this.buckets = new Map();
  }

  _key(cx, cy) {
    return cx * 73856093 ^ cy * 19349663;
  }

  insert(dot) {
    const cx = Math.floor(dot.x / this.cell);
    const cy = Math.floor(dot.y / this.cell);
    const k = this._key(cx, cy);
    let bucket = this.buckets.get(k);
    if (!bucket) this.buckets.set(k, (bucket = []));
    bucket.push(dot);
  }

  /** Any existing dot closer than (r + other.r + gap)? */
  collides(x, y, r, gap) {
    const reach = r + this.cell + gap;
    const minX = Math.floor((x - reach) / this.cell);
    const maxX = Math.floor((x + reach) / this.cell);
    const minY = Math.floor((y - reach) / this.cell);
    const maxY = Math.floor((y + reach) / this.cell);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const bucket = this.buckets.get(this._key(cx, cy));
        if (!bucket) continue;
        for (const d of bucket) {
          const dx = d.x - x;
          const dy = d.y - y;
          const min = d.r + r + gap;
          if (dx * dx + dy * dy < min * min) return true;
        }
      }
    }
    return false;
  }
}

/**
 * Pack a circular plate with non-overlapping dots.
 *
 * @param {object} opts
 * @param {number} opts.radius        plate radius in px
 * @param {number[]} opts.tiers       dot radii, largest first
 * @param {number} [opts.gap]         minimum clear space between dots, px
 * @param {number} [opts.attempts]    darts thrown per tier
 * @param {number} [opts.inset]       keep dots this far inside the plate edge
 * @param {() => number} [opts.rng]
 * @returns {{x:number,y:number,r:number}[]} centred on (0,0)
 */
export function packDisc({
  radius,
  tiers,
  gap = 1.1,
  attempts = 900,
  inset = 2,
  rng = Math.random,
}) {
  const dots = [];
  const grid = new SpatialHash(Math.max(...tiers) * 2 + gap);
  const limit = radius - inset;

  for (const r of tiers) {
    // Smaller dots need proportionally more darts to find the remaining gaps.
    const tierAttempts = Math.round(attempts * (tiers[0] / r) ** 1.6);
    let misses = 0;
    for (let i = 0; i < tierAttempts; i++) {
      // sqrt() keeps the sample uniform over area rather than clustered at the centre
      const t = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * (limit - r);
      const x = Math.cos(t) * d;
      const y = Math.sin(t) * d;

      if (grid.collides(x, y, r, gap)) {
        // Bail out early once this tier is clearly saturated.
        if (++misses > tierAttempts * 0.35) break;
        continue;
      }
      const dot = { x, y, r };
      dots.push(dot);
      grid.insert(dot);
      misses = 0;
    }
  }
  return dots;
}

/**
 * Default radius tiers scaled to plate size. Ratios are eyeballed from scans of
 * the classic 38-plate edition: a handful of large dots, many mid, a fine fill.
 */
export function tiersFor(radius, density = 1) {
  const base = radius / 26 / density;
  return [base * 1.55, base * 1.25, base * 1.0, base * 0.78, base * 0.58, base * 0.42];
}
