(function () {
  var KEY = "sh_theme";
  var ORDER = ["youth", "adult", "senior"];
  var LABEL = { youth: "Tema Muda", adult: "Tema Dewasa", senior: "Tema Lansia" };

  function current() {
    var t = localStorage.getItem(KEY) || "youth";
    return ORDER.indexOf(t) >= 0 ? t : "youth";
  }
  function apply(t) {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem(KEY, t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var colors = { youth: "#081018", adult: "#161d26", senior: "#242018" };
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
  function ensureBtn() {
    if (document.getElementById("themeToggle")) return;
    var bar = document.querySelector(".topbar");
    if (!bar) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "themeToggle";
    btn.className = "theme-toggle";
    btn.innerHTML = '<span class="theme-dot" aria-hidden="true"></span><span class="theme-label"></span>';
    btn.addEventListener("click", next);
    // prefer after nav
    var nav = bar.querySelector(".topnav");
    if (nav && nav.parentNode === bar) {
      bar.insertBefore(btn, nav.nextSibling);
    } else {
      bar.appendChild(btn);
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
   * Mobile topnav: geser/usap kiri-kanan + auto mondar-mandir saat idle
   * (memberi tahu user ada item tersembunyi di kanan)
   */
  function initNavScroll() {
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

      // pastikan bisa di-scroll native + drag
      nav.style.touchAction = "pan-x";
      nav.style.overflowX = "auto";
      nav.style.webkitOverflowScrolling = "touch";

      var idleMs = 1800;
      var speed = 0.55;
      var dir = 1;
      var raf = 0;
      var idleTimer = 0;
      var paused = false;
      var userActive = false;

      // drag dengan pointer (mouse + touch yang tidak nge-scroll native)
      var dragging = false;
      var startX = 0;
      var startScroll = 0;
      var moved = false;

      function maxScroll() {
        return Math.max(0, nav.scrollWidth - nav.clientWidth - 1);
      }

      function stopAuto() {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      }

      function tick() {
        if (paused || userActive || prefersReduce()) {
          raf = 0;
          return;
        }
        var max = maxScroll();
        if (max < 12) {
          raf = 0;
          return;
        }
        var next = nav.scrollLeft + dir * speed;
        if (next >= max) {
          next = max;
          dir = -1;
        } else if (next <= 0) {
          next = 0;
          dir = 1;
        }
        nav.scrollLeft = next;
        raf = requestAnimationFrame(tick);
      }

      function startAuto() {
        if (prefersReduce() || userActive || paused) return;
        if (maxScroll() < 12) return;
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

      // --- Pointer drag (desktop + fallback mobile) ---
      nav.addEventListener(
        "pointerdown",
        function (e) {
          onUserStart();
          // Touch: biarkan native scroll (touch-action:pan-x). Drag kustom hanya mouse.
          if (e.pointerType === "touch") return;
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
          if (Math.abs(dx) > 4) moved = true;
          if (moved) {
            nav.scrollLeft = startScroll - dx;
            e.preventDefault();
          }
        },
        { passive: false }
      );

      function endPointer(e) {
        if (!dragging) return;
        dragging = false;
        try {
          nav.releasePointerCapture(e.pointerId);
        } catch (err) {}
        // jika user drag, cegah click link
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

      // native touch scroll
      nav.addEventListener("touchstart", onUserStart, { passive: true });
      nav.addEventListener("touchend", onUserEnd, { passive: true });
      nav.addEventListener("touchcancel", onUserEnd, { passive: true });
      nav.addEventListener(
        "wheel",
        function () {
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
          scheduleIdle();
        }
      });

      setTimeout(scheduleIdle, 600);
      window.addEventListener("resize", scheduleIdle);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNavScroll);
  } else {
    initNavScroll();
  }
})();
