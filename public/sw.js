// Service Worker for ReadWise Spark
// Improves performance by caching key resources and providing offline support

const CACHE_NAME = 'readwise-spark-v1';

// Resources we want to cache immediately
const PRECACHE_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg'
];

// Install event - precache key resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service worker pre-caching resources');
        return cache.addAll(PRECACHE_RESOURCES);
      })
      .catch(error => {
        console.error('Pre-caching failed:', error);
      })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service worker removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control immediately
  self.clients.claim();
});

// Fetch event - serve from cache if available, otherwise fetch from network and cache
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip browser extensions and browser-specific URLs
  if (event.request.url.includes('/chrome-extension/') || 
      event.request.url.includes('/devtools/') || 
      event.request.url.includes('extension://')) {
    return;
  }
  
  // Skip service worker and API requests
  if (event.request.url.includes('/sw.js') || 
      event.request.url.includes('/api/')) {
    return;
  }
  
  // Apply network-first caching strategy
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fall back to cache if network fails
        return caches.match(event.request);
      })
  );
}); 