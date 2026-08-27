/**
 * Fovea — service worker.
 *
 * Precaches the whole app so it works offline. The site is small and entirely
 * static, so there is no cache-invalidation subtlety to get wrong: bump
 * CACHE_VERSION on release and the old cache is dropped wholesale.
 *
 * This worker never contacts another origin. A request that is not same-origin
 * is passed straight through untouched rather than cached, so the privacy
 * promise holds even if a future change introduces one by accident.
 */

const CACHE_VERSION = 'fovea-v2.0.0';

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/tokens.css',
  './assets/css/base.css',
  './assets/css/components.css',
  './assets/css/app.css',
  './assets/js/theme-init.js',
  './assets/js/main.js',
  './assets/icons/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      // Individual misses must not fail the whole install.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch another origin

  // Stale-while-revalidate: instant from cache, refreshed in the background.
  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
