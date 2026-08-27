/**
 * Fovea — the running state.
 *
 * Owns the test-mode chrome switch and the hand-off from a runner's raw result
 * into the store. Runners themselves know nothing about routing or persistence.
 */

import { h, icon, createView } from '../core/dom.js';
import { byId } from '../tests/registry.js';
import { loadRunner, hasRunner } from '../tests/runners.js';
import { enterTestMode, exitTestMode } from '../core/prefs.js';
import { store } from '../core/store.js';

/** Where a completed result is stashed for the result screen to pick up. */
export let lastResult = null;

export async function testRunView({ params }) {
  const test = byId(params.id);

  if (!test || !hasRunner(params.id)) {
    return createView(h('div.view.container.section',
      h('div.empty',
        h('h1', 'That check is not available'),
        h('p', 'Its module has not been built yet.'),
        h('p', h('a.btn.btn--secondary', { href: '#/tests' }, 'See all checks')))));
  }

  const runnerModule = await loadRunner(params.id);
  enterTestMode(runnerModule.testMode ?? 'neutral');

  const host = h('div.view');
  const view = createView(host);

  const instance = runnerModule.create({
    options: { figureKind: store.get().prefs.kidsMode ? 'shape' : 'digits' },
    onComplete(result) {
      const session = store.latestSession && !store.latestSession.completedAt
        ? store.latestSession
        : store.startSession({ mode: 'single' });

      store.addResult(session.id, result);
      store.completeSession(session.id);
      lastResult = result;

      exitTestMode();
      window.location.hash = `#/t/${params.id}/result`;
    },
  });

  host.append(instance.el);

  view.onDestroy(() => {
    instance.destroy();
    exitTestMode();
  });

  return view;
}
