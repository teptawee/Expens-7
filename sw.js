const CACHE_NAME = 'money-tracker-v1';
const ASSETS = [
  './',
  './index.html',
  './add.html',
  './settings.html',
  './manifest.json',
  './css/style.css',
  './js/config.js',
  './js/api.js',
  './js/dashboard.js',
  './js/add.js',
  './js/settings.js',
  './js/quickadd.js',
  './js/pwa.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // ไม่ cache API ของ Google Apps Script
  if (url.hostname.includes('script.google.com')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
