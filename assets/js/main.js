/**
 * Fovea — application bootstrap and route table.
 *
 * Views are loaded on demand so the landing page ships only what it needs; a
 * test module and its canvas machinery arrive when the user asks for that test.
 */

import { Router } from './core/router.js';
import { store } from './core/store.js';
import { initPrefs, applyPrefs, exitTestMode } from './core/prefs.js';
import { announce, focusHeading } from './core/a11y.js';
import { $, h } from './core/dom.js';
import { byId } from './tests/registry.js';

const outlet = $('#main');

initPrefs();

const router = new Router({ outlet, fallback: '/' });

/* Leaving a test must always restore normal chrome, however the user left. */
router.guard(() => { exitTestMode(); });

const lazy = (loader, key) => async (ctx) => {
  const mod = await loader();
  return mod[key](ctx);
};

router
  .add('/', lazy(() => import('./views/landing.js'), 'landingView'),
       { title: 'Fovea — Free Online Eye & Colour Vision Tests' })

  .add('/tests', lazy(() => import('./views/tests.js'), 'testsView'),
       { title: 'All tests' })

  .add('/t/:id', lazy(() => import('./views/test-intro.js'), 'testIntroView'),
       { title: 'Test' })

  .add('/t/:id/run', lazy(() => import('./views/test-run.js'), 'testRunView'),
       { title: 'Test in progress', chrome: 'minimal' })

  .add('/t/:id/result', lazy(() => import('./views/test-result.js'), 'testResultView'),
       { title: 'Your result' })

  .add('/report', lazy(() => import('./views/report.js'), 'reportView'),
       { title: 'Your report' })

  .add('/report/:sessionId', lazy(() => import('./views/report.js'), 'reportView'),
       { title: 'Your report' })

  .add('/calibrate', lazy(() => import('./views/calibrate.js'), 'calibrateView'),
       { title: 'Set up your screen' })

  .add('/calibrate/:step', lazy(() => import('./views/calibrate.js'), 'calibrateView'),
       { title: 'Set up your screen' })

  .add('/check', lazy(() => import('./views/check.js'), 'checkView'),
       { title: 'Before you start' })

  .add('/simulator', lazy(() => import('./views/simulator.js'), 'simulatorView'),
       { title: 'Colour vision simulator' })

  .add('/timer', lazy(() => import('./views/timer.js'), 'timerView'),
       { title: '20-20-20 timer' })

  .add('/settings', lazy(() => import('./views/settings.js'), 'settingsView'),
       { title: 'Settings' })

  .add('/about', lazy(() => import('./views/content.js'), 'aboutView'), { title: 'About' })
  .add('/credits', lazy(() => import('./views/content.js'), 'creditsView'), { title: 'Credits' })
  .add('/privacy', lazy(() => import('./views/content.js'), 'privacyView'), { title: 'Privacy' })
  .add('/methodology', lazy(() => import('./views/content.js'), 'methodologyView'), { title: 'Methodology' })
  .add('/learn', lazy(() => import('./views/content.js'), 'learnIndexView'), { title: 'Learn' })
  .add('/learn/:slug', lazy(() => import('./views/content.js'), 'learnArticleView'), { title: 'Learn' });

/* ------------------------------------------------------- chrome wiring */

document.addEventListener('fovea:navigated', (e) => {
  const { meta, params, path } = e.detail;

  const test = params.id ? byId(params.id) : null;
  const title = test ? `${test.name} — Fovea` : `${meta.title ?? 'Fovea'}`;
  document.title = title.endsWith('Fovea') || title.includes('Fovea') ? title : `${title} — Fovea`;

  // Mark the active nav item.
  for (const link of document.querySelectorAll('.site-nav a, .mobile-nav a')) {
    const target = link.getAttribute('href')?.slice(1) ?? '';
    const active = target !== '/' && path.startsWith(target);
    link.toggleAttribute('aria-current', active);
    if (active) link.setAttribute('aria-current', 'page');
  }

  closeMobileNav();
  focusHeading(outlet);
  announce(document.title.replace(' — Fovea', ''));
});

/* Theme toggle cycles light -> dark -> follow system. */
const themeBtn = $('#theme-toggle');
themeBtn?.addEventListener('click', () => {
  const order = ['system', 'light', 'dark'];
  const current = store.get().prefs.theme;
  const next = order[(order.indexOf(current) + 1) % order.length];
  store.setPrefs({ theme: next });
  applyPrefs();
  syncThemeButton();
  announce(`Theme: ${next === 'system' ? 'follow system setting' : next}`);
});

function syncThemeButton() {
  if (!themeBtn) return;
  const choice = store.get().prefs.theme;
  const dark = document.documentElement.dataset.theme === 'dark';
  themeBtn.querySelector('use')?.setAttribute('href', dark ? '#i-sun' : '#i-moon');
  themeBtn.setAttribute(
    'aria-label',
    `Colour theme: ${choice === 'system' ? 'following your system' : choice}. Activate to change.`
  );
}
syncThemeButton();
store.subscribe(syncThemeButton);

/* Mobile navigation. */
const menuBtn = $('#menu-toggle');
const mobileNav = $('#mobile-nav');

menuBtn?.addEventListener('click', () => {
  const open = menuBtn.getAttribute('aria-expanded') === 'true';
  open ? closeMobileNav() : openMobileNav();
});

function openMobileNav() {
  mobileNav.hidden = false;
  menuBtn.setAttribute('aria-expanded', 'true');
  menuBtn.setAttribute('aria-label', 'Close menu');
  mobileNav.querySelector('a')?.focus();
}

function closeMobileNav() {
  if (!mobileNav || mobileNav.hidden) return;
  mobileNav.hidden = true;
  menuBtn?.setAttribute('aria-expanded', 'false');
  menuBtn?.setAttribute('aria-label', 'Open menu');
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMobileNav();
});

/* ------------------------------------------------------------- storage */

if (!store.available) {
  outlet.before(
    h('div.container', { style: { paddingTop: 'var(--space-4)' } },
      h('div.callout.callout--watch',
        h('div.callout__body',
          h('p.callout__title', 'Results cannot be saved'),
          h('p', 'This browser is blocking site storage, most likely a private window. ' +
                 'The tests all work, but nothing will be remembered after you close the tab.')))));
}

/* --------------------------------------------------------------- start */

router.start();

/* Offline support. Registration failing is not an error worth surfacing. */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

export { router };
