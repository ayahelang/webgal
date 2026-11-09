/*! Silverhawk economy mode + secret panel (Ctrl+Shift+Alt+M) */
(function () {
  "use strict";
  var KEY = "sh_economy_mode";
  var PANEL_ID = "shEcoPanel";

  function isOn() {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch (e) {
      return false;
    }
  }
  function setOn(v) {
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch (e) {}
    document.documentElement.classList.toggle("sh-economy", !!v);
    window.SH_ECONOMY = !!v;
    try {
      window.dispatchEvent(new CustomEvent("sh-economy-change", { detail: { on: !!v } }));
    } catch (e2) {}
  }

  // Apply early
  if (isOn()) {
    document.documentElement.classList.add("sh-economy");
    window.SH_ECONOMY = true;
  } else {
    window.SH_ECONOMY = false;
  }

  function ensurePanel() {
    var p = document.getElementById(PANEL_ID);
    if (p) return p;
    p = document.createElement("div");
    p.id = PANEL_ID;
    p.hidden = true;
    p.innerHTML =
      '<div class="sh-eco-backdrop" data-eco-close="1"></div>' +
      '<div class="sh-eco-card" role="dialog" aria-label="Panel mode hemat">' +
      '<div class="sh-eco-head"><strong>Panel cepat</strong><button type="button" class="sh-eco-x" data-eco-close="1" aria-label="Tutup">×</button></div>' +
      '<p class="sh-eco-desc">Mode hemat mengurangi panggilan realtime/polling agar kuota Supabase lebih awet. Admin tetap bisa dibuka bila sesi masih ada.</p>' +
      '<label class="sh-eco-row"><input type="checkbox" id="shEcoToggle"> <span>Mode hemat aktif</span></label>' +
      '<p class="sh-eco-hint muted">Shortcut: Ctrl + Shift + Alt + M</p>' +
      '<div class="sh-eco-db">' +
      '<div><b>Database aktif:</b> <span id="shEcoDbLabel">—</span></div>' +
      '<button type="button" class="btn btn-ghost" id="shEcoPing">Cek koneksi DB</button>' +
      '<pre id="shEcoLog" class="sh-eco-log"></pre>' +
      "</div></div>";
    document.body.appendChild(p);
    var tog = p.querySelector("#shEcoToggle");
    if (tog) {
      tog.checked = isOn();
      tog.addEventListener("change", function () {
        setOn(!!tog.checked);
        log("Mode hemat: " + (tog.checked ? "ON" : "OFF"));
      });
    }
    p.addEventListener("click", function (e) {
      if (e.target && e.target.getAttribute("data-eco-close")) {
        p.hidden = true;
      }
    });
    var ping = p.querySelector("#shEcoPing");
    if (ping) {
      ping.addEventListener("click", function () {
        pingDb();
      });
    }
    return p;
  }

  function log(msg) {
    var el = document.getElementById("shEcoLog");
    if (el) el.textContent = String(msg || "");
  }

  function updateDbLabel() {
    var el = document.getElementById("shEcoDbLabel");
    if (!el) return;
    var backend = (window.SH_DB_BACKEND || "supabase");
    el.textContent = backend + (window.SH_ECONOMY ? " · hemat" : " · normal");
  }

  async function pingDb() {
    updateDbLabel();
    log("Mengecek…");
    try {
      if (window.GalleryDB && typeof GalleryDB.ping === "function") {
        var r = await GalleryDB.ping();
        log(JSON.stringify(r, null, 2));
        return;
      }
      // fallback: coba list ringan
      if (window.GalleryDB && GalleryDB.listAngkatan) {
        var t0 = Date.now();
        await GalleryDB.listAngkatan();
        log("Supabase OK (" + (Date.now() - t0) + " ms)");
        window.SH_DB_BACKEND = "supabase";
        updateDbLabel();
        return;
      }
      log("GalleryDB tidak tersedia di halaman ini");
    } catch (e) {
      log("Gagal: " + (e && e.message ? e.message : e));
      // coba failover flag
      try {
        if (window.SHDbFailover && typeof SHDbFailover.tryFallback === "function") {
          var fb = await SHDbFailover.tryFallback(e);
          log("Failover: " + JSON.stringify(fb));
          updateDbLabel();
        }
      } catch (e2) {
        log("Failover error: " + (e2.message || e2));
      }
    }
  }

  function openPanel() {
    var p = ensurePanel();
    p.hidden = false;
    var tog = p.querySelector("#shEcoToggle");
    if (tog) tog.checked = isOn();
    updateDbLabel();
  }

  // Ctrl+Shift+Alt+M
  document.addEventListener(
    "keydown",
    function (e) {
      if (!e) return;
      var key = e.key || e.code || "";
      var isM = key === "M" || key === "m" || e.code === "KeyM";
      if (isM && e.ctrlKey && e.shiftKey && e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        openPanel();
      }
    },
    true
  );

  // Economy hooks: kurangi fitur berat bila aktif
  window.SHEconomy = {
    isOn: isOn,
    setOn: setOn,
    openPanel: openPanel,
  };

  // Blok secondary widgets di mode hemat (opsional, non-destruktif)
  if (isOn()) {
    document.documentElement.classList.add("sh-economy");
  }
})();
