// sw.js — V7 (GitHub Pages friendly + data.json réseau-d'abord)
const CACHE = 'cvillage-v8-github';
const CORE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './offline.html',
  './icons/icon-192.png',
  './icons/icon-512.png'
  // NOTE: on NE précache PAS data.json pour rester à jour
];
const sameOrigin = (url) => url.origin === self.location.origin;
const isGET = (req) => req.method === 'GET';
const coreSet = new Set(CORE);
const MAX_ENTRIES = 200;
async function trimCache(cacheName, max){ const cache=await caches.open(cacheName); const keys=await cache.keys(); if(keys.length<=max) return; const toDelete=keys.length-max; for(let i=0;i<toDelete;i++){ await cache.delete(keys[i]); } }
self.addEventListener('install', (event)=>{ event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE))); self.skipWaiting(); });
self.addEventListener('activate', (event)=>{ event.waitUntil((async()=>{ const keys=await caches.keys(); await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))); if('navigationPreload' in self.registration){ await self.registration.navigationPreload.enable(); } })()); self.clients.claim(); });
self.addEventListener('fetch', (event)=>{ const req=event.request; if(!isGET(req)) return; const url=new URL(req.url);
  // Navigation
  if(req.mode==='navigate'){
    event.respondWith((async()=>{ try{ const preload='preloadResponse' in event? await event.preloadResponse:null; if(preload){ const cache=await caches.open(CACHE); cache.put(req, preload.clone()).catch(()=>{}); return preload; } const net=await fetch(req); const cache=await caches.open(CACHE); cache.put(req, net.clone()).catch(()=>{}); return net; } catch(e){ return (await caches.match('./offline.html')) || (await caches.match('./index.html')) || Response.error(); } })()); return; }
  // data.json: réseau d'abord, fallback cache
  if (sameOrigin(url) && url.pathname.endsWith('/data.json')){
    event.respondWith((async()=>{ const cache=await caches.open(CACHE); try{ const net=await fetch(req, { cache:'no-store' }); cache.put(req, net.clone()).catch(()=>{}); return net; } catch(e){ const cached=await cache.match(req); return cached || Response.error(); } })()); return; }
  // CORE : SWR
  if(sameOrigin(url)){
    const p = url.pathname.endsWith('/') ? './' : '.' + url.pathname.substring(url.pathname.lastIndexOf('/'));
    if(coreSet.has(p)){
      event.respondWith((async()=>{ const cache=await caches.open(CACHE); const cached=await cache.match(req); const update=fetch(req).then(res=>{ if(res&&res.ok) cache.put(req,res.clone()); return res; }).catch(()=>null); if(cached){ update.finally(()=>trimCache(CACHE, MAX_ENTRIES)); return cached; } const fresh=await update; if(fresh) return fresh; return Response.error(); })()); return; }
  }
  // Default
  event.respondWith((async()=>{ try{ return await fetch(req); } catch(e){ return (await caches.match(req)) || Response.error(); } })());
});
