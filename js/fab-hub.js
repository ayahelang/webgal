/**
 * Satu tombol floating (FAB) — panel status/share/tema/server.
 * Bisa digeser; posisi disimpan di localStorage.
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

  /** Drag pada #shFabHub; klik singkat pada main = buka panel */
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
      var maxX = Math.max(0, window.innerWidth - 56);
      var maxY = Math.max(0, window.innerHeight - 56);
      x = Math.max(0, Math.min(maxX, x));
      y = Math.max(0, Math.min(maxY, y));
      hub.style.left = x + "px";
      hub.style.top = y + "px";
      hub.style.right = "auto";
      hub.style.bottom = "auto";
    }

    // restore
    var pos = loadPos();
    if (pos && typeof pos.x === "number" && typeof pos.y === "number") {
      applyPos(pos.x, pos.y);
    }

    function onDown(ev) {
      // jangan mulai drag dari isi panel
      if (ev.target.closest && ev.target.closest("#shFabPanel")) return;
      var p = point(ev);
      var r = hub.getBoundingClientRect();
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
      applyPos(p.x - ox, p.y - oy);
      try {
        ev.preventDefault();
      } catch (e) {}
    }

    function onUp(ev) {
      if (!dragging) return;
      dragging = false;
      hub.classList.remove("is-dragging");
      if (moved) {
        var r = hub.getBoundingClientRect();
        savePos(r.left, r.top);
      } else {
        // tap / klik singkat → buka-tutup panel
        if (typeof onTap === "function") onTap(ev);
      }
    }

    main.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    // cegah click sintetis dobel setelah drag
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
      "  </div>" +
      '  <p class="muted" style="font-size:10px;margin:0;opacity:.75">Geser tombol ✦ · ketuk untuk menu</p>' +
      "</div>" +
      '<div id="shFabMain" role="button" tabindex="0" aria-expanded="false" aria-controls="shFabPanel" title="Geser atau ketuk menu">✦</div>';

    document.body.appendChild(hub);

    var main = document.getElementById("shFabMain");
    var panel = document.getElementById("shFabPanel");

    function setOpen(on) {
      panel.hidden = !on;
      main.setAttribute("aria-expanded", on ? "true" : "false");
      main.textContent = on ? "✕" : "✦";
    }

    function onTap() {
      setOpen(panel.hidden);
      if (!panel.hidden) {
        syncFromPage();
        try {
          refreshFabThemeLabel();
        } catch (e) {}
      }
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

    // Health / SIM
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

    function syncShare() {
      var wa = document.querySelector("#sh-share-bar .sh-wa, .sh-share-btn.sh-wa");
      var mail = document.querySelector("#sh-share-bar .sh-mail, .sh-share-btn.sh-mail");
      var fabWa = document.getElementById("fabWa");
      var fabMail = document.getElementById("fabMail");
      if (fabWa && wa && wa.href && wa.href !== "#") fabWa.href = wa.href;
      else if (fabWa) {
        var u = encodeURIComponent(location.href);
        var t = encodeURIComponent(document.title || "Silverhawk");
        fabWa.href = "https://wa.me/?text=" + t + "%20" + u;
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
      setTimeout(function () {
        copyText("fab-online", "#fs-online");
        copyText("fab-visit", "#fs-visit");
        copyText("fab-lr", "#fs-lr");
        copyText("fab-cr", "#fs-cr");
        syncShare();
      }, 800);
    }

    setInterval(function () {
      if (!panel.hidden) syncFromPage();
    }, 5000);

    setTimeout(function () {
      document.body.classList.add("sh-fab-on");
      syncShare();
    }, 1200);
  }

  ready(function () {
    setTimeout(ensureHub, 350);
  });
  window.addEventListener("load", function () {
    setTimeout(ensureHub, 150);
  });
})();
