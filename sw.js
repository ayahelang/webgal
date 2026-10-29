/* WebGal static cache — kunjungan ulang */
const CACHE = 'webgal-static-v3';
const ASSETS = ['/', '/index.html', '/css/style.css', '/js/theme.js', '/assets/favicon.svg'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const u = e.request.url;
  if (e.request.method !== 'GET') return;
  if (/supabase|google|gtag|googletagmanager/i.test(u)) return;
  if (/\.(css|js|svg|png|webp|woff2)(\?|$)/i.test(u) || u.endsWith('/')) {
    e.respondWith(
      caches.match(e.request).then((hit) => {
        const net = fetch(e.request).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
