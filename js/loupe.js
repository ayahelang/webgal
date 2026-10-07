/**
 * Loupe 3D — tahan Ctrl, hover untuk memperbesar.
 * Ctrl+↑ / Ctrl+↓ : 2× · 3× · 4×
 * Ringan: hanya saat Ctrl + requestAnimationFrame.
 */
(function () {
  var LEVELS = [2, 3, 4];
  var levelIdx = 0;
  var active = false;
  var raf = 0;
  var mx = 0;
  var my = 0;
  var size = 168;
  var el, canvas, ctx, badge;
  var lastPaint = 0;

  function mag() { return LEVELS[levelIdx]; }

  function ensureDom() {
    if (el) return;
    el = document.createElement("div");
    el.id = "shLoupe";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div class="sh-loupe-body">' +
        '<div class="sh-loupe-glass">' +
          '<canvas class="sh-loupe-canvas" width="168" height="168"></canvas>' +
          '<div class="sh-loupe-rim"></div>' +
          '<div class="sh-loupe-glare"></div>' +
          '<div class="sh-loupe-inner-shadow"></div>' +
        '</div>' +
        '<div class="sh-loupe-handle" aria-hidden="true">' +
          '<span class="sh-loupe-handle-shaft"></span>' +
          '<span class="sh-loupe-handle-end"></span>' +
        '</div>' +
      '</div>' +
      '<div class="sh-loupe-badge">2×</div>';
    document.body.appendChild(el);
    canvas = el.querySelector(".sh-loupe-canvas");
    ctx = canvas.getContext("2d");
    badge = el.querySelector(".sh-loupe-badge");
    el.style.display = "none";
  }

  function show() {
    ensureDom();
    active = true;
    el.style.display = "block";
    badge.textContent = mag() + "×";
    document.documentElement.classList.add("sh-loupe-on");
  }

  function hide() {
    active = false;
    if (el) el.style.display = "none";
    document.documentElement.classList.remove("sh-loupe-on");
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  function wrapText(c, text, maxW) {
    var words = String(text || "").replace(/\s+/g, " ").trim().split(" ");
    var lines = [];
    var line = "";
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + " " + words[i] : words[i];
      if (c.measureText(test).width > maxW && line) {
        lines.push(line);
        line = words[i];
        if (lines.length >= 10) {
          lines[lines.length - 1] += "…";
          return lines;
        }
      } else line = test;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function collectTextNear(x, y) {
    el.style.visibility = "hidden";
    var node = document.elementFromPoint(x, y);
    el.style.visibility = "visible";
    if (!node || node === document.body || node === document.documentElement) return null;
    // naik ke elemen berteks
    var cur = node;
    for (var i = 0; i < 6 && cur; i++) {
      var t = (cur.innerText || cur.textContent || "").trim();
      if (t && t.length > 1 && cur.tagName !== "HTML" && cur.tagName !== "BODY") {
        return { el: cur, text: t };
      }
      cur = cur.parentElement;
    }
    return { el: node, text: (node.innerText || node.alt || node.title || "").trim() };
  }

  function paint() {
    raf = 0;
    if (!active || !ctx) return;
    var now = performance.now();
    if (now - lastPaint < 32) { // ~30fps max
      raf = requestAnimationFrame(paint);
      return;
    }
    lastPaint = now;

    var m = mag();
    var dim = size;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== dim * dpr) {
      canvas.width = dim * dpr;
      canvas.height = dim * dpr;
      canvas.style.width = dim + "px";
      canvas.style.height = dim + "px";
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    var hit = collectTextNear(mx, my);
    var bg = "#0c1620";
    var fg = "#eef7fb";
    var fontFamily = "Inter, system-ui, sans-serif";
    var baseSize = 14;

    if (hit && hit.el) {
      try {
        var cs = getComputedStyle(hit.el);
        if (cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)") bg = cs.backgroundColor;
        if (cs.color) fg = cs.color;
        if (cs.fontFamily) fontFamily = cs.fontFamily;
        baseSize = parseFloat(cs.fontSize) || 14;
      } catch (e) {}
    }

    // lingkaran clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(dim / 2, dim / 2, dim / 2 - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, dim, dim);

    // grid halus biar terasa kaca
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (var g = 0; g < dim; g += 12) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, dim);
      ctx.stroke();
    }

    if (hit && hit.text) {
      var zoomFont = Math.min(baseSize * m * 1.05, 42);
      ctx.fillStyle = fg;
      ctx.textBaseline = "middle";
      ctx.font = "600 " + zoomFont + "px " + fontFamily;
      var pad = 14;
      var maxW = dim - pad * 2;
      var lines = wrapText(ctx, hit.text, maxW);
      var lineH = zoomFont * 1.28;
      var startY = dim / 2 - ((Math.min(lines.length, 8) - 1) * lineH) / 2;
      for (var i = 0; i < lines.length && i < 8; i++) {
        ctx.fillText(lines[i], pad, startY + i * lineH);
      }
    } else {
      ctx.fillStyle = "rgba(143,167,180,0.9)";
      ctx.font = "13px " + fontFamily;
      ctx.textAlign = "center";
      ctx.fillText("Arahkan ke teks…", dim / 2, dim / 2);
      ctx.textAlign = "start";
    }
    ctx.restore();

    // posisi: kanan-bawah kursor, flip jika dekat tepi
    var left = mx + 20;
    var top = my + 20;
    if (left + size + 90 > window.innerWidth) left = mx - size - 50;
    if (top + size + 90 > window.innerHeight) top = my - size - 30;
    el.style.transform = "translate3d(" + Math.round(left) + "px," + Math.round(top) + "px,0)";
  }

  function schedule() {
    if (!active) return;
    if (!raf) raf = requestAnimationFrame(paint);
  }

  function onKeyDown(e) {
    if (e.key === "Control") {
      show();
      schedule();
      return;
    }
    if (!e.ctrlKey) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      levelIdx = Math.min(LEVELS.length - 1, levelIdx + 1);
      if (badge) badge.textContent = mag() + "×";
      schedule();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      levelIdx = Math.max(0, levelIdx - 1);
      if (badge) badge.textContent = mag() + "×";
      schedule();
    }
  }

  function onKeyUp(e) {
    if (e.key === "Control") hide();
  }

  function onMove(e) {
    mx = e.clientX;
    my = e.clientY;
    if (active) schedule();
  }

  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp, true);
  document.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("blur", hide);
  // lepas Ctrl jika tab ganti
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) hide();
  });
})();
