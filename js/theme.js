(function () {
  /* Sembunyikan floater lama SEBELUM paint — cegah kedip sebelum FAB */
  try {
    var css =
      "#themeToggle,.theme-toggle,#sh-share-bar,#sh-float-stats,#shHealthBtn,.sh-health-btn,#shTourToggle,.sh-tour-toggle{display:none!important;visibility:hidden!important;pointer-events:none!important;opacity:0!important;position:fixed!important;left:-9999px!important;width:0!important;height:0!important;overflow:hidden!important}";
    var s = document.createElement("style");
    s.setAttribute("data-sh-hide-floaters", "1");
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
    document.documentElement.classList.add("sh-fab-on");
    if (document.body) document.body.classList.add("sh-fab-on");
    else
      document.addEventListener("DOMContentLoaded", function () {
        document.body.classList.add("sh-fab-on");
      });
  } catch (e) {}
})();

(function () {
  var KEY = "sh_theme";
  var ORDER = ["youth", "light", "adult", "senior"];
  var LABEL = { youth: "Tema Muda", light: "Tema Terang", adult: "Tema Dewasa", senior: "Tema Lansia" };

  function current() {
    var t = localStorage.getItem(KEY) || "youth";
    return ORDER.indexOf(t) >= 0 ? t : "youth";
  }
  function apply(t) {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem(KEY, t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var colors = { youth: "#081018", light: "#e8f4fc", adult: "#161d26", senior: "#242018" };
      meta.setAttribute("content", colors[t] || "#081018");
    }
    var btn = document.getElementById("themeToggle");
    if (btn) {
      btn.setAttribute("data-theme-active", t);
      btn.title = "Ganti tema (sekarang: " + (LABEL[t] || t) + ")";
      var lab = btn.querySelector(".theme-label");
      if (lab) lab.textContent = LABEL[t] || t;
    }
  }
  function next() {
    var i = ORDER.indexOf(current());
    apply(ORDER[(i + 1) % ORDER.length]);
  }
  window.SHTheme = { current: current, apply: apply, next: next, labels: LABEL };
  function ensureBtn() {
    var btn = document.getElementById("themeToggle");
    if (!btn) {
      var bar = document.querySelector(".topbar");
      if (!bar) return;
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "themeToggle";
      btn.className = "theme-toggle";
      btn.innerHTML = '<span class="theme-dot" aria-hidden="true"></span><span class="theme-label"></span>';
      var nav = bar.querySelector(".topnav");
      if (nav && nav.parentNode === bar) {
        bar.insertBefore(btn, nav.nextSibling);
      } else {
        bar.appendChild(btn);
      }
    }
    if (!btn._themeBound) {
      btn._themeBound = true;
      btn.addEventListener("click", next);
    }
    apply(current());
  }
  apply(current());
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureBtn);
  } else {
    ensureBtn();
  }

  /**
   * Mobile topnav: selalu mulai dari kiri; usap native; auto hint idle
   */

  function currentPageFile() {
    var p = (location.pathname.split("/").pop() || "").toLowerCase();
    if (!p || p === "/") p = "index.html";
    return p;
  }
  function scrollNavToActive(nav) {
    if (!nav) return;
    var path = currentPageFile();
    var active = null;
    var links = nav.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = (a.getAttribute("href") || "").split("?")[0].split("#")[0];
      var file = href.split("/").pop().toLowerCase();
      if (!file) file = "index.html";
      // match exact page file
      if (file === path) {
        active = a;
        break;
      }
      // index aliases
      if (path === "index.html" && (file === "index.html" || href === "./" || href === "/")) {
        active = a;
        break;
      }
    }
    // partial match e.g. profile
    if (!active) {
      var base = path.replace(/\.html$/, "");
      for (var j = 0; j < links.length; j++) {
        var a2 = links[j];
        var h2 = (a2.getAttribute("href") || "").toLowerCase();
        if (h2.indexOf(base) >= 0) {
          active = a2;
          break;
        }
      }
    }
    if (!active) return;
    try {
      active.setAttribute("aria-current", "page");
    } catch (e) {}
    function place() {
      try {
        var nr = nav.getBoundingClientRect();
        var ar = active.getBoundingClientRect();
        // center active in nav viewport
        var delta = ar.left + ar.width / 2 - (nr.left + nr.width / 2);
        nav.scrollLeft += delta;
        // clamp
        nav.scrollLeft = Math.max(0, Math.min(nav.scrollLeft, nav.scrollWidth - nav.clientWidth));
      } catch (e2) {}
    }
    place();
    requestAnimationFrame(place);
    setTimeout(place, 50);
    setTimeout(place, 200);
    setTimeout(place, 500);
  }

  function initNavScroll() {
    // Hanya mobile/tablet — desktop jangan diubah
    try {
      if (!window.matchMedia("(max-width: 900px)").matches) return;
    } catch (e) {
      return;
    }
    var navs = document.querySelectorAll(".topnav");
    if (!navs.length) return;

    function prefersReduce() {
      try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      } catch (e) {
        return false;
      }
    }

    navs.forEach(function (nav) {
      if (nav.dataset.navScrollBound) return;
      nav.dataset.navScrollBound = "1";
      nav.classList.add("topnav-scroll");

      // paksa layout scrollable + mulai dari kiri
      nav.style.setProperty("justify-content", "flex-start", "important");
      nav.style.setProperty("margin-left", "0", "important");
      nav.style.setProperty("overflow-x", "scroll", "important");
      nav.style.setProperty("touch-action", "pan-x", "important");
      nav.style.webkitOverflowScrolling = "touch";
      // Jangan paksa kiri — tampilkan item halaman aktif
      scrollNavToActive(nav);
      setTimeout(function () { scrollNavToActive(nav); }, 300);

      var idleMs = 2000;
      var speed = 0.5;
      var dir = 1;
      var raf = 0;
      var idleTimer = 0;
      var userActive = false;
      var paused = false;

      // drag mouse (touch = native)
      var dragging = false;
      var startX = 0;
      var startScroll = 0;
      var moved = false;

      function maxScroll() {
        return Math.max(0, nav.scrollWidth - nav.clientWidth);
      }

      function stopAuto() {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      }

      function tick() {
        var holdUntil = 0;
        try {
          holdUntil = parseInt(nav.dataset.shNavUserUntil || "0", 10) || 0;
        } catch (e) {}
        if (paused || userActive || prefersReduce() || Date.now() < holdUntil) {
          raf = 0;
          // tetap jadwalkan ulang jika hanya pause user
          if (!paused && !userActive && !prefersReduce() && Date.now() < holdUntil) {
            scheduleIdle();
          }
          return;
        }
        var max = maxScroll();
        if (max < 8) {
          raf = 0;
          return;
        }
        var next = nav.scrollLeft + dir * speed;
        if (next >= max - 0.5) {
          next = max;
          dir = -1;
        } else if (next <= 0.5) {
          next = 0;
          dir = 1;
        }
        nav.scrollLeft = next;
        raf = requestAnimationFrame(tick);
      }

      function startAuto() {
        if (prefersReduce() || userActive || paused) return;
        if (maxScroll() < 8) return;
        // pastikan tidak “nyangkut” di kanan tanpa bisa balik
        if (!raf) raf = requestAnimationFrame(tick);
      }

      function scheduleIdle() {
        clearTimeout(idleTimer);
        stopAuto();
        idleTimer = setTimeout(startAuto, idleMs);
      }

      function onUserStart() {
        userActive = true;
        stopAuto();
        clearTimeout(idleTimer);
      }

      function onUserEnd() {
        userActive = false;
        scheduleIdle();
      }

      nav.addEventListener(
        "pointerdown",
        function (e) {
          onUserStart();
          if (e.pointerType === "touch") return; // native swipe
          if (e.pointerType === "mouse" && e.button !== 0) return;
          dragging = true;
          moved = false;
          startX = e.clientX;
          startScroll = nav.scrollLeft;
          try {
            nav.setPointerCapture(e.pointerId);
          } catch (err) {}
        },
        { passive: true }
      );

      nav.addEventListener(
        "pointermove",
        function (e) {
          if (!dragging) return;
          var dx = e.clientX - startX;
          if (Math.abs(dx) > 3) moved = true;
          if (moved) {
            nav.scrollLeft = startScroll - dx;
            e.preventDefault();
          }
        },
        { passive: false }
      );

      function endPointer(e) {
        if (!dragging) {
          if (e.pointerType === "touch") onUserEnd();
          return;
        }
        dragging = false;
        try {
          nav.releasePointerCapture(e.pointerId);
        } catch (err) {}
        if (moved) {
          var block = function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            nav.removeEventListener("click", block, true);
          };
          nav.addEventListener("click", block, true);
          setTimeout(function () {
            nav.removeEventListener("click", block, true);
          }, 0);
        }
        onUserEnd();
      }

      nav.addEventListener("pointerup", endPointer);
      nav.addEventListener("pointercancel", endPointer);

      nav.addEventListener("touchstart", onUserStart, { passive: true });
      nav.addEventListener("touchend", onUserEnd, { passive: true });
      nav.addEventListener("touchcancel", onUserEnd, { passive: true });
      nav.addEventListener(
        "wheel",
        function (e) {
          // geser horizontal dengan trackpad/mouse wheel
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && maxScroll() > 0) {
            nav.scrollLeft += e.deltaY;
          }
          onUserStart();
          onUserEnd();
        },
        { passive: true }
      );

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          paused = true;
          stopAuto();
        } else {
          paused = false;
          nav.scrollLeft = Math.min(nav.scrollLeft, maxScroll());
          scheduleIdle();
        }
      });

      // setelah font/layout siap, reset ke kiri lalu mulai hint
      function boot() {
        nav.scrollLeft = 0;
        dir = 1;
        scheduleIdle();
      }
      setTimeout(boot, 100);
      setTimeout(boot, 500);
      window.addEventListener("resize", function () {
        nav.scrollLeft = Math.min(nav.scrollLeft, maxScroll());
        scheduleIdle();
      });
    });
  }


  // jika resize ke desktop, matikan auto-scroll
  try {
    var mq = window.matchMedia("(max-width: 900px)");
    mq.addEventListener("change", function (ev) {
      if (!ev.matches) {
        document.querySelectorAll(".topnav").forEach(function (nav) {
          nav.scrollLeft = 0;
          nav.classList.remove("topnav-scroll");
          // hapus inline style mobile agar desktop CSS murni
          nav.style.removeProperty("justify-content");
          nav.style.removeProperty("margin-left");
          nav.style.removeProperty("overflow-x");
          nav.style.removeProperty("touch-action");
          nav.style.webkitOverflowScrolling = "";
          delete nav.dataset.navScrollBound;
        });
      } else {
        // re-init jika perlu
        document.querySelectorAll(".topnav").forEach(function (n) {
          delete n.dataset.navScrollBound;
        });
        requestAnimationFrame(function(){ setTimeout(initNavScroll, 0); });
      }
    });
  } catch (e) {}

  function initNavPrefetch() {
    document.querySelectorAll(".topnav a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#" || href.indexOf("http") === 0) return;
      var done = false;
      function warm() {
        if (done) return;
        done = true;
        try {
          var l = document.createElement("link");
          l.rel = "prefetch";
          l.href = href;
          document.head.appendChild(l);
        } catch (e) {}
      }
      a.addEventListener("pointerenter", warm, { passive: true });
      a.addEventListener("touchstart", warm, { passive: true });
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initNavScroll();
      initNavPrefetch();
    });
  } else {
    initNavScroll();
    initNavPrefetch();
  }
})();

