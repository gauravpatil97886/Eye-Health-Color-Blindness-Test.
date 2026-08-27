/**
 * Fovea — colour vision simulator.
 *
 * The empathy tool, and the most shareable thing on the site. Everything runs
 * on a canvas in the page; the image is never uploaded, and there is no upload
 * endpoint to send it to even if we wanted one.
 */

import { h, icon, createView, fitCanvas } from '../core/dom.js';
import { simulateImageData, simulateAchromatopsia, CVD_LABELS } from '../color/cvd.js';
import { hexToRgb, rgbToHex } from '../color/convert.js';

const TYPES = [
  ['deutan', 'Deuteranopia', 'Green-weak — the most common type'],
  ['protan', 'Protanopia', 'Red-weak — reds also look much darker'],
  ['tritan', 'Tritanopia', 'Blue-yellow — rare, and usually acquired'],
  ['achroma', 'Achromatopsia', 'No colour vision at all — very rare'],
];

export function simulatorView() {
  let sourceBitmap = null;
  let type = 'deutan';
  let severity = 1;

  const original = h('canvas');
  const simulated = h('canvas');
  const fileInput = h('input', { type: 'file', accept: 'image/*', class: 'sr-only', id: 'sim-file' });

  const severityRange = h('input.slider', {
    type: 'range', min: '0', max: '100', value: '100',
    'aria-label': 'Severity of the simulated deficiency',
  });
  const severityOut = h('span.mosaic__value', '100%');

  const typeButtons = h('div.chip-group',
    TYPES.map(([id, name]) =>
      h('button.chip', {
        type: 'button',
        style: { fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', minWidth: 'auto' },
        'aria-pressed': String(id === type),
        onclick: (e) => {
          type = id;
          for (const b of typeButtons.children) b.setAttribute('aria-pressed', 'false');
          e.currentTarget.setAttribute('aria-pressed', 'true');
          render();
        },
      }, name)));

  function render() {
    if (!sourceBitmap) { drawSample(); return; }
    const maxW = 560;
    const scale = Math.min(1, maxW / sourceBitmap.width);
    const w = Math.round(sourceBitmap.width * scale);
    const hh = Math.round(sourceBitmap.height * scale);

    for (const c of [original, simulated]) {
      c.width = w; c.height = hh;
      c.style.width = '100%'; c.style.height = 'auto';
    }
    original.getContext('2d').drawImage(sourceBitmap, 0, 0, w, hh);

    const ctx = simulated.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(sourceBitmap, 0, 0, w, hh);
    const data = ctx.getImageData(0, 0, w, hh);
    if (type === 'achroma') {
      const d = data.data;
      for (let i = 0; i < d.length; i += 4) {
        const out = simulateAchromatopsia([d[i] / 255, d[i + 1] / 255, d[i + 2] / 255], severity);
        d[i] = out[0] * 255; d[i + 1] = out[1] * 255; d[i + 2] = out[2] * 255;
      }
    } else {
      simulateImageData(data, type, severity);
    }
    ctx.putImageData(data, 0, 0);
  }

  /** A generated swatch grid so the page is useful before anyone picks a file. */
  function drawSample() {
    const size = 360;
    const swatches = [
      '#e03131', '#f08c00', '#f5d90a', '#2f9e44', '#0c8599',
      '#1971c2', '#6741d9', '#c2255c', '#495057', '#adb5bd',
    ];
    for (const [canvas, sim] of [[original, false], [simulated, true]]) {
      const ctx = fitCanvas(canvas, size, { alpha: false });
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, size, size);
      const cols = 5;
      const cell = size / cols;
      swatches.forEach((hex, i) => {
        const x = (i % cols) * cell;
        const y = Math.floor(i / cols) * cell;
        let fill = hex;
        if (sim) {
          fill = type === 'achroma'
            ? rgbToHex(simulateAchromatopsia(hexToRgb(hex), severity))
            : rgbToHex(simulateFromHex(hex));
        }
        ctx.fillStyle = fill;
        ctx.fillRect(x + 4, y + 4, cell - 8, size / 2 - 8);
      });
      ctx.fillStyle = '#111';
      ctx.font = '500 14px system-ui, sans-serif';
      ctx.fillText(sim ? `As seen with ${CVD_LABELS[type]?.short ?? 'no colour vision'}` : 'Typical colour vision', 8, size - 12);
    }
  }

  function simulateFromHex(hex) {
    // Route single colours through the same ImageData path so the swatch grid
    // and a photograph can never disagree.
    const one = { data: new Uint8ClampedArray([...hexToRgb(hex).map((v) => v * 255), 255]) };
    simulateImageData(one, type, severity);
    return [one.data[0] / 255, one.data[1] / 255, one.data[2] / 255];
  }

  const el = h('div.view.container.section',
    h('div.stack.stack--xl',
      h('div.stack.stack--sm',
        h('p.eyebrow', 'Tool'),
        h('h1', 'Colour vision simulator'),
        h('p.lede',
          'See any image the way someone with a colour vision deficiency does. ' +
          'Useful for checking a design, or simply for understanding what a friend sees.')),

      h('div.callout.callout--ok',
        h('div.callout__icon', icon('lock')),
        h('div.callout__body',
          h('p', h('strong', 'Your image never leaves this page. '),
            'It is decoded and processed in your browser and discarded when you navigate away. ' +
            'There is no upload.'))),

      h('div.stack.stack--sm',
        h('label.field__label', { for: 'sim-file' }, 'Choose an image'),
        h('div.row',
          fileInput,
          h('button.btn.btn--secondary', {
            type: 'button', onclick: () => fileInput.click(),
          }, icon('layers', { size: 18 }), 'Pick an image'),
          h('span.subtle', { style: { fontSize: 'var(--text-sm)' } },
            'Or explore the colour swatches below.'))),

      h('div.stack.stack--sm',
        h('span.field__label', 'Type'),
        typeButtons),

      h('div.mosaic__control',
        h('label.mosaic__label',
          h('span', 'Severity'),
          severityOut),
        severityRange),

      h('div.sim-grid',
        h('div.sim-pane', h('span.field__label', 'Original'), original),
        h('div.sim-pane', h('span.field__label', 'Simulated'), simulated)),

      h('p.muted', { style: { fontSize: 'var(--text-sm)', maxWidth: 'var(--measure)' } },
        'Simulation uses the Brettel–Viénot–Mollon two-plane model, applied in linear light. ' +
        'It shows how colours collapse together — it cannot show you what someone else ' +
        'subjectively experiences, and nobody can.')));

  const view = createView(el);

  view.listen(fileInput, 'change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      sourceBitmap = await createImageBitmap(file);
      render();
    } catch {
      sourceBitmap = null;
      drawSample();
    }
  });

  view.listen(severityRange, 'input', () => {
    severity = Number(severityRange.value) / 100;
    severityOut.textContent = `${severityRange.value}%`;
    render();
  });

  requestAnimationFrame(render);
  return view;
}
