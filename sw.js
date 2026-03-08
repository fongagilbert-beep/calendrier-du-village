// sw.js — V7 (fiable+)
const CACHE = 'cvillage-v7';
const CORE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.webmanifest',
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];
const sameOrigin = (url) => url.origin === self.location.origin;
const isGET = (req) => req.method === 'GET';
const coreSet = new Set(CORE);
const MAX_ENTRIES = 120;
async function trimCache(cacheName, max){ const cache=await caches.open(cacheName); const keys=await cache.keys(); if(keys.length<=max) return; const toDelete=keys.length-max; for(let i=0;i<toDelete;i++){ await cache.delete(keys[i]); } }
self.addEventListener('install', (event)=>{ event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE))); self.skipWaiting(); });
self.addEventListener('activate', (event)=>{ event.waitUntil((async()=>{ const keys=await caches.keys(); await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))); if('navigationPreload' in self.registration){ await self.registration.navigationPreload.enable(); } })()); self.clients.claim(); });
self.addEventListener('fetch', (event)=>{ const req=event.request; if(!isGET(req)) return; const url=new URL(req.url);
  if(req.mode==='navigate'){
    event.respondWith((async()=>{ try{ const preload='preloadResponse' in event? await event.preloadResponse:null; if(preload){ const cache=await caches.open(CACHE); cache.put(req, preload.clone()).catch(()=>{}); return preload; } const net=await fetch(req); const cache=await caches.open(CACHE); cache.put(req, net.clone()).catch(()=>{}); return net; } catch(e){ return (await caches.match('/offline.html')) || (await caches.match('/index.html')) || Response.error(); } })()); return; }
  if(sameOrigin(url)){
    if(coreSet.has(url.pathname) || coreSet.has('.'+url.pathname) || (url.pathname==='/' && coreSet.has('/index.html'))){
      event.respondWith((async()=>{ const cache=await caches.open(CACHE); const cached=await cache.match(req); const update=fetch(req).then(res=>{ if(res&&res.ok) cache.put(req,res.clone()); return res; }).catch(()=>null); if(cached){ update.finally(()=>trimCache(CACHE, MAX_ENTRIES)); return cached; } const fresh=await update; if(fresh) return fresh; return Response.error(); })()); return; }
  }
  event.respondWith((async()=>{ try{ return await fetch(req); } catch(e){ return (await caches.match(req)) || Response.error(); } })());
});