/* Saat tab/menu diklik, pastikan tombol tetap kelihatan di viewport (mobile) */
(function () {
  function ensureItemInNavView(nav, a) {
    if (!nav || !a) return;
    try {
      var nr = nav.getBoundingClientRect();
      var ar = a.getBoundingClientRect();
      var pad = 12;
      if (ar.left < nr.left + pad) {
        nav.scrollLeft -= nr.left + pad - ar.left;
      } else if (ar.right > nr.right - pad) {
        nav.scrollLeft += ar.right - (nr.right - pad);
      }
    } catch (e) {}
  }
  function bindNavFocus(root) {
    if (!root || root.dataset.navFocusBound) return;
    root.dataset.navFocusBound = "1";
    root.addEventListener("click", function (ev) {
      var a = ev.target.closest("a, button, [role='tab']");
      if (!a || !root.contains(a)) return;
      // Jangan biarkan item hilang ke kanan/kiri setelah klik
      ensureItemInNavView(root, a);
      requestAnimationFrame(function () {
        ensureItemInNavView(root, a);
      });
      setTimeout(function () {
        ensureItemInNavView(root, a);
      }, 50);
      setTimeout(function () {
        ensureItemInNavView(root, a);
      }, 200);
      // Pause auto-scroll horizontal lebih lama setelah interaksi
      try {
        root.dataset.shNavUserUntil = String(Date.now() + 12000);
      } catch (e) {}
    }, true);
  }
  function scan() {
    document.querySelectorAll(".topnav, .topnav-scroll, nav.tabs, .admin-tabs, .tabs, [data-tabs]").forEach(bindNavFocus);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();
  setTimeout(scan, 500);
  setTimeout(scan, 2000);
})();



  window.addEventListener("pageshow", function () {
    try {
      if (!window.matchMedia("(max-width: 900px)").matches) return;
    } catch (e) {
      return;
    }
    document.querySelectorAll(".topnav").forEach(function (nav) {
      scrollNavToActive(nav);
    });
  });

  /** Muat FAB hub di setiap halaman yang memakai theme.js */
  function loadFabHub() {
    if (window.__shFabHubLoading) return;
    if (document.querySelector('script[data-sh-fab-hub]')) return;
    window.__shFabHubLoading = true;
    var s = document.createElement("script");
    s.src = "js/fab-hub.js";
    s.async = true;
    s.setAttribute("data-sh-fab-hub", "1");
    s.onerror = function () {
      window.__shFabHubLoading = false;
    };
    (document.body || document.documentElement).appendChild(s);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(loadFabHub, 300);
    });
  } else {
    setTimeout(loadFabHub, 300);
  }
  window.addEventListener("load", function () {
    setTimeout(loadFabHub, 100);
  });

