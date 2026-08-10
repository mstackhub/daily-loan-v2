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
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const isApi = url.hostname.includes('supabase.co');
  
  // Next.js App Router routing fetches RSC data via standard page URLs 
  // but with RSC headers. Service Worker must bypass cache for these
  // requests, otherwise Next.js client router receives HTML instead of RSC
  // stream and crashes/reloads the page.
  const isNextData = url.pathname.startsWith('/_next') || 
                     event.request.headers.has('rsc') || 
                     event.request.headers.has('next-router-state-tree') || 
                     event.request.headers.has('next-router-prefetch');

  if (isApi || isNextData) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
