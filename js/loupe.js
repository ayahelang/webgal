/**
 * Loupe metode 2 — CSS transform: scale + clip lingkaran
 * Tahan Ctrl → pointer jadi loupe di posisi yang sama (live).
 * Ctrl+↑ / Ctrl+↓ → 2× · 3× · 4×
 */
(function () {
  var LEVELS = [2, 3, 4];
  var levelIdx = 0;
  var active = false;
  var raf = 0;
  var mx = 0;
  var my = 0;
  var radius = 180; // jari-jari lensa (2× lebih besar)
  var el, stage, badge, cloneRoot;
  var refreshTimer = 0;

  function mag() {
    return LEVELS[levelIdx];
  }

  function ensureDom() {
    if (el) return;
    el = document.createElement("div");
    el.id = "shLoupe";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div class="sh-loupe-lens">' +
        '<div class="sh-loupe-stage"></div>' +
        '<div class="sh-loupe-rim"></div>' +
        '<div class="sh-loupe-glare"></div>' +
      "</div>" +
      '<div class="sh-loupe-handle" aria-hidden="true">' +
        '<span class="sh-loupe-handle-shaft"></span>' +
        '<span class="sh-loupe-handle-tip"></span>' +
      "</div>" +
      '<div class="sh-loupe-badge">2×</div>';
    document.body.appendChild(el);
    stage = el.querySelector(".sh-loupe-stage");
    badge = el.querySelector(".sh-loupe-badge");
    el.style.display = "none";
  }



  var lastTipKey = "";

  function pickTooltipPayload(x, y) {
    var prevVis = el ? el.style.visibility : "";
    if (el) el.style.visibility = "hidden";
    var node = document.elementFromPoint(x, y);
    if (el) el.style.visibility = prevVis || "visible";

    // tooltip kustom app yang sedang tampil
    var existing = document.querySelector(".sh-tooltip.visible");
    if (existing && !existing.classList.contains("sh-loupe-live-tip")) {
      var et = existing.querySelector(".tip-title");
      var ed = existing.querySelector(".tip-desc");
      return {
        title: et ? et.textContent.trim() : (existing.textContent || "").trim(),
        desc: ed ? ed.textContent.trim() : "",
        left: parseFloat(existing.style.left) || x + 14,
        top: parseFloat(existing.style.top) || y + 18,
      };
    }

    var title = "";
    var desc = "";
    var cur = node;
    for (var i = 0; i < 8 && cur; i++) {
      if (cur.getAttribute) {
        var t =
          cur.getAttribute("data-tooltip") ||
          cur.getAttribute("data-title") ||
          cur.getAttribute("aria-label") ||
          cur.getAttribute("title") ||
          cur.getAttribute("data-sh-title-bak") ||
          "";
        t = String(t || "").trim();
        if (t) {
          if (t.indexOf(" — ") >= 0) {
            var p = t.split(" — ");
            title = p[0];
            desc = p.slice(1).join(" — ");
          } else {
            title = t;
          }
          break;
        }
      }
      cur = cur.parentElement;
    }
    if (!title) return null;
    var left = x + 14;
    var top = y + 18;
    if (left + 280 > window.innerWidth - 8) left = Math.max(8, x - 292);
    if (top > window.innerHeight - 80) top = Math.max(8, y - 70);
    return { title: title, desc: desc, left: left, top: top };
  }

  function injectTipIntoClone(payload) {
    if (!cloneRoot || !payload) return;
    // hapus tip lama di clone
    var olds = cloneRoot.querySelectorAll(".sh-loupe-clone-tip");
    for (var i = 0; i < olds.length; i++) olds[i].parentNode.removeChild(olds[i]);

    var tip = document.createElement("div");
    tip.className = "sh-tooltip visible sh-loupe-clone-tip";
    tip.setAttribute("role", "tooltip");
    tip.style.cssText =
      "position:absolute;left:" +
      payload.left +
      "px;top:" +
      payload.top +
      "px;z-index:2147483646;opacity:1;transform:none;pointer-events:none;max-width:300px;";
    tip.innerHTML =
      '<div class="tip-title"></div>' +
      (payload.desc ? '<div class="tip-desc"></div>' : "");
    tip.querySelector(".tip-title").textContent = payload.title || "";
    if (payload.desc) tip.querySelector(".tip-desc").textContent = payload.desc;
    // tempel ke clone body inner
    var host = cloneRoot.firstElementChild || cloneRoot;
    host.appendChild(tip);
  }

  function buildClone() {
    // clone body sekali per sesi Ctrl — tanpa script/loupe
    if (cloneRoot && cloneRoot.parentNode) {
      cloneRoot.parentNode.removeChild(cloneRoot);
    }
    cloneRoot = document.createElement("div");
    cloneRoot.className = "sh-loupe-clone";
    var src = document.body;
    var cloned = src.cloneNode(true);
    // buang elemen loupe & script dari clone
    var kill = cloned.querySelectorAll("#shLoupe, script, .sh-loupe-clone");
    for (var i = 0; i < kill.length; i++) {
      if (kill[i].parentNode) kill[i].parentNode.removeChild(kill[i]);
    }
    cloneRoot.appendChild(cloned);
    // samakan ukuran viewport
    cloneRoot.style.width = window.innerWidth + "px";
    cloneRoot.style.height = window.innerHeight + "px";
    // salin sedikit style body
    try {
      var cs = getComputedStyle(document.body);
      cloneRoot.style.background = cs.background;
      cloneRoot.style.color = cs.color;
      cloneRoot.style.fontFamily = cs.fontFamily;
    } catch (e) {}
    stage.innerHTML = "";
    stage.appendChild(cloneRoot);
  }

  function show() {
    ensureDom();
    buildClone();
    active = true;
    el.style.display = "block";
    badge.textContent = mag() + "×";
    document.documentElement.classList.add("sh-loupe-on");
    layout();
    // refresh clone berkala agar tooltip/popover dinamis ikut ke zoom
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(function () {
      if (!active) return;
      buildClone();
      layout();
    }, 450);
  }

  function hide() {
    active = false;
    if (el) el.style.display = "none";
    document.documentElement.classList.remove("sh-loupe-on");
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = 0;
    }
    // lepas clone biar hemat memori
    if (stage) stage.innerHTML = "";
    cloneRoot = null;
    lastTipKey = "";
  }

  function layout() {
    if (!active || !el || !stage) return;

    var z = mag();
    var d = radius * 2;

    // loupe berpusat di kursor (pointer diganti loupe)
    el.style.width = d + "px";
    el.style.height = d + "px";
    el.style.transform =
      "translate3d(" + Math.round(mx - radius) + "px," + Math.round(my - radius) + "px,0)";

    // stage: konten viewport di-scale, digeser agar titik (mx,my) di pusat lensa
    // transform-origin 0 0; translate(radius - mx*z, radius - my*z) scale(z)
    stage.style.width = window.innerWidth + "px";
    stage.style.height = window.innerHeight + "px";
    stage.style.transformOrigin = "0 0";
    stage.style.transform =
      "translate(" +
      (radius - mx * z) +
      "px," +
      (radius - my * z) +
      "px) scale(" +
      z +
      ")";

    if (cloneRoot) {
      cloneRoot.style.width = window.innerWidth + "px";
      cloneRoot.style.height = Math.max(window.innerHeight, document.documentElement.scrollHeight) + "px";
      // kompensasi scroll: geser clone ke atas sesuai scrollY
      cloneRoot.style.transform = "translate(" + -window.scrollX + "px," + -window.scrollY + "px)";
      var payload = pickTooltipPayload(mx, my);
      var key = payload ? payload.title + "|" + payload.desc + "|" + payload.left + "|" + payload.top : "";
      if (key !== lastTipKey) {
        lastTipKey = key;
        injectTipIntoClone(payload);
      } else if (payload) {
        injectTipIntoClone(payload);
      }
    }
  }

  function schedule() {
    if (!active) return;
    if (!raf) {
      raf = requestAnimationFrame(function () {
        raf = 0;
        layout();
      });
    }
  }

  function onKeyDown(e) {
    if (e.key === "Control") {
      if (!active) show();
      else schedule();
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

  function onScroll() {
    if (active) schedule();
  }

  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp, true);
  document.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () {
    if (active) {
      buildClone();
      schedule();
    }
  });
  window.addEventListener("blur", hide);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) hide();
  });
})();
