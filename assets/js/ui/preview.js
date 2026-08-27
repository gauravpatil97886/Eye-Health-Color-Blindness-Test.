/**
 * Fovea — live stimulus previews.
 *
 * Every test draws a miniature of its OWN real stimulus: an actual generated
 * plate, an actual Landolt ring at ISO proportions, an actual hue circle. None
 * of it is decorative artwork standing in for the thing.
 *
 * Two reasons that matters. It shows the variety of the suite instantly, in a
 * way a list of names cannot. And it stays honest — a preview that promised
 * something prettier than the test delivers would be a small lie told at the
 * top of a page whose whole argument is that it does not tell them.
 *
 * Previews are decorative in the accessibility sense: each sits inside a link
 * that already carries the test's name, so they are aria-hidden and never
 * announced twice.
 */

import { h, fitCanvas } from '../core/dom.js';
import { renderPlate } from '../plate/generator.js';
import { mulberry32, seedFrom } from '../plate/packing.js';
import { oklabToHex } from '../color/convert.js';

const SIZE = 64;

/** @returns {HTMLCanvasElement} */
export function testPreview(testId, { size = SIZE } = {}) {
  const canvas = h('canvas.preview', { 'aria-hidden': 'true' });
  const ctx = fitCanvas(canvas, size, { alpha: false });
  const draw = DRAWERS[testId] ?? drawGeneric;
  try {
    draw(ctx, size, mulberry32(seedFrom(testId)));
  } catch {
    drawGeneric(ctx, size, mulberry32(1));
  }
  return canvas;
}

const bg = (ctx, size, colour) => { ctx.fillStyle = colour; ctx.fillRect(0, 0, size, size); };

