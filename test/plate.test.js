/**
 * Guards the properties that make a generated plate a valid measurement rather
 * than a decorative circle of dots. If any of these regress, the test reports a
 * confident wrong answer to a user — the worst failure this project can have.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildPlateSet, validatePlate } from '../assets/js/plate/generator.js';
import {
  confusionPair, simulateHex, separabilityUnder, luminanceDelta,
  CONFUSION_DIRECTION, CVD_TYPES, PLATE_SEEDS, simulateAchromatopsia,
} from '../assets/js/color/cvd.js';
import { hexToRgb, rgbToHex } from '../assets/js/color/convert.js';

const SESSIONS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];

test('a confusion pair is genuinely invisible to its target deficiency', () => {
  for (const type of CVD_TYPES) {
    for (const seed of PLATE_SEEDS[type]) {
      const pair = confusionPair(seed, type);
      const residual = separabilityUnder(pair.a, pair.b, type, 1);
      // Anything above ~0.01 OKLab is the 8-bit quantisation floor being
      // exceeded, which means the pair is actually distinguishable.
      assert.ok(
        residual <= 0.012,
        `${type} pair ${pair.a}/${pair.b} still separable: ${residual.toFixed(4)}`
      );
    }
  }
});

test('the same pair IS clearly visible to normal vision', () => {
  for (const type of CVD_TYPES) {
    for (const seed of PLATE_SEEDS[type]) {
      const pair = confusionPair(seed, type);
      assert.ok(
        pair.normalDelta >= 0.055,
        `${type} pair ${pair.a}/${pair.b} too similar for normal vision: ${pair.normalDelta.toFixed(4)}`
      );
    }
  }
});

test('confusion directions are unit vectors and mutually distinct', () => {
  for (const type of CVD_TYPES) {
    const d = CONFUSION_DIRECTION[type];
    assert.equal(d.length, 3);
    assert.ok(Math.abs(Math.hypot(...d) - 1) < 1e-9, `${type} direction not normalised`);
  }
  // If two types shared a direction we could not tell them apart at all.
  for (const [a, b] of [['protan', 'deutan'], ['deutan', 'tritan'], ['protan', 'tritan']]) {
    const dot = Math.abs(
      CONFUSION_DIRECTION[a].reduce((s, v, i) => s + v * CONFUSION_DIRECTION[b][i], 0)
    );
    assert.ok(dot < 0.99, `${a} and ${b} confusion directions are nearly parallel (${dot.toFixed(4)})`);
  }
});

test('every vanishing plate in a generated set validates', () => {
  let checked = 0;
  for (const sessionSeed of SESSIONS) {
    for (const plate of buildPlateSet({ sessionSeed })) {
      if (plate.plateClass !== 'vanishing') continue;
      const v = validatePlate(plate);
      assert.ok(v.ok, `${sessionSeed} ${plate.targets}: ${v.problems.join('; ')}`);
      checked++;
    }
  }
  assert.ok(checked >= 80, `expected a meaningful sample, only checked ${checked}`);
});

test('a plate set opens with the control and covers all three axes', () => {
  for (const sessionSeed of SESSIONS) {
    const set = buildPlateSet({ sessionSeed });
    assert.equal(set.length, 12, 'default set should be 12 plates');
    assert.equal(set[0].plateClass, 'demonstration',
      'the control plate must come first — it validates the run');
    assert.equal(
      set.filter((p) => p.plateClass === 'demonstration').length, 1,
      'exactly one control plate');

    const targets = new Set(set.filter((p) => p.targets).map((p) => p.targets));
    for (const t of CVD_TYPES) {
      assert.ok(targets.has(t), `${sessionSeed} never targets ${t}`);
    }
  }
});

test('protan and deutan carry equal weight', () => {
  // Weighting toward deutan (the commoner type) would let a protan miss fewer
  // plates and slip into the inconclusive band while an equally strong deutan
  // is flagged. The set has to be able to fail both the same way.
  for (const sessionSeed of SESSIONS) {
    const set = buildPlateSet({ sessionSeed });
    const n = (t) => set.filter((p) => p.targets === t).length;
    assert.equal(n('protan'), n('deutan'),
      `${sessionSeed}: protan ${n('protan')} vs deutan ${n('deutan')} plates`);
  }
});

test('the mottle never bridges the figure/ground gap', () => {
  // Jitter exists for visual character. If it ever approached the separation
  // between figure and ground colours, dots from the two regions would overlap
  // and the edge would blur away.
  for (const sessionSeed of SESSIONS) {
    for (const plate of buildPlateSet({ sessionSeed })) {
      if (plate.plateClass !== 'vanishing') continue;
      const v = validatePlate(plate);
      assert.ok(
        v.metrics.jitterHeadroom >= 3,
        `${sessionSeed} ${plate.targets}: jitter headroom only ${v.metrics.jitterHeadroom?.toFixed(1)}x`
      );
    }
  }
});

test('plate sets are reproducible from a seed and different across seeds', () => {
  const a = buildPlateSet({ sessionSeed: 'same' });
  const b = buildPlateSet({ sessionSeed: 'same' });
  const c = buildPlateSet({ sessionSeed: 'different' });
  assert.deepEqual(a, b, 'same seed must reproduce the same set');
  assert.notDeepEqual(
    a.map((p) => p.figure + p.seed),
    c.map((p) => p.figure + p.seed),
    'different seeds must produce different sets — otherwise answers are memorisable'
  );
});

test('kids mode uses shapes, never numerals', () => {
  const set = buildPlateSet({ count: 12, figureKind: 'shape', sessionSeed: 'kid' });
  for (const p of set) {
    assert.equal(p.figureKind, 'shape');
    assert.ok(/^[a-z]+$/.test(p.figure), `expected a shape name, got "${p.figure}"`);
  }
});

test('the demonstration plate stays readable under every deficiency', () => {
  // Its whole job is to confirm the user understands the task, so it must not
  // depend on colour discrimination at all — including full achromatopsia.
  const figure = '#c4622d';
  const ground = '#d9cfa8';
  for (const type of CVD_TYPES) {
    const d = separabilityUnder(figure, ground, type, 1);
    assert.ok(d > 0.10, `demonstration plate collapses under ${type} (${d.toFixed(3)})`);
  }
  const monoFig = rgbToHex(simulateAchromatopsia(hexToRgb(figure)));
  const monoGnd = rgbToHex(simulateAchromatopsia(hexToRgb(ground)));
  assert.ok(
    luminanceDelta(monoFig, monoGnd) > 0.10,
    'demonstration plate is invisible without colour — it must also differ in lightness'
  );
});

test('simulation is idempotent — a dichromat view cannot lose more colour', () => {
  for (const type of CVD_TYPES) {
    const once = simulateHex('#8c7a5e', type, 1);
    const twice = simulateHex(once, type, 1);
    const drift = separabilityUnder(once, twice, type, 1);
    assert.ok(drift < 0.02, `${type} simulation is not stable under reapplication (${drift.toFixed(4)})`);
  }
});

test('severity 0 leaves colour untouched', () => {
  for (const type of CVD_TYPES) {
    assert.equal(simulateHex('#8c7a5e', type, 0), '#8c7a5e');
  }
});
