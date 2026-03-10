/* sw.js — version durcie pour éviter chrome-extension:// & co  */

const CACHE = 'cv-2026-03-09-08';  // <-- change à chaque version
const CORE_ASSETS = [
  '/', '/index.html', '/styles.css', '/app.js', '/data.json',
  '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      await cache.addAll(CORE_ASSETS);
    } catch (e) {
      // En dev, certaines routes peuvent ne pas exister (pas bloquant)
      console.warn('[SW] Precaching warning:', e);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) On ne traite que les GET
  if (req.method !== 'GET') return;

  // 2) On ne gère que http(s) — on ignore chrome-extension://, data:, file:, etc.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // 3) Politique : on ne met en cache que le même origine (évite CORS/opaque)
  const sameOrigin = (url.origin === self.location.origin);

  if (sameOrigin && url.pathname.endsWith('/data.json')) {
    // Stale-While-Revalidate pour les données
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  if (sameOrigin) {
    // Cache-first pour les assets du site
    event.respondWith(cacheFirst(req));
    return;
  }

  // 4) Ressources tierces : on laisse passer sans mise en cache
  return; // => comportement réseau par défaut
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const res = await fetch(request);
    if (res && res.ok && res.type !== 'opaque') {
      await cache.put(request, res.clone());
    }
    return res;
  } catch (e) {
    // Offline et rien en cache
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request).then(async res => {
    if (res && res.ok && res.type !== 'opaque') {
      await cache.put(request, res.clone());
    }
    return res;
  }).catch(() => undefined);

  return cached || networkPromise || Response.error();
}
