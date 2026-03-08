// sw.js — V6 (fiable)
const CACHE = 'cvillage-v6'; // <-- incrémente à chaque version
const CORE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 1) Installation : on précache le cœur
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE))
  );
  // Prend le contrôle SANS attendre l’onglet suivant
  self.skipWaiting();
});

// 2) Activation : on supprime tous les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  // Prend le contrôle des pages TOUT DE SUITE
  self.clients.claim();
});

// 3) Stratégie de fetch : cache-d’abord pour les fichiers statiques connus,
//    réseau-d’abord pour le reste (évite de servir une vieille page)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Hébergement même origine uniquement
  if (url.origin === self.location.origin) {
    // Si la ressource est dans CORE => cache-d’abord
    if (CORE.includes(url.pathname) || CORE.includes('.' + url.pathname)) {
      event.respondWith(
        caches.match(event.request).then((r) => r || fetch(event.request))
      );
      return;
    }
    // Pour index.html (navigation) => réseau-d’abord, fallback cache
    if (event.request.mode === 'navigate') {
      event.respondWith((async () => {
        try {
          const fresh = await fetch(event.request);
          const cache = await caches.open(CACHE);
          cache.put(event.request, fresh.clone());
          return fresh;
        } catch (e) {
          const cached = await caches.match(event.request);
          return cached || caches.match('./index.html');
        }
      })());
      return;
    }
  }
  // Par défaut : réseau-d’abord, fallback cache
  event.respondWith((async () => {
    try {
      const fresh = await fetch(event.request);
      return fresh;
    } catch (e) {
      const cached = await caches.match(event.request);
      return cached || Response.error();
    }
  })());
});
