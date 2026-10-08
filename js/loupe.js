/**
 * Loupe — komposit multi-layer di bawah lensa
 * Prinsip:
 *  1) Loupe SELALU di layer teratas (z-index max), pointer-events:none
 *  2) Snapshot viewport = layer dasar (body) + SEMUA elemen fixed/sticky/floating
 *     (tooltip, online status, dll) digambar ulang sesuai posisi layar
 *  3) Area di bawah kursor di-crop & di-zoom ke canvas lensa
 *
 * Ctrl tahan = aktif · Ctrl+↑/↓ = 2×·3×·4×
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
  var composite = null; // canvas viewport (CSS px * dpr)
  var compScale = 1;
  var capturing = false;
  var captureTimer = 0;
  var h2c = null;
  var libPromise = null;

  function mag() {
    return LEVELS[levelIdx];
  }

  function loadLib() {
    if (h2c) return Promise.resolve(h2c);
    if (window.html2canvas) {
      h2c = window.html2canvas;
      return Promise.resolve(h2c);
    }
    if (libPromise) return libPromise;
    var urls = [
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
      "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
    ];
    libPromise = new Promise(function (resolve, reject) {
      var i = 0;
      function tryNext() {
        if (i >= urls.length) {
          reject(new Error("html2canvas tidak termuat"));
          return;
        }
        var s = document.createElement("script");
        s.src = urls[i++];
        s.onload = function () {
          if (window.html2canvas) {
            h2c = window.html2canvas;
            resolve(h2c);
          } else tryNext();
        };
        s.onerror = tryNext;
        document.head.appendChild(s);
      }
      tryNext();
    });
    return libPromise;
  }

  function ensureDom() {
    if (el) return;
    el = document.createElement("div");
    el.id = "shLoupe";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div class="sh-loupe-lens sh-loupe-lens-canvas">' +
      '<canvas class="sh-loupe-canvas"></canvas>' +
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
    ctx = canvas.getContext("2d", { alpha: true });
    badge = el.querySelector(".sh-loupe-badge");
    el.style.display = "none";
  }

  /** Kumpulkan elemen di layer atas body (fixed/sticky + tooltip) */
  function collectOverlayElements() {
    var out = [];
    var all = document.body.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      var node = all[i];
      if (!node || node.id === "shLoupe") continue;
      if (node.closest && node.closest("#shLoupe")) continue;
      var cs;
      try {
        cs = getComputedStyle(node);
      } catch (e) {
        continue;
      }
      if (!cs || cs.display === "none" || cs.visibility === "hidden") continue;
      if (parseFloat(cs.opacity || "1") === 0) {
        // tetap ambil tooltip yg class visible (kadang opacity 0 karena aturan loupe lama)
        if (!node.classList.contains("visible") && !node.classList.contains("sh-tooltip"))
          continue;
      }
      var pos = cs.position;
      var isOverlay =
        pos === "fixed" ||
        pos === "sticky" ||
        node.classList.contains("sh-tooltip") ||
        node.getAttribute("role") === "tooltip" ||
        node.classList.contains("stats-float") ||
        node.classList.contains("sh-float") ||
        node.classList.contains("announce-splash") ||
        node.classList.contains("presence-chip");
      if (!isOverlay) continue;
      var r = node.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      // hanya yang intersect viewport
      if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) continue;
      var z = parseInt(cs.zIndex, 10);
      if (!isFinite(z)) z = pos === "fixed" ? 1000 : 100;
      out.push({ node: node, rect: r, z: z });
    }
    out.sort(function (a, b) {
      return a.z - b.z;
    });
    return out;
  }

  function paintLens() {
    if (!active || !ctx || !composite) return;
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
    ctx.save();
    ctx.beginPath();
    ctx.arc((d * dpr) / 2, (d * dpr) / 2, (d * dpr) / 2 - 0.5, 0, Math.PI * 2);
    ctx.clip();

    // composite disimpan dalam CSS-pixel * compScale
    var src = (d / z) * compScale;
    var sx = mx * compScale - src / 2;
    var sy = my * compScale - src / 2;
    if (sx < 0) sx = 0;
    if (sy < 0) sy = 0;
    if (sx + src > composite.width) sx = Math.max(0, composite.width - src);
    if (sy + src > composite.height) sy = Math.max(0, composite.height - src);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    try {
      ctx.drawImage(composite, sx, sy, src, src, 0, 0, canvas.width, canvas.height);
    } catch (e) {}
    ctx.restore();

    el.style.width = d + "px";
    el.style.height = d + "px";
    el.style.transform =
      "translate3d(" + Math.round(mx - radius) + "px," + Math.round(my - radius) + "px,0)";
  }

  function captureLayer(lib, node, opt) {
    return lib(node, opt).catch(function () {
      return null;
    });
  }

  function rebuildComposite() {
    if (!active || capturing) return Promise.resolve();
    capturing = true;
    ensureDom();
    // Loupe disembunyikan dari capture, tetap di DOM (layer teratas saat tampil)
    el.style.visibility = "hidden";

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    // Paksa tooltip/floating terlihat selama capture
    var restored = [];
    try {
      document.querySelectorAll(".sh-tooltip, [role='tooltip']").forEach(function (t) {
        if (!t.classList.contains("visible") && t.getAttribute("aria-hidden") === "true") return;
        restored.push([t, t.style.cssText]);
        t.style.setProperty("opacity", "1", "important");
        t.style.setProperty("visibility", "visible", "important");
        t.style.setProperty("transform", "none", "important");
        t.style.setProperty("transition", "none", "important");
        t.style.setProperty("display", "block", "important");
      });
    } catch (e) {}

    return loadLib()
      .then(function (lib) {
        var baseOpt = {
          backgroundColor: null,
          useCORS: true,
          allowTaint: true,
          scale: dpr,
          logging: false,
          imageTimeout: 3000,
          width: vw,
          height: vh,
          windowWidth: vw,
          windowHeight: vh,
          x: window.scrollX,
          y: window.scrollY,
          scrollX: -window.scrollX,
          scrollY: -window.scrollY,
          ignoreElements: function (node) {
            if (!node) return false;
            if (node.id === "shLoupe") return true;
            if (node.closest && node.closest("#shLoupe")) return true;
            // overlay di-capture terpisah
            try {
              var cs = getComputedStyle(node);
              if (cs.position === "fixed" && node !== document.body) return true;
            } catch (e) {}
            return false;
          },
        };

        return captureLayer(lib, document.documentElement, baseOpt).then(function (base) {
          // canvas komposit viewport
          var c = document.createElement("canvas");
          c.width = Math.max(1, Math.floor(vw * dpr));
          c.height = Math.max(1, Math.floor(vh * dpr));
          var cx = c.getContext("2d");
          // latar
          try {
            cx.fillStyle = getComputedStyle(document.body).backgroundColor || "#0a1218";
          } catch (e) {
            cx.fillStyle = "#0a1218";
          }
          cx.fillRect(0, 0, c.width, c.height);

          if (base) {
            // base mungkin full-doc; ambil bagian viewport
            try {
              cx.drawImage(base, 0, 0, c.width, c.height);
            } catch (e) {}
          }

          // layer overlay (fixed + tooltip) satu per satu, urut z-index
          var overlays = collectOverlayElements();
          var chain = Promise.resolve();
          overlays.forEach(function (item) {
            chain = chain.then(function () {
              var r = item.rect;
              var node = item.node;
              // skip loupe
              if (node.id === "shLoupe") return;
              return captureLayer(lib, node, {
                backgroundColor: null,
                useCORS: true,
                allowTaint: true,
                scale: dpr,
                logging: false,
                width: Math.ceil(r.width),
                height: Math.ceil(r.height),
                ignoreElements: function (n) {
                  return n && n.id === "shLoupe";
                },
              }).then(function (piece) {
                if (!piece) return;
                try {
                  cx.drawImage(
                    piece,
                    0,
                    0,
                    piece.width,
                    piece.height,
                    Math.round(r.left * dpr),
                    Math.round(r.top * dpr),
                    Math.round(r.width * dpr),
                    Math.round(r.height * dpr)
                  );
                } catch (e) {}
              });
            });
          });
          return chain.then(function () {
            return c;
          });
        });
      })
      .then(function (c) {
        // restore style
        restored.forEach(function (pair) {
          pair[0].style.cssText = pair[1];
        });
        composite = c;
        compScale = dpr;
        el.style.visibility = "visible";
        capturing = false;
        paintLens();
      })
      .catch(function (err) {
        console.warn("loupe composite", err);
        restored.forEach(function (pair) {
          pair[0].style.cssText = pair[1];
        });
        el.style.visibility = "visible";
        capturing = false;
      });
  }

  function show() {
    ensureDom();
    active = true;
    el.style.display = "block";
    badge.textContent = mag() + "×";
    document.documentElement.classList.add("sh-loupe-on");
    rebuildComposite();
    if (captureTimer) clearInterval(captureTimer);
    captureTimer = setInterval(function () {
      if (active) rebuildComposite();
    }, 400);
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
    composite = null;
  }

  function schedulePaint() {
    if (!active) return;
    if (!raf) {
      raf = requestAnimationFrame(function () {
        raf = 0;
        paintLens();
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
      rebuildComposite();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      levelIdx = Math.max(0, levelIdx - 1);
      if (badge) badge.textContent = mag() + "×";
      schedulePaint();
      rebuildComposite();
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

  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp, true);
  document.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener(
    "scroll",
    function () {
      if (active) rebuildComposite();
    },
    { passive: true }
  );
  window.addEventListener("resize", function () {
    if (active) rebuildComposite();
  });
  window.addEventListener("blur", hide);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) hide();
  });
})();
