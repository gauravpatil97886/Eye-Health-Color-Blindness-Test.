/**
 * Fovea — user preferences applied to the document root.
 *
 * Theme, text size and motion are all expressed as data-* attributes on <html>
 * so CSS owns every visual consequence and JS never touches a style property.
 */

import { store } from './store.js';

const root = document.documentElement;
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

export function applyPrefs() {
  const { theme, largeText, highContrast, reduceMotion } = store.get().prefs;

  root.dataset.theme = theme === 'system' ? (darkQuery.matches ? 'dark' : 'light') : theme;
  root.dataset.themeChoice = theme;
  root.toggleAttribute('data-large-text', largeText);
  root.toggleAttribute('data-high-contrast', highContrast);

  const reduced = reduceMotion === 'system' ? motionQuery.matches : reduceMotion === true;
  root.toggleAttribute('data-reduce-motion', reduced);

  // Keep the browser UI (address bar) in step with the theme.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.content = getComputedStyle(root).getPropertyValue('--surface-0').trim() || '#ffffff';
  }
}

export function initPrefs() {
  applyPrefs();
  darkQuery.addEventListener('change', applyPrefs);
  motionQuery.addEventListener('change', applyPrefs);
  store.subscribe(applyPrefs);
}

export function prefersReducedMotion() {
  return root.hasAttribute('data-reduce-motion');
}

/**
 * Test surfaces override the theme to a fixed neutral: a tinted or dark chrome
 * next to a colour plate shifts perceived hue, and a grey background next to an
 * acuity optotype lowers effective contrast. Both invalidate the result.
 */
export function enterTestMode(kind = 'neutral') {
  root.dataset.testMode = kind; // 'neutral' | 'white' | 'dark'
}

export function exitTestMode() {
  delete root.dataset.testMode;
}
