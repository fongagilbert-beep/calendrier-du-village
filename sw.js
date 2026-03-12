// sw.js — service worker minimal pour activer l'installation PWA
self.addEventListener('install', (event) => {
  // active immédiatement la nouvelle version du SW
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // prend le contrôle de toutes les pages ouvertes
  event.waitUntil(clients.claim());
});

// (Optionnel) Fallback très simple pour les pannes réseau vers offline.html
self.addEventListener('fetch', (event) => {
  // Ne pas mettre de cache ici pour éviter tout effet de bord.
  // Si tu veux ajouter un fallback hors-ligne ultra-basique :
  // if (event.request.mode === 'navigate') {
  //   event.respondWith(
  //     fetch(event.request).catch(() => caches.match('/offline.html'))
  //   );
  // }
});
``
