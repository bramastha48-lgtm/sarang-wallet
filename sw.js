// ============================================
// WLLT-e Service Worker - PWA Support
// ============================================

const CACHE_NAME = 'wllte-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/app.html',
    '/auth.html',
    '/css/landing.css',
    '/css/app.css',
    '/css/auth.css',
    '/js/landing.js',
    '/js/app.js',
    '/js/auth.js',
    '/js/data.js',
    '/firebase-config.js',
    '/manifest.json'
];

// Install - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip Firebase/API requests
    if (event.request.url.includes('firebaseio.com') ||
        event.request.url.includes('googleapis.com') ||
        event.request.url.includes('gstatic.com/firebase') ||
        event.request.url.includes('identitytoolkit')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful responses
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache
                return caches.match(event.request).then((cached) => {
                    return cached || new Response('Offline', { status: 503 });
                });
            })
    );
});
