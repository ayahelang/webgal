/* WebGal static cache — PSI: long-lived static assets */
const CACHE = "webgal-static-v4";
const ASSETS = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/theme.js",
  "/assets/favicon.svg",
  "/site.webmanifest",
];
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const u = e.request.url;
  if (e.request.method !== "GET") return;
  if (/supabase|google|gtag|googletagmanager|youtube|doubleclick/i.test(u)) return;
  // Cache-first for static; network for HTML navigations with fallback
  const isNav = e.request.mode === "navigate";
  const isStatic = /\.(css|js|svg|png|webp|woff2|ico|json)(\?|$)/i.test(u);
  if (!isNav && !isStatic && !u.endsWith("/")) return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request)
        .then((res) => {
          if (res && res.ok && (isStatic || u.endsWith("/"))) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit);
      // Static: prefer cache (faster repeat). Navigate: prefer network.
      if (isStatic) return hit || net;
      return net.then((r) => r || hit);
    })
  );
});
