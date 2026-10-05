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
   * Mobile topnav: scroll horizontal + auto mondar-mandir saat idle
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

      var idleMs = 2200;
      var speed = 0.45; // px per frame ~27px/s
      var dir = 1;
      var raf = 0;
      var idleTimer = 0;
      var paused = false;
      var userTouching = false;

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
        if (paused || userTouching || prefersReduce()) {
          raf = 0;
          return;
        }
        var max = maxScroll();
        if (max < 8) {
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
        if (prefersReduce() || userTouching || paused) return;
        if (maxScroll() < 8) return;
        if (!raf) raf = requestAnimationFrame(tick);
      }

      function scheduleIdle() {
        clearTimeout(idleTimer);
        stopAuto();
        idleTimer = setTimeout(startAuto, idleMs);
      }

      function onInteract() {
        userTouching = true;
        stopAuto();
        clearTimeout(idleTimer);
      }

      function onInteractEnd() {
        userTouching = false;
        scheduleIdle();
      }

      nav.addEventListener("pointerdown", onInteract, { passive: true });
      nav.addEventListener("touchstart", onInteract, { passive: true });
      nav.addEventListener("wheel", onInteract, { passive: true });
      nav.addEventListener("pointerup", onInteractEnd, { passive: true });
      nav.addEventListener("pointercancel", onInteractEnd, { passive: true });
      nav.addEventListener("touchend", onInteractEnd, { passive: true });
      nav.addEventListener(
        "scroll",
        function () {
          /* user scroll manual → restart idle clock */
          if (!raf) scheduleIdle();
        },
        { passive: true }
      );

      // pause saat tab tidak terlihat
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          paused = true;
          stopAuto();
        } else {
          paused = false;
          scheduleIdle();
        }
      });

      // start setelah layout stabil
      setTimeout(scheduleIdle, 800);
      window.addEventListener("resize", function () {
        scheduleIdle();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNavScroll);
  } else {
    initNavScroll();
  }
})();
