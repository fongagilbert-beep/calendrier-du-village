
const CACHE_NAME = 'calendrier-8j-v3';
const ASSETS = [
  './', './index.html','./styles.css','./app.js','./offline.html','./manifest.webmanifest','./data.json',
  './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./icons/icon-maskable-512.png']
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS))); });
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))); });
self.addEventListener('fetch', e=>{ e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request).catch(()=>caches.match('./offline.html')))); });
