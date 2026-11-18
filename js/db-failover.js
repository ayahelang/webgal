/*! SH DB failover: Supabase <-> Firebase (bantu saat kuota) */
(function (global) {
  "use strict";
  var LS = "sh_db_backend"; // supabase | firebase
  var QUOTA_RE = /quota|limit|exceed|402|429|payment|disabled|resource|fetch failed|Failed to fetch|network/i;
  var _initPromise = null;

  function getPreferred() {
    try {
      return localStorage.getItem(LS) || "supabase";
    } catch (e) {
      return "supabase";
    }
  }
  function setPreferred(b) {
    try {
      localStorage.setItem(LS, b);
    } catch (e) {}
    global.SH_DB_BACKEND = b;
  }

  function isQuotaError(err) {
    var msg = String((err && (err.message || err.error_description || err)) || "");
    var code = err && (err.status || err.code || err.statusCode);
    if (code === 402 || code === 429 || code === 546) return true;
    return QUOTA_RE.test(msg);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensureFirebase() {
    if (global.SH_FIREBASE_APP && global.SH_FIRESTORE) return global.SH_FIREBASE_APP;
    if (!global.SH_FIREBASE_ENABLED || !global.FIREBASE_CONFIG || !global.FIREBASE_CONFIG.apiKey) {
      return null;
    }
    if (_initPromise) return _initPromise;
    _initPromise = (async function () {
      // compat SDK — cocok untuk GitHub Pages tanpa bundler
      await loadScript("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
      await loadScript("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js");
      if (!global.firebase || !firebase.initializeApp) {
        throw new Error("Firebase SDK gagal dimuat");
      }
      var app;
      try {
        app = firebase.app();
      } catch (e) {
        app = firebase.initializeApp(global.FIREBASE_CONFIG);
      }
      global.SH_FIREBASE_APP = app;
      global.SH_FIRESTORE = firebase.firestore();
      return app;
    })();
    try {
      return await _initPromise;
    } catch (e) {
      _initPromise = null;
      console.warn("[SHDbFailover] Firebase init", e);
      return null;
    }
  }

  /** Simpan flag mode / status ringan di Firestore saat Supabase down */
  async function writeMeta(key, value) {
    await ensureFirebase();
    if (!global.SH_FIRESTORE) throw new Error("Firestore belum siap");
    await SH_FIRESTORE.collection("sh_meta").doc(String(key)).set(
      {
        value: value,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
    return true;
  }

  async function readMeta(key) {
    await ensureFirebase();
    if (!global.SH_FIRESTORE) throw new Error("Firestore belum siap");
    var snap = await SH_FIRESTORE.collection("sh_meta").doc(String(key)).get();
    if (!snap.exists) return null;
    var d = snap.data() || {};
    return d.value != null ? d.value : d;
  }

  async function pingFirebase() {
    var app = await ensureFirebase();
    if (!app) return { ok: false, reason: "firebase_not_configured" };
    try {
      // baca doc yang mungkin belum ada — tetap validasi koneksi
      await SH_FIRESTORE.collection("sh_meta").doc("ping").get();
      return { ok: true, backend: "firebase", projectId: (FIREBASE_CONFIG && FIREBASE_CONFIG.projectId) || "" };
    } catch (e) {
      return { ok: false, reason: (e && e.message) || String(e) };
    }
  }

  async function tryFallback(err) {
    var quota = isQuotaError(err);
    if (!global.SH_FIREBASE_ENABLED || !global.FIREBASE_CONFIG || !global.FIREBASE_CONFIG.apiKey) {
      return {
        ok: false,
        reason: "Firebase belum dikonfigurasi / belum di-enable.",
        from: getPreferred(),
        quotaError: quota,
      };
    }
    var ping = await pingFirebase();
    if (!ping.ok) {
      return {
        ok: false,
        reason: ping.reason || "Firebase tidak siap",
        from: getPreferred(),
        quotaError: quota,
      };
    }
    setPreferred("firebase");
    try {
      await writeMeta("backend", "firebase");
      await writeMeta("lastFailoverAt", Date.now());
    } catch (e2) {
      /* rules mungkin blok write tanpa auth — abaikan */
    }
    return {
      ok: true,
      backend: "firebase",
      note: "Dialihkan ke Firebase (sementara)",
      quotaError: quota,
    };
  }

  // Init diam-diam bila preferensi sudah firebase atau enable
  function boot() {
    global.SH_DB_BACKEND = getPreferred();
    if (global.SH_FIREBASE_ENABLED && getPreferred() === "firebase") {
      ensureFirebase().catch(function () {});
    }
  }

  global.SHDbFailover = {
    getPreferred: getPreferred,
    setPreferred: setPreferred,
    isQuotaError: isQuotaError,
    tryFallback: tryFallback,
    ensureFirebase: ensureFirebase,
    pingFirebase: pingFirebase,
    writeMeta: writeMeta,
    readMeta: readMeta,
  };
  global.SH_DB_BACKEND = getPreferred();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : this);
