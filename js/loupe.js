/**
 * Loupe metode 1 — snapshot multi-layer (html2canvas)
 * Menangkap apa yang benar-benar tergambar di layar:
 * konten + tooltip + floating status + overlay, lalu di-zoom di lensa.
 *
 * Tahan Ctrl → loupe di posisi kursor (layer teratas)
 * Ctrl+↑ / Ctrl+↓ → 2× · 3× · 4×
 */
(function () {
  var LEVELS = [2, 3, 4];
  var levelIdx = 0;
  var active = false;
  var raf = 0;
  var mx = 0;
  var my = 0;
  var radius = 180;
  var el, canvas, ctx, badge;
  var snapCanvas = null; // bitmap viewport terakhir
  var snapScale = 1; // devicePixelRatio saat capture
  var capturing = false;
  var captureTimer = 0;
  var html2canvasLib = null;
  var libLoading = null;

  function mag() {
    return LEVELS[levelIdx];
  }

  function loadHtml2Canvas() {
    if (html2canvasLib) return Promise.resolve(html2canvasLib);
    if (window.html2canvas) {
      html2canvasLib = window.html2canvas;
      return Promise.resolve(html2canvasLib);
    }
    if (libLoading) return libLoading;
    libLoading = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      s.onload = function () {
        html2canvasLib = window.html2canvas;
        if (!html2canvasLib) reject(new Error("html2canvas gagal"));
        else resolve(html2canvasLib);
      };
      s.onerror = function () {
        reject(new Error("Tidak bisa memuat html2canvas"));
      };
      document.head.appendChild(s);
    });
    return libLoading;
  }

  function ensureDom() {
    if (el) return;
    el = document.createElement("div");
    el.id = "shLoupe";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div class="sh-loupe-lens sh-loupe-lens-canvas">' +
        '<canvas class="sh-loupe-canvas" width="360" height="360"></canvas>' +
        '<div class="sh-loupe-rim"></div>' +
        '<div class="sh-loupe-glare"></div>' +
      "</div>" +
      '<div class="sh-loupe-handle" aria-hidden="true">' +
        '<span class="sh-loupe-handle-shaft"></span>' +
        '<span class="sh-loupe-handle-tip"></span>' +
      "</div>" +
      '<div class="sh-loupe-badge">2×</div>';
    document.body.appendChild(el);
    canvas = el.querySelector(".sh-loupe-canvas");
    ctx = canvas.getContext("2d");
    badge = el.querySelector(".sh-loupe-badge");
    el.style.display = "none";
  }

  function paintFromSnap() {
    if (!active || !ctx || !snapCanvas) return;
    var z = mag();
    var d = radius * 2;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (canvas.width !== d * dpr) {
      canvas.width = d * dpr;
      canvas.height = d * dpr;
      canvas.style.width = d + "px";
      canvas.style.height = d + "px";
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // lingkaran clip
    ctx.save();
    ctx.beginPath();
    ctx.arc((d * dpr) / 2, (d * dpr) / 2, (d * dpr) / 2 - 1, 0, Math.PI * 2);
    ctx.clip();

    // sumber di snap: titik kursor di viewport → koordinat dokumen
    var srcSize = (d / z) * snapScale;
    var sx = (window.scrollX + mx) * snapScale - srcSize / 2;
    var sy = (window.scrollY + my) * snapScale - srcSize / 2;

    // clamp ke bitmap
    if (sx < 0) sx = 0;
    if (sy < 0) sy = 0;
    if (sx + srcSize > snapCanvas.width) sx = Math.max(0, snapCanvas.width - srcSize);
    if (sy + srcSize > snapCanvas.height) sy = Math.max(0, snapCanvas.height - srcSize);

    try {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        snapCanvas,
        sx,
        sy,
        srcSize,
        srcSize,
        0,
        0,
        canvas.width,
        canvas.height
      );
    } catch (e) {}

    ctx.restore();

    // posisi loupe = pusat di kursor, layer teratas
    el.style.width = d + "px";
    el.style.height = d + "px";
    el.style.transform =
      "translate3d(" + Math.round(mx - radius) + "px," + Math.round(my - radius) + "px,0)";
  }

  function captureViewport() {
    if (!active || capturing) return Promise.resolve();
    capturing = true;

    // sembunyikan loupe saat capture agar tidak ikut terbaca
    var prevDisplay = el.style.display;
    el.style.visibility = "hidden";

    return loadHtml2Canvas()
      .then(function (h2c) {
        var bg = "#0a1218";
        try {
          bg = getComputedStyle(document.body).backgroundColor || bg;
        } catch (e) {}
        return h2c(document.body, {
          backgroundColor: bg,
          useCORS: true,
          allowTaint: true,
          scale: Math.min(window.devicePixelRatio || 1, 2),
          logging: false,
          imageTimeout: 4000,
          ignoreElements: function (node) {
            if (!node) return false;
            if (node.id === "shLoupe") return true;
            if (node.closest && node.closest("#shLoupe")) return true;
            return false;
          },
          onclone: function (doc) {
            try {
              // Paksa semua layer floating + tooltip tampak di dokumen hasil clone
              var tips = doc.querySelectorAll(".sh-tooltip, [role='tooltip']");
              for (var i = 0; i < tips.length; i++) {
                var tip = tips[i];
                if (tip.classList.contains("visible") || tip.getAttribute("aria-hidden") === "false") {
                  tip.style.setProperty("opacity", "1", "important");
                  tip.style.setProperty("visibility", "visible", "important");
                  tip.style.setProperty("transform", "none", "important");
                  tip.style.setProperty("display", "block", "important");
                  tip.style.setProperty("z-index", "2147483000", "important");
                }
              }
              var floats = doc.querySelectorAll(
                ".sh-online, .online-float, .stats-float, [data-floating], .sh-float, .presence-chip, .typing-line, .sh-userbar, .announce-splash, .sh-modal"
              );
              for (var j = 0; j < floats.length; j++) {
                floats[j].style.setProperty("opacity", "1", "important");
                floats[j].style.setProperty("visibility", "visible", "important");
              }
            } catch (e) {}
          },
        });
      })
      .then(function (c) {
        snapCanvas = c;
        // skala bitmap ↔ CSS px (lebar elemen yang di-capture)
        var cssW = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth, window.innerWidth);
        snapScale = c.width / cssW;
        if (!isFinite(snapScale) || snapScale <= 0) {
          snapScale = c.width / window.innerWidth;
        }
        el.style.visibility = "visible";
        el.style.display = prevDisplay || "block";
        capturing = false;
        paintFromSnap();
      })
      .catch(function (err) {
        console.warn("loupe capture", err);
        el.style.visibility = "visible";
        el.style.display = prevDisplay || "block";
        capturing = false;
      });
  }

  function show() {
    ensureDom();
    active = true;
    el.style.display = "block";
    badge.textContent = mag() + "×";
    document.documentElement.classList.add("sh-loupe-on");
    // capture pertama segera, lalu periodik (tooltip/floating ikut)
    captureViewport();
    if (captureTimer) clearInterval(captureTimer);
    captureTimer = setInterval(function () {
      if (active) captureViewport();
    }, 320);
  }

  function hide() {
    active = false;
    if (el) el.style.display = "none";
    document.documentElement.classList.remove("sh-loupe-on");
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (captureTimer) {
      clearInterval(captureTimer);
      captureTimer = 0;
    }
    snapCanvas = null;
  }

  function schedulePaint() {
    if (!active) return;
    if (!raf) {
      raf = requestAnimationFrame(function () {
        raf = 0;
        paintFromSnap();
      });
    }
  }

  function onKeyDown(e) {
    if (e.key === "Control") {
      if (!active) show();
      else schedulePaint();
      return;
    }
    if (!e.ctrlKey) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      levelIdx = Math.min(LEVELS.length - 1, levelIdx + 1);
      if (badge) badge.textContent = mag() + "×";
      schedulePaint();
      // capture ulang agar tajam di zoom baru
      captureViewport();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      levelIdx = Math.max(0, levelIdx - 1);
      if (badge) badge.textContent = mag() + "×";
      schedulePaint();
      captureViewport();
    }
  }

  function onKeyUp(e) {
    if (e.key === "Control") hide();
  }

  function onMove(e) {
    mx = e.clientX;
    my = e.clientY;
    if (active) schedulePaint();
  }

  function onScroll() {
    if (active) captureViewport();
  }

  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp, true);
  document.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () {
    if (active) captureViewport();
  });
  window.addEventListener("blur", hide);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) hide();
  });
})();
