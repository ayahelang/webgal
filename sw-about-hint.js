/* Opsional: cache aset statis same-origin lebih lama (bantu kunjungan ulang). */
const CACHE = "webgal-static-v1";
const PRE = ["./css/style.css", "./assets/teddy-mulyana.webp", "./assets/favicon.svg"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin) return;
  if (!/\.(css|js|webp|jpg|png|svg|woff2)$/i.test(u.pathname)) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(e.request);
      const fetchP = fetch(e.request).then((res) => {
        if (res && res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(() => hit);
      return hit || fetchP;
    })
  );
});
