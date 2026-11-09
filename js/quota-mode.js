/**
 * Silverhawk — Mode Hemat / Normal (penghematan kuota Supabase Free)
 * Mode disimpan di localStorage (langsung berlaku di klien) + disinkron ke DB bila memungkinkan.
 */
(function (global) {
  var KEY = "sh_quota_mode";
  var CACHE_KEY = "sh_quota_mode_cache";
  var MODE_HEMAT = "hemat";
  var MODE_NORMAL = "normal";

  function readLocal() {
    try {
      var v = localStorage.getItem(KEY);
      if (v === MODE_HEMAT || v === MODE_NORMAL) return v;
    } catch (e) {}
    return MODE_NORMAL;
  }

  function writeLocal(mode) {
    try {
      localStorage.setItem(KEY, mode);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ mode: mode, at: Date.now() }));
    } catch (e) {}
  }

  function getMode() {
    return readLocal();
  }

  function isHemat() {
    return getMode() === MODE_HEMAT;
  }

  function isNormal() {
    return !isHemat();
  }

  /** Deteksi error kuota / restriksi Supabase */
  function isQuotaError(err) {
    if (!err) return false;
    var msg = "";
    if (typeof err === "string") msg = err;
    else if (err.message) msg = String(err.message);
    else if (err.error_description) msg = String(err.error_description);
    else {
      try {
        msg = JSON.stringify(err);
      } catch (e) {
        msg = String(err);
      }
    }
    msg = msg.toLowerCase();
    return (
      msg.indexOf("exceed_egress_quota") >= 0 ||
      msg.indexOf("exceed_cached_egress_quota") >= 0 ||
      msg.indexOf("service for this project is restricted") >= 0 ||
      msg.indexOf("spend caps") >= 0 ||
      (msg.indexOf("402") >= 0 && msg.indexOf("quota") >= 0)
    );
  }

  function extractErrorText(err) {
    if (!err) return "";
    if (typeof err === "string") return err;
    if (err.message) {
      var m = String(err.message);
      // kadang message sudah JSON
      try {
        var j = JSON.parse(m);
        if (j && j.message) return typeof j.message === "string" ? j.message : JSON.stringify(j, null, 2);
      } catch (e) {}
      return m;
    }
    try {
      return JSON.stringify(err, null, 2);
    } catch (e2) {
      return String(err);
    }
  }

  /**
   * Tampilkan info box ramah untuk error kuota.
   * @param {HTMLElement|string} host - elemen container atau selector
   * @param {*} err
   * @param {object} [opts]
   */
  function showQuotaInfoBox(host, err, opts) {
    opts = opts || {};
    var el = typeof host === "string" ? document.querySelector(host) : host;
    if (!el) return;

    var detail = extractErrorText(err);
    var title = opts.title || "Layanan database sementara terbatas";
    var body =
      opts.body ||
      "Ada kendala pada plan langganan database (kuota data transfer/egress). " +
        "Silakan menunggu hingga siklus kuota diperbarui, atau coba lagi di lain kesempatan. " +
        "Fitur login dan data real-time mungkin tidak tersedia sementara.";

    var box = document.createElement("div");
    box.className = "sh-quota-infobox";
    box.setAttribute("role", "alert");
    box.innerHTML =
      '<div class="sh-quota-infobox__icon" aria-hidden="true">⚠️</div>' +
      '<div class="sh-quota-infobox__body">' +
      "<strong>" +
      escapeHtml(title) +
      "</strong>" +
      "<p>" +
      escapeHtml(body) +
      "</p>" +
      '<button type="button" class="sh-quota-infobox__toggle" aria-expanded="false">Detail teknis</button>' +
      '<pre class="sh-quota-infobox__detail" hidden></pre>' +
      "</div>";

    var pre = box.querySelector(".sh-quota-infobox__detail");
    pre.textContent = detail || "(tidak ada detail)";

    var toggle = box.querySelector(".sh-quota-infobox__toggle");
    toggle.addEventListener("click", function () {
      var open = pre.hasAttribute("hidden");
      if (open) {
        pre.removeAttribute("hidden");
        toggle.setAttribute("aria-expanded", "true");
        toggle.textContent = "Sembunyikan detail";
      } else {
        pre.setAttribute("hidden", "");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "Detail teknis";
      }
    });

    // ganti konten host (atau append jika opts.append)
    if (opts.append) {
      el.appendChild(box);
    } else {
      el.innerHTML = "";
      el.appendChild(box);
    }
    return box;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Konfigurasi perilaku hemat vs normal */
  function config() {
    if (isHemat()) {
      return {
        mode: MODE_HEMAT,
        galleryCacheMs: 15 * 60 * 1000, // 15 menit
        chatRealtime: false,
        chatPollMs: 45000,
        typingPresence: false,
        onlinePresence: false,
        announceRealtime: false,
        announcePollMs: 120000,
        attendanceRealtime: false,
        attendancePollMs: 90000,
        statsRefreshMs: 180000,
        narrowSelect: true,
      };
    }
    return {
      mode: MODE_NORMAL,
      galleryCacheMs: 60 * 1000,
      chatRealtime: true,
      chatPollMs: 0,
      typingPresence: true,
      onlinePresence: true,
      announceRealtime: true,
      announcePollMs: 30000,
      attendanceRealtime: true,
      attendancePollMs: 20000,
      statsRefreshMs: 45000,
      narrowSelect: false,
    };
  }

  async function setMode(mode, opts) {
    opts = opts || {};
    mode = mode === MODE_HEMAT ? MODE_HEMAT : MODE_NORMAL;
    writeLocal(mode);
    // coba sinkron ke DB (admin)
    if (opts.syncDb !== false && global.GalleryDB && typeof global.GalleryDB.setAppSetting === "function") {
      try {
        await global.GalleryDB.setAppSetting("quota_mode", { mode: mode, updated_at: new Date().toISOString() });
      } catch (e) {
        // DB mungkin sedang di-restrict — localStorage tetap berlaku
        console.warn("[quota-mode] sync DB gagal (mode lokal tetap aktif):", e);
      }
    }
    try {
      global.dispatchEvent(new CustomEvent("sh-quota-mode", { detail: { mode: mode } }));
    } catch (e2) {}
    return mode;
  }

  /** Muat mode dari DB (jika ada) lalu terapkan ke localStorage */
  async function hydrateFromDb() {
    if (!global.GalleryDB || typeof global.GalleryDB.getAppSetting !== "function") return getMode();
    try {
      var row = await global.GalleryDB.getAppSetting("quota_mode");
      var v = row && row.value;
      var m = v && (v.mode || v);
      if (m === MODE_HEMAT || m === MODE_NORMAL) {
        writeLocal(m);
        return m;
      }
    } catch (e) {
      // ignore — pakai lokal
    }
    return getMode();
  }

  global.SHQuotaMode = {
    KEY: KEY,
    HEMAT: MODE_HEMAT,
    NORMAL: MODE_NORMAL,
    getMode: getMode,
    isHemat: isHemat,
    isNormal: isNormal,
    setMode: setMode,
    config: config,
    isQuotaError: isQuotaError,
    extractErrorText: extractErrorText,
    showQuotaInfoBox: showQuotaInfoBox,
    hydrateFromDb: hydrateFromDb,
  };
})(window);
