/**
 * Floating statistik — kiri bawah, bisa digeser, klik = buka detail
 * Posisi disimpan di localStorage; drag memakai Pointer Events.
 */
(function () {
  const LS_POS = "sh_float_stats_pos";
  const LS_COLLAPSED = "sh_float_stats_collapsed";

  function boot() {
    let el = document.getElementById("sh-float-stats");
    const existed = !!el;
    if (!el) {
      el = document.createElement("div");
      el.id = "sh-float-stats";
    }
    el.hidden = false;
    el.setAttribute("role", "complementary");
    el.setAttribute("aria-label", "Statistik pengunjung");
    el.innerHTML =
      '<button type="button" class="fs-hide" title="Sembunyikan" aria-label="Sembunyikan">−</button>' +
      '<a class="fs-body" href="stats.html" title="Buka detail statistik">' +
      '<span class="fs-drag" title="Geser" aria-hidden="true">⋮⋮</span>' +
      "<span>Online <b id=\"fs-online\">—</b></span>" +
      "<span>Kunjung <b id=\"fs-visit\">—</b></span>" +
      "<span>♥R <b id=\"fs-lr\">0</b></span>" +
      "<span>♥B <b id=\"fs-lb\">0</b></span>" +
      "<span>💬R <b id=\"fs-cr\">0</b></span>" +
      "<span>💬B <b id=\"fs-cb\">0</b></span>" +
      '<span class="fs-more">Detail →</span>' +
      "</a>" +
      '<button type="button" class="fs-show" hidden title="Tampilkan statistik" aria-label="Tampilkan">📊</button>';
    if (!existed) document.body.appendChild(el);

    const body = el.querySelector(".fs-body");
    body.style.cssText =
      "display:flex;flex-wrap:wrap;gap:8px;align-items:center;text-decoration:none;color:inherit;cursor:grab";

    function applyPos(left, top) {
      el.style.left = left + "px";
      el.style.top = top + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
    }

    function clampPos(left, top) {
      const w = el.offsetWidth || 120;
      const h = el.offsetHeight || 40;
      const nl = Math.max(0, Math.min(window.innerWidth - w, left));
      const nt = Math.max(0, Math.min(window.innerHeight - h, top));
      return { left: nl, top: nt };
    }

    function savePos() {
      try {
        const r = el.getBoundingClientRect();
        localStorage.setItem(LS_POS, JSON.stringify({ left: r.left, top: r.top }));
      } catch (e) {}
    }

    function restorePos() {
      try {
        const raw = localStorage.getItem(LS_POS);
        if (!raw) return false;
        const pos = JSON.parse(raw);
        if (typeof pos.left === "number" && typeof pos.top === "number") {
          const c = clampPos(pos.left, pos.top);
          applyPos(c.left, c.top);
          return true;
        }
      } catch (e) {}
      return false;
    }

    if (!restorePos()) {
      el.style.left = "16px";
      el.style.bottom = "16px";
      el.style.right = "auto";
      el.style.top = "auto";
    }

    let dragging = false;
    let moved = false;
    let sx = 0, sy = 0, ol = 0, ot = 0;
    let activeId = null;

    function onPointerDown(e) {
      if (e.button != null && e.button !== 0) return;
      if (e.target.closest(".fs-hide, .fs-show")) return;
      dragging = true;
      moved = false;
      activeId = e.pointerId;
      sx = e.clientX;
      sy = e.clientY;
      const r = el.getBoundingClientRect();
      ol = r.left;
      ot = r.top;
      applyPos(ol, ot);
      el.classList.add("is-dragging");
      el.style.cursor = "grabbing";
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!dragging) return;
      if (activeId != null && e.pointerId !== activeId) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
      const c = clampPos(ol + dx, ot + dy);
      applyPos(c.left, c.top);
      e.preventDefault();
    }

    function onPointerUp(e) {
      if (!dragging) return;
      if (activeId != null && e.pointerId !== activeId) return;
      dragging = false;
      activeId = null;
      el.classList.remove("is-dragging");
      el.style.cursor = "grab";
      try { el.releasePointerCapture(e.pointerId); } catch (err) {}
      if (moved) {
        savePos();
        const cancel = function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          body.removeEventListener("click", cancel, true);
        };
        body.addEventListener("click", cancel, true);
        setTimeout(function () {
          body.removeEventListener("click", cancel, true);
        }, 400);
      }
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);

    window.addEventListener("resize", function () {
      if (el.style.top && el.style.top !== "auto") {
        const r = el.getBoundingClientRect();
        const c = clampPos(r.left, r.top);
        applyPos(c.left, c.top);
        savePos();
      }
    });

    function setCollapsed(on) {
      const hideBtn = el.querySelector(".fs-hide");
      const showBtn = el.querySelector(".fs-show");
      if (on) {
        body.style.display = "none";
        hideBtn.hidden = true;
        showBtn.hidden = false;
      } else {
        body.style.display = "flex";
        hideBtn.hidden = false;
        showBtn.hidden = true;
      }
      try { localStorage.setItem(LS_COLLAPSED, on ? "1" : "0"); } catch (e) {}
    }

    el.querySelector(".fs-hide").addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      setCollapsed(true);
    });
    el.querySelector(".fs-show").addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      setCollapsed(false);
    });

    try {
      if (localStorage.getItem(LS_COLLAPSED) === "1") setCollapsed(true);
    } catch (e) {}

    async function refresh() {
      if (!window.GalleryDB || typeof GalleryDB.enabled !== "function" || !GalleryDB.enabled()) return;
      try {
        if (!sessionStorage.getItem("sh_visited")) {
          await GalleryDB.trackEvent("visit", { page: location.pathname });
          sessionStorage.setItem("sh_visited", "1");
        }
        if (typeof GalleryDB.getStatsSummary === "function") {
          const s = await GalleryDB.getStatsSummary();
          if (s && s.all) {
            const set = function (id, v) {
              const n = document.getElementById(id);
              if (n) n.textContent = v;
            };
            set("fs-visit", s.all.visit || 0);
            set("fs-lr", s.all.love_red || 0);
            set("fs-lb", s.all.love_blue || 0);
            set("fs-cr", s.all.comment_red || 0);
            set("fs-cb", s.all.comment_blue || 0);
          }
        }
      } catch (err) {
        console.warn("[stats-float]", err);
      }
    }

    function setOnline(n) {
      const o = document.getElementById("fs-online");
      if (!o) return;
      const v = typeof n === "number" && n >= 0 ? n : 1;
      o.textContent = String(Math.max(1, v));
      o.title = "Pengunjung online saat ini (login + browsing)";
    }

    function startPresence() {
      setOnline(1);
      try {
        if (window.GalleryDB && typeof GalleryDB.joinPresenceOnline === "function") {
          GalleryDB.joinPresenceOnline(function (n) { setOnline(n); });
        }
      } catch (e) {
        console.warn("[stats-float] presence", e);
        setOnline(1);
      }
    }

    function whenReady(fn) {
      if (window.GalleryDB) return fn();
      let n = 0;
      const t = setInterval(function () {
        n++;
        if (window.GalleryDB || n > 40) {
          clearInterval(t);
          fn();
        }
      }, 100);
    }
    whenReady(function () {
      refresh();
      startPresence();
    });
    setInterval(refresh, 45000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
