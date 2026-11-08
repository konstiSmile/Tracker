// Offline-Speicher: erst Netz (immer aktuell), sonst Zwischenspeicher.
// Bei jeder Änderung die Version erhöhen.
const CACHE = 'tracker-v11';
const FILES = ['./', 'index.html', 'app.js', 'app.css', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => { if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return res; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
