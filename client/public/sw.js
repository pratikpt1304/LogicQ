/**
 * LogicQ Service Worker (/sw.js)
 *
 * Security & Caching Rules:
 * 1. Pre-caches only the static app shell (index.html, offline.html, manifest.webmanifest, icons, hashed JS/CSS/font assets).
 * 2. NEVER caches authenticated user data, /api/* responses, Firebase Auth tokens, Firestore responses,
 *    Cloud Functions calls, judge execution results, or Google Drive calls (strictly NetworkOnly).
 * 3. Uses 'prompt' update mode: a newly installed Service Worker waits until the user clicks
 *    "New version available — Refresh" (which sends `{ type: 'SKIP_WAITING' }`), so an active student
 *     never loses unsaved editor code or an in-flight submission.
 * 4. Listens for `{ type: 'CLEAR_USER_CACHE' }` on logout to purge runtime caches on shared devices.
 */

const CACHE_VERSION = 'logicq-shell-v17';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_VERSION) {
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data.type === 'CLEAR_USER_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_VERSION) {
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        )
      )
    );
  }
});

function isNetworkOnlyRequest(url, request) {
  if (request.method !== 'GET') return true;
  if (url.pathname.startsWith('/api/')) return true;
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('securetoken')
  ) {
    return true;
  }
  return false;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Network-only for all API, Auth, Firestore, Judge, and non-GET requests
  if (isNetworkOnlyRequest(url, request)) {
    return;
  }

  // 2. Navigation requests: Network-first with fallback to cached /index.html or /offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_VERSION);
        const cachedIndex = await cache.match('/index.html');
        if (cachedIndex) return cachedIndex;
        const offlineFallback = await cache.match('/offline.html');
        return offlineFallback || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // 3. Static hashed assets & fonts: Cache-first, falling back to network
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.woff2'))
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});
