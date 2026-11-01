/**
 * Satu tombol floating yang membuka panel: status, share, tema, server.
 */
(function () {
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
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
      '  <p class="muted" style="font-size:10px;margin:0;opacity:.75">Ketuk di luar untuk menutup</p>' +
      "</div>" +
      '<button type="button" id="shFabMain" aria-expanded="false" aria-controls="shFabPanel" title="Menu cepat">✦</button>';

    document.body.appendChild(hub);

    var main = document.getElementById("shFabMain");
    var panel = document.getElementById("shFabPanel");

    function setOpen(on) {
      panel.hidden = !on;
      main.setAttribute("aria-expanded", on ? "true" : "false");
      main.textContent = on ? "✕" : "✦";
    }

    main.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(panel.hidden);
      if (!panel.hidden) { syncFromPage(); try { refreshFabThemeLabel(); } catch (e) {} }
    });

    document.addEventListener("click", function (e) {
      if (!panel.hidden && !hub.contains(e.target)) setOpen(false);
    });

    // Theme (satu-satunya kontrol — floating #themeToggle disembunyikan)
    var fabTheme = document.getElementById("fabTheme");
    function refreshFabThemeLabel() {
      if (!fabTheme) return;
      try {
        if (window.SHTheme && window.SHTheme.current) {
          var cur = window.SHTheme.current();
          var lab = (window.SHTheme.labels && window.SHTheme.labels[cur]) || cur;
          fabTheme.textContent = "Tema: " + (lab.replace(/^Tema\s*/, "") || cur);
        }
      } catch (e) {}
    }
    if (fabTheme) {
      fabTheme.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.SHTheme && typeof window.SHTheme.next === "function") {
          window.SHTheme.next();
        } else {
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
      fabHealth.addEventListener("click", function () {
        var h = document.getElementById("shHealthBtn");
        if (h) {
          h.click();
        } else if (window.SHHealth && typeof window.SHHealth.open === "function") {
          window.SHHealth.open();
        } else {
          // trigger create then click
          document.dispatchEvent(new CustomEvent("sh-open-health"));
          setTimeout(function () {
            var h2 = document.getElementById("shHealthBtn");
            if (h2) h2.click();
          }, 300);
        }
        setOpen(false);
      });
    }

    // Share links — mirror share bar if present
    function syncShare() {
      var wa = document.querySelector("#sh-share-bar .sh-wa, .sh-share-btn.sh-wa");
      var mail = document.querySelector("#sh-share-bar .sh-mail, .sh-share-btn.sh-mail");
      var fabWa = document.getElementById("fabWa");
      var fabMail = document.getElementById("fabMail");
      if (fabWa && wa && wa.href) fabWa.href = wa.href;
      else if (fabWa) {
        var u = encodeURIComponent(location.href);
        var t = encodeURIComponent(document.title || "Silverhawk");
        fabWa.href = "https://wa.me/?text=" + t + "%20" + u;
      }
      if (fabMail && mail && mail.href) fabMail.href = mail.href;
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
      if (el && src) el.textContent = src.textContent || "—";
    }

    function syncFromPage() {
      syncShare();
      copyText("fab-online", "#fs-online");
      copyText("fab-visit", "#fs-visit");
      copyText("fab-lr", "#fs-lr");
      copyText("fab-cr", "#fs-cr");
      // if stats not ready yet, try again shortly
      setTimeout(function () {
        copyText("fab-online", "#fs-online");
        copyText("fab-visit", "#fs-visit");
        copyText("fab-lr", "#fs-lr");
        copyText("fab-cr", "#fs-cr");
        syncShare();
      }, 800);
    }

    // periodic soft sync while open
    setInterval(function () {
      if (!panel.hidden) { syncFromPage(); try { refreshFabThemeLabel(); } catch (e) {} }
    }, 5000);

    // initial hide of legacy floaters once DOM widgets may appear
    setTimeout(function () {
      document.body.classList.add("sh-fab-on");
      syncShare();
    }, 1500);
  }

  ready(function () {
    // delay slightly so share/stats scripts can inject nodes we mirror
    setTimeout(ensureHub, 400);
  });
  window.addEventListener("load", function () {
    setTimeout(ensureHub, 200);
  });
})();
