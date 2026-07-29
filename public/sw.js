const CACHE_NAME = 'debtflow-v2-cache-v1';
const urlsToCache = [
  '/dashboard',
  '/debtors',
  '/payments',
  '/overdue',
  '/settings',
  '/manifest.json',
  '/icon.svg',
  '/icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
