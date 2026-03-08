// sw.js — V11 (GitHub Pages + data.json réseau-d'abord)
const CACHE = 'cvillage-v11g';
const CORE = ['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./offline.html','./icons/icon-192.png','./icons/icon-512.png'];
const isGET = (req) => req.method==='GET';
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE))); self.skipWaiting(); });
self.addEventListener('activate', e=>{ e.waitUntil((async()=>{ const keys=await caches.keys(); await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))); if('navigationPreload' in self.registration){ await self.registration.navigationPreload.enable(); } })()); self.clients.claim(); });
self.addEventListener('fetch', e=>{ const req=e.request; if(!isGET(req)) return; const url=new URL(req.url);
  if(req.mode==='navigate'){
    e.respondWith((async()=>{ try{ const preload='preloadResponse' in e? await e.preloadResponse:null; if(preload) return preload; const net=await fetch(req); const cache=await caches.open(CACHE); cache.put(req, net.clone()).catch(()=>{}); return net; } catch{ return (await caches.match('./offline.html')) || (await caches.match('./index.html')) || Response.error(); } })()); return; }
  if(url.pathname.endsWith('/data.json')){
    e.respondWith((async()=>{ const cache=await caches.open(CACHE); try{ const net=await fetch(req,{cache:'no-store'}); cache.put(req, net.clone()).catch(()=>{}); return net; } catch{ return (await cache.match(req)) || Response.error(); } })()); return; }
  e.respondWith((async()=>{ const cache=await caches.open(CACHE); const cached=await cache.match(req); const update=fetch(req).then(r=>{ if(r&&r.ok) cache.put(req,r.clone()); return r; }).catch(()=>null); if(cached) return cached; const fresh=await update; if(fresh) return fresh; return Response.error(); })());
});
