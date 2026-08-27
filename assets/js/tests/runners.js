/**
 * Fovea — runner registry.
 *
 * Maps a test id to the module that actually presents it. A test can be listed
 * in the catalogue before its runner exists; `hasRunner` lets the intro screen
 * say so plainly instead of offering a Begin button that goes nowhere.
 */

const RUNNERS = {
  'color-plates': () => import('./runners/color-plates-runner.js'),
  'amsler': () => import('./runners/amsler-runner.js'),
  'astigmatism': () => import('./runners/astigmatism-runner.js'),
  'reaction': () => import('./runners/reaction-runner.js'),
};

export const hasRunner = (id) => Object.hasOwn(RUNNERS, id);

export async function loadRunner(id) {
  const loader = RUNNERS[id];
  if (!loader) throw new Error(`No runner for test "${id}"`);
  const mod = await loader();
  return mod.runner;
}
