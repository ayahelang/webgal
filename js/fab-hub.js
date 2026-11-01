/**
 * FAB hub: status, share, tema, server, auto-scroll.
 * Geser = pindah (tersimpan). Ketuk singkat = buka panel.
 * Panel menempel ke tombol; tombol tidak loncat saat jadi ✕.
 */
(function () {
  var POS_KEY = "sh_float_pos_fab-hub";

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function loadPos() {
    try {
      return JSON.parse(localStorage.getItem(POS_KEY) || "null");
    } catch (e) {
      return null;
    }
  }
  function savePos(x, y) {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({ x: x, y: y }));
    } catch (e) {}
  }

  function clampHub(hub) {
    if (!hub) return;
    var w = hub.offsetWidth || 56;
    var h = hub.offsetHeight || 56;
    // ukur hanya tombol utama agar clamp stabil saat panel terbuka
    var main = document.getElementById("shFabMain");
    if (main) {
      w = main.offsetWidth || 56;
      h = main.offsetHeight || 56;
    }
    var r = hub.getBoundingClientRect();
    var x = r.left;
    var y = r.top;
    // jika pakai right/bottom default, skip
    if (hub.style.left === "" && hub.style.top === "") return;
    var maxX = Math.max(0, window.innerWidth - w - 4);
    var maxY = Math.max(0, window.innerHeight - h - 4);
    x = Math.max(0, Math.min(maxX, x));
    y = Math.max(0, Math.min(maxY, y));
    hub.style.left = x + "px";
    hub.style.top = y + "px";
    hub.style.right = "auto";
    hub.style.bottom = "auto";
  }

  function placePanel(hub, panel, main) {
    if (!panel || panel.hidden) return;
    // Panel absolute relatif ke hub; pilih atas/bawah/kiri/kanan agar tetap di viewport
    panel.style.left = "auto";
    panel.style.right = "0";
    panel.style.top = "auto";
    panel.style.bottom = "auto";
    panel.classList.remove("sh-fab-panel-below", "sh-fab-panel-left");

    // force layout
    var pr = panel.getBoundingClientRect();
    var mr = main.getBoundingClientRect();
    var spaceAbove = mr.top;
    var spaceBelow = window.innerHeight - mr.bottom;
    var panelH = pr.height || 200;
    var panelW = pr.width || 260;

    if (spaceAbove >= panelH + 12 || spaceAbove >= spaceBelow) {
      // di atas tombol
      panel.style.bottom = main.offsetHeight + 8 + "px";
      panel.style.top = "auto";
    } else {
      panel.style.top = main.offsetHeight + 8 + "px";
      panel.style.bottom = "auto";
      panel.classList.add("sh-fab-panel-below");
    }

    // horizontal: jika overflow kiri, tempel kiri tombol
    pr = panel.getBoundingClientRect();
    if (pr.left < 4) {
      panel.style.right = "auto";
      panel.style.left = "0";
      panel.classList.add("sh-fab-panel-left");
    } else if (pr.right > window.innerWidth - 4) {
      panel.style.left = "auto";
      panel.style.right = "0";
    }
  }

  function enableDrag(hub, main, onTap) {
    var dragging = false;
    var moved = false;
    var ox = 0,
      oy = 0,
      sx = 0,
      sy = 0;
    var THRESH = 10;

    function point(ev) {
      if (ev.touches && ev.touches[0]) return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
      return { x: ev.clientX, y: ev.clientY };
    }

    function applyPos(x, y) {
      var mainW = main.offsetWidth || 56;
      var mainH = main.offsetHeight || 56;
      var maxX = Math.max(0, window.innerWidth - mainW - 4);
      var maxY = Math.max(0, window.innerHeight - mainH - 4);
      x = Math.max(0, Math.min(maxX, x));
      y = Math.max(0, Math.min(maxY, y));
      hub.style.left = x + "px";
      hub.style.top = y + "px";
      hub.style.right = "auto";
      hub.style.bottom = "auto";
    }

    var pos = loadPos();
    if (pos && typeof pos.x === "number" && typeof pos.y === "number") {
      applyPos(pos.x, pos.y);
    }

    function onDown(ev) {
      if (ev.target.closest && ev.target.closest("#shFabPanel")) return;
      var p = point(ev);
      var r = main.getBoundingClientRect();
      dragging = true;
      moved = false;
      sx = p.x;
      sy = p.y;
      ox = p.x - r.left;
      oy = p.y - r.top;
      hub.classList.add("is-dragging");
      try {
        if (ev.pointerId != null && main.setPointerCapture) main.setPointerCapture(ev.pointerId);
      } catch (e) {}
    }

    function onMove(ev) {
      if (!dragging) return;
      var p = point(ev);
      if (Math.abs(p.x - sx) > THRESH || Math.abs(p.y - sy) > THRESH) moved = true;
      if (!moved) return;
      // tutup panel saat drag biar tidak bingung
      var panel = document.getElementById("shFabPanel");
      if (panel && !panel.hidden) {
        panel.hidden = true;
        main.setAttribute("aria-expanded", "false");
        main.textContent = "✦";
      }
      applyPos(p.x - ox, p.y - oy);
      try {
        ev.preventDefault();
      } catch (e) {}
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      hub.classList.remove("is-dragging");
      if (moved) {
        var r = main.getBoundingClientRect();
        // simpan posisi tombol (bukan panel)
        savePos(r.left, r.top);
        applyPos(r.left, r.top);
      } else {
        if (typeof onTap === "function") onTap();
      }
    }

    main.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    main.addEventListener(
      "click",
      function (e) {
        if (moved) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );

    window.addEventListener("resize", function () {
      clampHub(hub);
    });
    window.addEventListener("orientationchange", function () {
      setTimeout(function () {
        clampHub(hub);
      }, 200);
    });
  }

  function ensureHub() {
    if (document.getElementById("shFabHub")) return;
    document.body.classList.add("sh-fab-on");

    var hub = document.createElement("div");
    hub.id = "shFabHub";
    hub.innerHTML =
      '<div id="shFabPanel" hidden role="dialog" aria-label="Menu cepat">' +
      '  <div class="sh-fab-row" id="shFabStats">' +
      '    <span class="sh-fab-chip">Online <b id="fab-online">—</b></span>' +
      '    <span class="sh-fab-chip">Kunjung <b id="fab-visit">—</b></span>' +
      '    <span class="sh-fab-chip">♥R <b id="fab-lr">0</b></span>' +
      '    <span class="sh-fab-chip">💬R <b id="fab-cr">0</b></span>' +
      "  </div>" +
      '  <div class="sh-fab-actions">' +
      '    <a class="sh-fab-wa" id="fabWa" href="#" target="_blank" rel="noopener">WhatsApp</a>' +
      '    <a class="sh-fab-mail" id="fabMail" href="#" target="_blank" rel="noopener">Email</a>' +
      '    <button type="button" id="fabTheme">Tema</button>' +
      '    <button type="button" id="fabHealth">Server / SIM</button>' +
      '    <button type="button" id="fabTour" class="sh-fab-tour">Auto-scroll: —</button>' +
      "  </div>" +
      '  <p class="muted" style="font-size:10px;margin:0;opacity:.75">Geser ✦ · ketuk buka menu</p>' +
      "</div>" +
      '<div id="shFabMain" role="button" tabindex="0" aria-expanded="false" aria-controls="shFabPanel" title="Geser atau ketuk">✦</div>';

    document.body.appendChild(hub);

    var main = document.getElementById("shFabMain");
    var panel = document.getElementById("shFabPanel");

    function setOpen(on) {
      // Jangan ubah left/top hub — hanya state panel + ikon
      panel.hidden = !on;
      main.setAttribute("aria-expanded", on ? "true" : "false");
      main.textContent = on ? "✕" : "✦";
      if (on) {
        clampHub(hub);
        // next frame: ukur panel & posisikan menempel tombol
        requestAnimationFrame(function () {
          placePanel(hub, panel, main);
          clampHub(hub);
        });
        syncFromPage();
        try {
          refreshFabThemeLabel();
        } catch (e) {}
        try {
          refreshTourLabel();
        } catch (e) {}
      }
    }

    function onTap() {
      setOpen(!!panel.hidden);
    }

    enableDrag(hub, main, onTap);

    document.addEventListener("click", function (e) {
      if (!panel.hidden && !hub.contains(e.target)) setOpen(false);
    });

    // Theme
    var fabTheme = document.getElementById("fabTheme");
    function refreshFabThemeLabel() {
      if (!fabTheme) return;
      try {
        if (window.SHTheme && window.SHTheme.current) {
          var cur = window.SHTheme.current();
          var lab = (window.SHTheme.labels && window.SHTheme.labels[cur]) || cur;
          fabTheme.textContent = "Tema: " + String(lab).replace(/^Tema\s*/, "");
        }
      } catch (e) {}
    }
    if (fabTheme) {
      fabTheme.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.SHTheme && typeof window.SHTheme.next === "function") window.SHTheme.next();
        else {
          var t = document.getElementById("themeToggle");
          if (t) t.click();
        }
        refreshFabThemeLabel();
      });
      refreshFabThemeLabel();
    }

    // Health
    var fabHealth = document.getElementById("fabHealth");
    if (fabHealth) {
      fabHealth.addEventListener("click", function (e) {
        e.stopPropagation();
        var h = document.getElementById("shHealthBtn");
        if (h) h.click();
        else if (window.SHHealth && typeof window.SHHealth.open === "function") window.SHHealth.open();
        else {
          document.dispatchEvent(new CustomEvent("sh-open-health"));
          setTimeout(function () {
            var h2 = document.getElementById("shHealthBtn");
            if (h2) h2.click();
          }, 300);
        }
        setOpen(false);
      });
    }

    // Auto-scroll (idle-tour)
    var fabTour = document.getElementById("fabTour");
    function refreshTourLabel() {
      if (!fabTour) return;
      var on = true;
      try {
        if (window.SHTour && typeof window.SHTour.status === "function") {
          on = !!window.SHTour.status().enabled;
        } else {
          on = sessionStorage.getItem("sh_tour_enabled") !== "0";
        }
      } catch (e) {}
      fabTour.textContent = on ? "Auto-scroll: ON" : "Auto-scroll: OFF";
      fabTour.classList.toggle("is-on", on);
    }
    if (fabTour) {
      fabTour.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (window.SHTour && typeof window.SHTour.setEnabled === "function") {
            var st = window.SHTour.status ? window.SHTour.status() : { enabled: true };
            window.SHTour.setEnabled(!st.enabled);
          } else {
            var cur = sessionStorage.getItem("sh_tour_enabled") !== "0";
            sessionStorage.setItem("sh_tour_enabled", cur ? "0" : "1");
            var legacy = document.getElementById("shTourToggle");
            if (legacy) legacy.click();
          }
        } catch (err) {}
        refreshTourLabel();
      });
      // label setelah idle-tour boot
      setTimeout(refreshTourLabel, 600);
      setTimeout(refreshTourLabel, 2000);
    }

    function syncShare() {
      var wa = document.querySelector("#sh-share-bar .sh-wa, .sh-share-btn.sh-wa");
      var mail = document.querySelector("#sh-share-bar .sh-mail, .sh-share-btn.sh-mail");
      var fabWa = document.getElementById("fabWa");
      var fabMail = document.getElementById("fabMail");
      if (fabWa && wa && wa.href && wa.href !== "#") fabWa.href = wa.href;
      else if (fabWa) {
        fabWa.href =
          "https://wa.me/?text=" +
          encodeURIComponent((document.title || "Silverhawk") + " " + location.href);
      }
      if (fabMail && mail && mail.href && mail.href.indexOf("mailto:") === 0) fabMail.href = mail.href;
      else if (fabMail) {
        fabMail.href =
          "mailto:?subject=" +
          encodeURIComponent(document.title || "Silverhawk") +
          "&body=" +
          encodeURIComponent(location.href);
      }
    }

    function copyText(id, fromSel) {
      var el = document.getElementById(id);
      var src = document.querySelector(fromSel);
      if (el && src) el.textContent = (src.textContent || "—").trim() || "—";
    }

    function syncFromPage() {
      syncShare();
      copyText("fab-online", "#fs-online");
      copyText("fab-visit", "#fs-visit");
      copyText("fab-lr", "#fs-lr");
      copyText("fab-cr", "#fs-cr");
      refreshTourLabel();
      setTimeout(function () {
        copyText("fab-online", "#fs-online");
        copyText("fab-visit", "#fs-visit");
        syncShare();
        refreshTourLabel();
      }, 900);
    }

    setInterval(function () {
      if (!panel.hidden) syncFromPage();
    }, 5000);

    setTimeout(function () {
      document.body.classList.add("sh-fab-on");
      clampHub(hub);
      syncShare();
    }, 1000);
  }

  ready(function () {
    setTimeout(ensureHub, 350);
  });
  window.addEventListener("load", function () {
    setTimeout(ensureHub, 120);
  });
})();
