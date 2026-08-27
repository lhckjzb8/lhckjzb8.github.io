// sw.js pwa安装

const CACHE_NAME = 'KjPwa-Y202608-V1.1';

const mandatoryFiles = [
  '/',
  '/index.html',
  '/tj.html',
  '/manifest.json',
  '/manifest_tj.json',
  '/js/app.js',
  '/js/tj.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(
        mandatoryFiles.map(function (url) {
          return cache.add(url).catch(function () {});
        })
      );
    })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  const requestUrl = new URL(e.request.url);
  if (!requestUrl.protocol.startsWith('http')) return;
  const isApiOrJsonData = 
    requestUrl.pathname.includes('/api/') || 
    requestUrl.pathname.includes('/ws/') || 
    requestUrl.pathname.includes('ajax') || 
    requestUrl.search.includes('ping_cache_bypass') ||
    (e.request.headers.get('accept') && e.request.headers.get('accept').includes('application/json'));
  if (isApiOrJsonData) return;
  const isStaticResource = 
    requestUrl.pathname.endsWith('.js') || 
    requestUrl.pathname.endsWith('.css') || 
    /\.(png|jpg|jpeg|gif|ico|svg|webp)$/i.test(requestUrl.pathname);
  if (isStaticResource) {
    e.respondWith(
      caches.match(e.request).then(function (cacheResponse) {
        return cacheResponse || fetch(e.request).then(function (networkResponse) {
          if (networkResponse && networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(e.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match(e.request).then(function (cacheResponse) {
        const fetchPromise = fetch(e.request).then(function (networkResponse) {
          if (networkResponse && networkResponse.ok) {
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(e.request, networkResponse); 
            });
          }
          return networkResponse;
        }).catch(function() {});
        if (cacheResponse) {
          return cacheResponse;
        }
        return fetchPromise;
      }).catch(function () {
        return caches.match('/index.html');
      })
    );
  }
});
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});
self.addEventListener('message', function (e) {
  if (e.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
