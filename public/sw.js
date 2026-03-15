/* ============================================================
   EK-SMS Service Worker
   Strategy:
   - Static assets → cache-first (fast repeat visits)
   - HTML navigation → network-first with cache fallback (always fresh)
   - API calls → network-only (never cache auth/data)
   ============================================================ */

const CACHE_VERSION = 'ek-sms-v1';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const PAGE_CACHE    = `${CACHE_VERSION}-pages`;

/* Assets to pre-cache on install */
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
];

/* ── Install: pre-cache critical assets ── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: prune old caches ── */
self.addEventListener('activate', (event) => {
  const validCaches = [STATIC_CACHE, PAGE_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => !validCaches.includes(k))
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch: routing strategy ── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  /* Skip non-GET requests */
  if (request.method !== 'GET') return;

  /* Skip API calls — always go to network */
  if (url.pathname.startsWith('/api/')) return;

  /* Skip Chrome extension requests */
  if (!url.protocol.startsWith('http')) return;

  /* HTML navigation → network-first, fall back to cache */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(PAGE_CACHE).then((c) => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  /* Static assets → cache-first, update in background */
  event.respondWith(
    caches.match(request).then((cached) => {
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch((err) => {
          console.warn('SW fetch failed, using cache fallback:', request.url, err);
          return cached || Response.error();
        });
    })
  );
});
