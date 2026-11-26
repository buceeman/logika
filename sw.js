const CACHE_NAME = 'logika-muhely-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/icon.svg',
  './styles/main.css?v=4',
  './shared/logika-core.js?v=4',
  './kovacs-muhelye/index.html',
  './kovacs-muhelye/styles.css?v=3',
  './kovacs-muhelye/app.js?v=3',
  './buvos-utveszto/index.html',
  './buvos-utveszto/styles.css?v=3',
  './buvos-utveszto/app.js?v=3',
  './merleg-vasar/index.html',
  './merleg-vasar/styles.css?v=3',
  './merleg-vasar/app.js?v=3',
  './szabaly-kameleon/index.html',
  './szabaly-kameleon/styles.css?v=3',
  './szabaly-kameleon/app.js?v=3',
  './tukor-var/index.html',
  './tukor-var/styles.css?v=3',
  './tukor-var/app.js?v=3',
  './erdei-nyomozo/index.html',
  './erdei-nyomozo/styles.css?v=3',
  './erdei-nyomozo/app.js?v=3',
  './postas-suni/index.html',
  './postas-suni/styles.css?v=4',
  './postas-suni/app.js?v=4',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
