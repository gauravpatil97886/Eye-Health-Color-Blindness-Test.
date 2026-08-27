/**
 * Fovea — accessibility utilities.
 *
 * This app tests vision, so a meaningful share of its users have impaired
 * vision. Screen-reader support is not a checkbox here: a blind user cannot
 * take the acuity test, but they can absolutely use the eye-strain timer, read
 * the Learn section, and hear their household member's results. Every screen
 * must therefore announce itself properly, and every test must state up front
 * what it requires.
 */

let politeRegion;
let assertiveRegion;

function ensureRegions() {
  if (politeRegion) return;
  politeRegion = document.createElement('div');
  politeRegion.className = 'sr-only';
  politeRegion.setAttribute('aria-live', 'polite');
  politeRegion.setAttribute('aria-atomic', 'true');

  assertiveRegion = document.createElement('div');
  assertiveRegion.className = 'sr-only';
  assertiveRegion.setAttribute('role', 'alert');
  assertiveRegion.setAttribute('aria-live', 'assertive');
  assertiveRegion.setAttribute('aria-atomic', 'true');

  document.body.append(politeRegion, assertiveRegion);
}

/**
 * Announce to assistive tech. `assertive` interrupts — reserve it for things
 * like "time is up", never for routine progress.
 */
export function announce(message, { assertive = false } = {}) {
  ensureRegions();
  const region = assertive ? assertiveRegion : politeRegion;
  // Clearing first forces a re-announcement of identical consecutive strings.
  region.textContent = '';
  requestAnimationFrame(() => { region.textContent = message; });
}

/** Move focus to a view's heading after navigation so SR users hear the change. */
export function focusHeading(root) {
  const heading = root.querySelector('h1, h2, [data-autofocus]');
  if (!heading) return;
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
}

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Confines Tab within `container`. Returns a release function. */
export function trapFocus(container) {
  const previouslyFocused = document.activeElement;

  function onKeydown(e) {
    if (e.key !== 'Tab') return;
    const items = [...container.querySelectorAll(FOCUSABLE)]
      .filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  container.addEventListener('keydown', onKeydown);
  (container.querySelector('[data-autofocus]') ?? container.querySelector(FOCUSABLE))?.focus();

  return function release() {
    container.removeEventListener('keydown', onKeydown);
    previouslyFocused?.focus?.({ preventScroll: true });
  };
}

/** Formats a number for speech — "6 by 12" reads better than "6/12". */
export function speakable(text) {
  return String(text)
    .replace(/(\d+)\/(\d+)/g, '$1 by $2')
    .replace(/([+-])(\d)/g, (_, sign, d) => `${sign === '-' ? 'minus' : 'plus'} ${d}`);
}
