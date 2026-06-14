const CACHE_NAME = 'prolabo-briefing-v2';
const ASSETS = [
  '/prolabo-briefing/',
  '/prolabo-briefing/index.html',
  '/prolabo-briefing/style.css',
  '/prolabo-briefing/app.js',
  '/prolabo-briefing/manifest.json',
  '/prolabo-briefing/icon-192.png',
  '/prolabo-briefing/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(ASSETS).catch(err => console.warn('cache失敗:', err))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
