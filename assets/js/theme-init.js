/**
 * Runs before first paint to stamp the saved theme on <html>, so a dark-mode
 * user never sees a white flash. Kept as its own blocking file rather than an
 * inline script so the CSP can stay free of 'unsafe-inline'.
 */
(function () {
  try {
    var raw = localStorage.getItem('fovea.v1');
    var prefs = raw ? (JSON.parse(raw).prefs || {}) : {};
    var choice = prefs.theme || 'system';
    var dark = choice === 'dark' ||
      (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.themeChoice = choice;
    if (prefs.largeText) root.setAttribute('data-large-text', '');
    if (prefs.highContrast) root.setAttribute('data-high-contrast', '');
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
