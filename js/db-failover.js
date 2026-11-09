/*! SH DB failover: Supabase <-> Firebase (opsional) */
(function (global) {
  "use strict";
  var LS = "sh_db_backend"; // supabase | firebase
  var QUOTA_RE = /quota|limit|exceed|402|429|payment|disabled|resource/i;

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

  async function tryFallback(err) {
    if (!isQuotaError(err) && getPreferred() === "supabase") {
      // still allow manual switch later
    }
    // Firebase configured?
    var cfg = global.FIREBASE_CONFIG || (global.SH_FIREBASE && global.SH_FIREBASE.config);
    if (!cfg || !cfg.apiKey) {
      return {
        ok: false,
        reason: "Firebase belum dikonfigurasi. Isi js/firebase-config.js lalu refresh.",
        from: getPreferred(),
      };
    }
    if (!global.firebase && !global.SH_FIREBASE_APP) {
      return {
        ok: false,
        reason: "SDK Firebase belum termuat. Ikuti panduan FIREBASE-SETUP.md",
        from: getPreferred(),
      };
    }
    setPreferred("firebase");
    return { ok: true, backend: "firebase", note: "Dialihkan ke Firebase (sementara)" };
  }

  global.SHDbFailover = {
    getPreferred: getPreferred,
    setPreferred: setPreferred,
    isQuotaError: isQuotaError,
    tryFallback: tryFallback,
  };
  global.SH_DB_BACKEND = getPreferred();
})(typeof window !== "undefined" ? window : this);
