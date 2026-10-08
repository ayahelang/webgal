/**
 * Loupe metode 2 — CSS transform: scale + clip lingkaran
 * Tahan Ctrl → pointer jadi loupe di posisi yang sama (live).
 * Ctrl+↑ / Ctrl+↓ → 2× · 3× · 4×
 *
 * Layer tooltip (.sh-tooltip) disalin ke dalam clone lensa setiap frame
 * supaya ikut ter-zoom di dalam lensa.
 */
(function () {
  var LEVELS = [2, 3, 4];
  var levelIdx = 0;
  var active = false;
  var raf = 0;
  var mx = 0;
  var my = 0;
  var radius = 180;
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

  function buildClone() {
    if (cloneRoot && cloneRoot.parentNode) {
      cloneRoot.parentNode.removeChild(cloneRoot);
    }
    cloneRoot = document.createElement("div");
    cloneRoot.className = "sh-loupe-clone";
    var cloned = document.body.cloneNode(true);
    var kill = cloned.querySelectorAll("#shLoupe, script, .sh-loupe-clone");
    for (var i = 0; i < kill.length; i++) {
      if (kill[i].parentNode) kill[i].parentNode.removeChild(kill[i]);
    }
    // hapus tooltip asli dari clone — akan diganti layer tip sinkron
    var tips = cloned.querySelectorAll(".sh-tooltip");
    for (var j = 0; j < tips.length; j++) {
      if (tips[j].parentNode) tips[j].parentNode.removeChild(tips[j]);
    }
    cloneRoot.appendChild(cloned);
    cloneRoot.style.width = window.innerWidth + "px";
    cloneRoot.style.height = window.innerHeight + "px";
    try {
      var cs = getComputedStyle(document.body);
      cloneRoot.style.background = cs.background;
      cloneRoot.style.color = cs.color;
      cloneRoot.style.fontFamily = cs.fontFamily;
    } catch (e) {}
    stage.innerHTML = "";
    stage.appendChild(cloneRoot);
  }

  /**
   * Salin layer tooltip yang tampil di layar ke dalam clone (koordinat viewport).
   * Ini yang membuat tooltip di bawah lensa ikut ter-zoom.
   */
  function syncTooltipLayer() {
    if (!cloneRoot) return;
    var host = cloneRoot.firstElementChild || cloneRoot;

    // bersihkan tip lama di clone
    var old = host.querySelectorAll(".sh-loupe-clone-tip");
    for (var i = 0; i < old.length; i++) {
      if (old[i].parentNode) old[i].parentNode.removeChild(old[i]);
    }

    // semua tooltip visible di halaman nyata (di luar loupe)
    var live = document.querySelectorAll(".sh-tooltip");
    for (var k = 0; k < live.length; k++) {
      var tip = live[k];
      if (tip.closest && tip.closest("#shLoupe")) continue;
      if (tip.classList.contains("sh-loupe-clone-tip")) continue;

      var st = window.getComputedStyle(tip);
      var isVis =
        tip.classList.contains("visible") ||
        (st.opacity !== "0" && st.visibility !== "hidden" && st.display !== "none");
      if (!isVis) continue;

      var r = tip.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;

      // salin node + style posisi absolut di koordinat viewport
      var copy = tip.cloneNode(true);
      copy.classList.add("sh-loupe-clone-tip", "visible");
      copy.classList.remove("sh-loupe-live-tip");
      copy.style.position = "absolute";
      copy.style.left = r.left + "px";
      copy.style.top = r.top + "px";
      copy.style.width = r.width + "px";
      copy.style.minWidth = r.width + "px";
      copy.style.maxWidth = "none";
      copy.style.opacity = "1";
      copy.style.visibility = "visible";
      copy.style.transform = "none";
      copy.style.transition = "none";
      copy.style.zIndex = "2147483646";
      copy.style.pointerEvents = "none";
      copy.style.margin = "0";
      host.appendChild(copy);
    }
  }

  function show() {
    ensureDom();
    buildClone();
    active = true;
    el.style.display = "block";
    badge.textContent = mag() + "×";
    document.documentElement.classList.add("sh-loupe-on");
    layout();
    if (refreshTimer) clearInterval(refreshTimer);
    // refresh clone + tooltip layer (meta async ikut terbawa)
    refreshTimer = setInterval(function () {
      if (!active) return;
      buildClone();
      layout();
    }, 280);
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
    if (stage) stage.innerHTML = "";
    cloneRoot = null;
  }

  function layout() {
    if (!active || !el || !stage) return;
    var z = mag();
    var d = radius * 2;

    el.style.width = d + "px";
    el.style.height = d + "px";
    el.style.transform =
      "translate3d(" + Math.round(mx - radius) + "px," + Math.round(my - radius) + "px,0)";

    stage.style.width = window.innerWidth + "px";
    stage.style.height = window.innerHeight + "px";
    stage.style.transformOrigin = "0 0";
    stage.style.transform =
      "translate(" + (radius - mx * z) + "px," + (radius - my * z) + "px) scale(" + z + ")";

    if (cloneRoot) {
      cloneRoot.style.width = window.innerWidth + "px";
      cloneRoot.style.height =
        Math.max(window.innerHeight, document.documentElement.scrollHeight) + "px";
      cloneRoot.style.transform =
        "translate(" + -window.scrollX + "px," + -window.scrollY + "px)";
      // layer tooltip → masuk clone → ikut scale di lensa
      syncTooltipLayer();
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
