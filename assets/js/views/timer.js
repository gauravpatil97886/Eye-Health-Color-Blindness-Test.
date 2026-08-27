/**
 * Fovea — 20-20-20 break timer.
 *
 * Presented with the evidence stated honestly: the rule is sensible, widely
 * recommended, and supported by weaker evidence than its popularity suggests.
 */

import { h, icon, createView } from '../core/dom.js';
import { announce } from '../core/a11y.js';

export function timerView() {
  const WORK_MS = 20 * 60 * 1000;
  const BREAK_MS = 20 * 1000;

  let phase = 'idle';
  let remaining = WORK_MS;
  let handle = null;
  let wakeLock = null;

  const display = h('div', {
    style: {
      fontFamily: 'var(--font-mono)', fontSize: 'var(--text-5xl)',
      fontWeight: 'var(--weight-bold)', fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.03em',
    },
    role: 'timer', 'aria-live': 'off',
  }, '20:00');

  const label = h('p.lede', 'Ready when you are.');
  const startBtn = h('button.btn.btn--primary.btn--lg', { type: 'button' },
    icon('play', { size: 18 }), 'Start');

  function fmt(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function tick() {
    remaining -= 1000;
    display.textContent = fmt(remaining);

    if (remaining <= 0) {
      if (phase === 'work') {
        phase = 'break';
        remaining = BREAK_MS;
        label.textContent = 'Look at something about 20 feet (6 m) away. Blink a few times.';
        announce('Time for a break. Look about 6 metres away for 20 seconds.', { assertive: true });
      } else {
        phase = 'work';
        remaining = WORK_MS;
        label.textContent = 'Back to work. Next break in 20 minutes.';
        announce('Break over.');
      }
    }
  }

  async function start() {
    if (handle) { stop(); return; }
    phase = 'work';
    remaining = WORK_MS;
    display.textContent = fmt(remaining);
    label.textContent = 'Running. Next break in 20 minutes.';
    handle = setInterval(tick, 1000);
    startBtn.replaceChildren(icon('pause', { size: 18 }), document.createTextNode('Stop'));
    try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* optional */ }
  }

  function stop() {
    clearInterval(handle);
    handle = null;
    phase = 'idle';
    remaining = WORK_MS;
    display.textContent = fmt(remaining);
    label.textContent = 'Stopped.';
    startBtn.replaceChildren(icon('play', { size: 18 }), document.createTextNode('Start'));
    wakeLock?.release?.().catch(() => {});
    wakeLock = null;
  }

  const el = h('div.view.container.container--md.section',
    h('div.stack.stack--xl',
      h('div.stack.stack--sm',
        h('p.eyebrow', 'Tool'),
        h('h1', 'The 20-20-20 timer'),
        h('p.lede', 'Every 20 minutes, look at something 20 feet away for 20 seconds.')),

      h('div.card.card--sunken.center.stack',
        display, label,
        h('div.row.row--center', startBtn)),

      h('div.callout.callout--info',
        h('div.callout__icon', icon('info')),
        h('div.callout__body',
          h('p.callout__title', 'How well supported is this, actually?'),
          h('p', 'The 20-20-20 rule is recommended almost universally, but the direct ' +
                 'evidence behind the specific numbers is thinner than its popularity ' +
                 'implies. What is better established is that sustained near focus and a ' +
                 'reduced blink rate contribute to eye strain and dryness, and that ' +
                 'regular breaks help. Treat the exact intervals as a convenient habit ' +
                 'rather than a clinical prescription.'))),

      h('p.muted', { style: { fontSize: 'var(--text-sm)' } },
        'The timer keeps your screen awake while running, and stops when you leave the page. ' +
        'Nothing is recorded.')));

  const view = createView(el);
  view.listen(startBtn, 'click', start);
  view.onDestroy(() => { clearInterval(handle); wakeLock?.release?.().catch(() => {}); });
  return view;
}
