/**
 * Guards the promise made in tokens.css: every text/surface pairing the app
 * actually uses meets WCAG 2.2 AA. Values are parsed out of the stylesheet, so
 * editing a token without checking its contrast fails the build rather than
 * quietly shipping unreadable text.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrastRatio } from '../assets/js/color/convert.js';

const css = readFileSync(new URL('../assets/css/tokens.css', import.meta.url), 'utf8');

/** Pull `--name: #hex;` out of a named block so themes don't clobber each other. */
function tokensIn(selector) {
  const start = css.indexOf(selector);
  assert.ok(start >= 0, `selector ${selector} missing from tokens.css`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const body = css.slice(open, close);
  const out = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

const root  = tokensIn(':root {');
const light = { ...root, ...tokensIn(':root[data-theme="light"]') };
const dark  = { ...root, ...tokensIn(':root[data-theme="dark"]') };

/** [foreground, background, minimum ratio, description] */
const AA_NORMAL = 4.5;
const AA_LARGE  = 3.0;

function checkPairs(name, t, pairs) {
  test(name, () => {
    for (const [fg, bg, min, why] of pairs) {
      const fgHex = t[fg] ?? fg;
      const bgHex = t[bg] ?? bg;
      const ratio = contrastRatio(fgHex, bgHex);
      assert.ok(
        ratio >= min,
        `${fg} (${fgHex}) on ${bg} (${bgHex}) = ${ratio.toFixed(2)}:1, need ${min}:1 — ${why}`
      );
    }
  });
}

checkPairs('light theme meets AA', light, [
  ['--text-1', '--surface-0', AA_NORMAL, 'body copy'],
  ['--text-2', '--surface-0', AA_NORMAL, 'secondary copy'],
  ['--text-3', '--surface-0', AA_NORMAL, 'muted copy'],
  ['--text-1', '--surface-1', AA_NORMAL, 'body copy on sunken panel'],
  ['--text-2', '--surface-1', AA_NORMAL, 'secondary on sunken panel'],
  ['--text-1', '--surface-2', AA_NORMAL, 'body copy on raised card'],
  ['--brand-700', '--surface-0', AA_NORMAL, 'brand text link'],
  ['--ok-fg', '--ok-bg', AA_NORMAL, 'result badge: normal'],
  ['--watch-fg', '--watch-bg', AA_NORMAL, 'result badge: worth watching'],
  ['--error-fg', '--error-bg', AA_NORMAL, 'system error message'],
  ['--info-fg', '--info-bg', AA_NORMAL, 'informational note'],
  ['--border-2', '--surface-0', AA_LARGE, 'input borders are UI components (SC 1.4.11)'],
  ['--border-2', '--surface-1', AA_LARGE, 'inputs sitting on a sunken panel'],
  ['--border-2', '--surface-2', AA_LARGE, 'inputs sitting on a raised card'],
]);

checkPairs('dark theme meets AA', dark, [
  ['--text-1', '--surface-0', AA_NORMAL, 'body copy'],
  ['--text-2', '--surface-0', AA_NORMAL, 'secondary copy'],
  ['--text-3', '--surface-0', AA_NORMAL, 'muted copy'],
  ['--text-1', '--surface-1', AA_NORMAL, 'body copy on sunken panel'],
  ['--text-2', '--surface-1', AA_NORMAL, 'secondary on sunken panel'],
  ['--text-1', '--surface-2', AA_NORMAL, 'body copy on raised card'],
  ['--brand-300', '--surface-0', AA_NORMAL, 'brand text link'],
  ['--ok-fg', '--ok-bg', AA_NORMAL, 'result badge: normal'],
  ['--watch-fg', '--watch-bg', AA_NORMAL, 'result badge: worth watching'],
  ['--error-fg', '--error-bg', AA_NORMAL, 'system error message'],
  ['--info-fg', '--info-bg', AA_NORMAL, 'informational note'],
  ['--border-2', '--surface-0', AA_LARGE, 'input borders are UI components (SC 1.4.11)'],
  ['--border-2', '--surface-1', AA_LARGE, 'inputs sitting on a sunken panel'],
  ['--border-2', '--surface-2', AA_LARGE, 'inputs sitting on a raised card'],
]);

/**
 * Test surfaces carry the strictest requirement: this is text the user reads
 * while a measurement is in progress, often at a distance or with the very
 * impairment being screened for.
 */
for (const mode of ['neutral', 'white', 'dark']) {
  const t = tokensIn(`:root[data-test-mode="${mode}"]`);
  checkPairs(`test surface "${mode}" meets AA`, t, [
    ['--test-fg', '--test-bg', AA_NORMAL, 'instruction text during a test'],
    ['--test-fg-2', '--test-bg', AA_NORMAL, 'secondary text during a test'],
  ]);
}

test('white test surface is true maximum contrast', () => {
  const t = tokensIn(':root[data-test-mode="white"]');
  // Acuity scoring assumes ~100% Weber contrast; anything less biases the result.
  assert.equal(contrastRatio(t['--test-fg'], t['--test-bg']).toFixed(0), '21');
});

test('brand colour never leaks into a test surface', () => {
  for (const mode of ['neutral', 'white', 'dark']) {
    const t = tokensIn(`:root[data-test-mode="${mode}"]`);
    for (const [name, hex] of Object.entries(t)) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      assert.ok(
        Math.max(r, g, b) - Math.min(r, g, b) <= 2,
        `${mode} ${name} (${hex}) is not neutral — a tint here biases the measurement`
      );
    }
  }
});
