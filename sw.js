// Offline-Speicher: erst Netz (immer aktuell), sonst Zwischenspeicher.
// Bei jeder Änderung die Version erhöhen.
const CACHE = 'tracker-v46';
const FILES = ['./', 'index.html', 'app.js', 'app.css', 'tokens.css', 'icons.js', 'fonts/Lora-Variable.ttf', 'fonts/InstrumentSans-Regular.ttf', 'fonts/InstrumentSans-Bold.ttf', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => { if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return res; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
// Mitteilungen (4.2): kommen von der Edge Function „tracker-push“. Tippen öffnet den Tracker.
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Tracker', { body: d.body || '', tag: d.tag || 'tracker', icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url || './' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => {
    const c = l.find(x => x.url.startsWith(self.registration.scope));
    return c ? c.focus() : clients.openWindow(url);
  }));
});
