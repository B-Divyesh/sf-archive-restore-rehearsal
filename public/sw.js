const VERSION = 'arr-v4';
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const CORE = ['/', '/index.html', '/offline.html', '/404.html', '/privacy/', '/terms/', '/legal.css', '/manifest.webmanifest', '/assets/recovery-bench.webp', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then(async (cache) => {
    await cache.addAll(CORE);
    const html = await (await fetch('/index.html')).text();
    const builtAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map((match) => match[1]);
    await cache.addAll(builtAssets);
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(SHELL).then((cache) => cache.put(request, copy));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('/index.html')) || caches.match('/offline.html')));
    return;
  }
  if (/\.(?:js|css|png|webp|svg|webmanifest)$/.test(url.pathname)) {
    event.respondWith(caches.match(request, { ignoreVary: true }).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(ASSETS).then((cache) => cache.put(request, response.clone()));
      return response;
    })));
  }
});