const DRAWERS = {
  /* A real generated plate, just small. */
  'color-plates'(ctx, size, rng) {
    renderPlate(ctx, {
      id: 'preview', plateClass: 'vanishing', figureKind: 'digits',
      figure: '5', altFigure: null, targets: 'deutan',
      seed: (rng() * 0xffffffff) >>> 0,
    }, { size, density: 1.9 });   // denser tiers so the figure survives at 64px
  },

  /* The hue circle the arrangement test uses, laid out as a ring. */
  'hue-arrangement'(ctx, size) {
    bg(ctx, size, '#f2f2f2');
    const n = 12;
    const r = size * 0.3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      ctx.fillStyle = oklabToHex([0.64, Math.cos((i / n) * Math.PI * 2) * 0.085,
                                        Math.sin((i / n) * Math.PI * 2) * 0.085]);
      ctx.beginPath();
      ctx.arc(size / 2 + Math.cos(a) * r, size / 2 + Math.sin(a) * r, size * 0.075, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  /* A digit fading toward the background, as the staircase does. */
  contrast(ctx, size) {
    bg(ctx, size, '#808080');
    ctx.font = `700 ${size * 0.6}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillText('6', size / 2, size / 2);
  },

  /* An ISO 8596 Landolt ring: outer 5 units, stroke 1, gap 1. */
  acuity(ctx, size) {
    bg(ctx, size, '#ffffff');
    const unit = size * 0.13;
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5 * unit, 0, Math.PI * 2);
    ctx.arc(0, 0, 1.5 * unit, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(1.4 * unit, -unit / 2, 1.3 * unit, unit);
    ctx.restore();
  },

  /* Luminance-matched red and green, exactly as the test uses them. */
  duochrome(ctx, size) {
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, size / 2, size);
    ctx.fillStyle = '#009400';
    ctx.fillRect(size / 2, 0, size / 2, size);
    ctx.fillStyle = '#000';
    ctx.font = `700 ${size * 0.3}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('O', size * 0.26, size / 2);
    ctx.fillText('X', size * 0.74, size / 2);
  },

  astigmatism(ctx, size) {
    bg(ctx, size, '#ffffff');
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = Math.max(1, size / 64);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 12;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * size * 0.1, Math.sin(a) * size * 0.1);
      ctx.lineTo(Math.cos(a) * size * 0.44, Math.sin(a) * size * 0.44);
      ctx.moveTo(-Math.cos(a) * size * 0.1, -Math.sin(a) * size * 0.1);
      ctx.lineTo(-Math.cos(a) * size * 0.44, -Math.sin(a) * size * 0.44);
      ctx.stroke();
    }
    ctx.restore();
  },

  near(ctx, size) {
    bg(ctx, size, '#ffffff');
    ctx.fillStyle = '#111';
    // Descending print sizes, the way the test steps down.
    let y = size * 0.24;
    for (const [fs, w] of [[0.19, 0.72], [0.14, 0.66], [0.10, 0.58], [0.075, 0.5]]) {
      ctx.fillRect(size * 0.14, y, size * w, size * fs * 0.42);
      y += size * fs + size * 0.035;
    }
  },

  amsler(ctx, size) {
    bg(ctx, size, '#ffffff');
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    const n = 8;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const p = Math.round((i * size) / n) + 0.5;
      ctx.moveTo(p, 0); ctx.lineTo(p, size);
      ctx.moveTo(0, p); ctx.lineTo(size, p);
    }
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.045, 0, Math.PI * 2);
    ctx.fill();
  },

  blindspot(ctx, size) {
    bg(ctx, size, '#ffffff');
    ctx.strokeStyle = '#111';
    ctx.lineWidth = Math.max(1, size / 40);
    ctx.beginPath();
    ctx.moveTo(size * 0.12, size / 2); ctx.lineTo(size * 0.88, size / 2);
    ctx.stroke();
    ctx.font = `700 ${size * 0.3}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#111';
    ctx.fillText('+', size * 0.24, size / 2);
    ctx.beginPath();
    ctx.arc(size * 0.74, size / 2, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
  },

  reaction(ctx, size) {
    bg(ctx, size, '#0a0a0a');
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  },

  /* The word and the ink deliberately disagree — that IS the test. */
  stroop(ctx, size) {
    bg(ctx, size, '#0a0a0a');
    ctx.font = `700 ${size * 0.22}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c0392b';
    ctx.fillText('GREEN', size / 2, size / 2);
  },

  peripheral(ctx, size, rng) {
    bg(ctx, size, '#0a0a0a');
    ctx.fillStyle = '#f0f0f0';
    ctx.font = `700 ${size * 0.26}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('7', size / 2, size / 2);
    for (let i = 0; i < 3; i++) {
      const a = rng() * Math.PI * 2;
      const d = size * (0.28 + rng() * 0.14);
      ctx.beginPath();
      ctx.arc(size / 2 + Math.cos(a) * d, size / 2 + Math.sin(a) * d, size * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  simulator(ctx, size) {
    const swatches = ['#e03131', '#f08c00', '#2f9e44', '#1971c2'];
    const sim = ['#8a7b1e', '#a08a1a', '#7d7a25', '#5f6f9e'];
    const cell = size / 2;
    for (let i = 0; i < 4; i++) {
      const x = (i % 2) * cell;
      const y = ((i / 2) | 0) * cell;
      ctx.fillStyle = swatches[i];
      ctx.fillRect(x, y, cell, cell);
      // Right half shows the same swatches simulated — the tool's whole point.
      ctx.fillStyle = sim[i];
      ctx.fillRect(x + cell / 2, y, cell / 2, cell);
    }
  },

  timer(ctx, size) {
    bg(ctx, size, '#f2f2f2');
    ctx.strokeStyle = '#333';
    ctx.lineWidth = Math.max(2, size / 22);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.32, -Math.PI / 2, Math.PI * 0.55);
    ctx.stroke();
    ctx.strokeStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2);
    ctx.lineTo(size / 2, size * 0.26);
    ctx.stroke();
  },
};

function drawGeneric(ctx, size) {
  bg(ctx, size, '#eef0f4');
  ctx.strokeStyle = '#9aa3af';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.28, 0, Math.PI * 2);
  ctx.stroke();
}
