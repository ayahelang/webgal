/**
 * Floating statistik — kiri bawah, bisa digeser, klik = buka detail
 */
(function () {
  function boot() {
    if (document.getElementById("sh-float-stats")) return;

    const el = document.createElement("div");
    el.id = "sh-float-stats";
    el.setAttribute("role", "complementary");
    el.setAttribute("aria-label", "Statistik pengunjung");
    el.innerHTML = `
      <button type="button" class="fs-hide" title="Sembunyikan" aria-label="Sembunyikan">−</button>
      <a class="fs-body" href="stats.html" title="Buka detail statistik">
        <span class="fs-drag" title="Geser bar">⋮⋮</span>
        <span>Online <b id="fs-online">—</b></span>
        <span>Kunjung <b id="fs-visit">—</b></span>
        <span>♥R <b id="fs-lr">0</b></span>
        <span>♥B <b id="fs-lb">0</b></span>
        <span>💬R <b id="fs-cr">0</b></span>
        <span>💬B <b id="fs-cb">0</b></span>
        <span class="fs-more">Detail →</span>
      </a>
      <button type="button" class="fs-show" hidden title="Tampilkan statistik" aria-label="Tampilkan">📊</button>
    `;
    document.body.appendChild(el);

    // posisi default kiri bawah (inline style menang vs CSS bentrok)
    el.style.cssText = [
      "position:fixed",
      "left:12px",
      "bottom:12px",
      "right:auto",
      "top:auto",
      "z-index:2147483646",
      "display:flex",
      "align-items:center",
      "gap:8px",
      "background:rgba(8,16,26,0.96)",
      "border:1px solid rgba(125,227,255,0.3)",
      "border-radius:16px",
      "padding:8px 10px",
      "box-shadow:0 10px 40px rgba(0,0,0,0.45)",
      "max-width:min(96vw,560px)",
      "font-size:12px",
      "color:#d5e6ee",
      "pointer-events:auto",
    ].join(";");

    // --- drag ---
    let dragging = false;
    let moved = false;
    let sx = 0,
      sy = 0,
      ol = 0,
      ot = 0;

    function ptr(e) {
      if (e.touches && e.touches[0]) return e.touches[0];
      return e;
    }

    function onDown(e) {
      // jangan drag dari tombol hide/show
      if (e.target.closest(".fs-hide, .fs-show")) return;
      // drag dari handle atau body
      const p = ptr(e);
      dragging = true;
      moved = false;
      sx = p.clientX;
      sy = p.clientY;
      const r = el.getBoundingClientRect();
      ol = r.left;
      ot = r.top;
      el.style.right = "auto";
      el.style.bottom = "auto";
      el.style.left = ol + "px";
      el.style.top = ot + "px";
      el.style.cursor = "grabbing";
      e.preventDefault();
    }

    function onMove(e) {
      if (!dragging) return;
      const p = ptr(e);
      const dx = p.clientX - sx;
      const dy = p.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      let nl = ol + dx;
      let nt = ot + dy;
      nl = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, nl));
      nt = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, nt));
      el.style.left = nl + "px";
      el.style.top = nt + "px";
    }

    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      el.style.cursor = "grab";
      // jika digeser, batalkan navigasi link detail
      if (moved) {
        const body = el.querySelector(".fs-body");
        if (body) {
          body.addEventListener(
            "click",
            function cancel(ev) {
              ev.preventDefault();
              body.removeEventListener("click", cancel);
            },
            { once: true }
          );
        }
      }
    }

    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    el.addEventListener(
      "touchstart",
      function (e) {
        if (e.target.closest(".fs-hide, .fs-show")) return;
        onDown(e);
      },
      { passive: false }
    );
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);

    el.querySelector(".fs-hide").onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      el.querySelector(".fs-body").style.display = "none";
      el.querySelector(".fs-hide").hidden = true;
      el.querySelector(".fs-show").hidden = false;
    };
    el.querySelector(".fs-show").onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      el.querySelector(".fs-body").style.display = "flex";
      el.querySelector(".fs-hide").hidden = false;
      el.querySelector(".fs-show").hidden = true;
    };

    // style body link
    const body = el.querySelector(".fs-body");
    body.style.cssText =
      "display:flex;flex-wrap:wrap;gap:8px;align-items:center;text-decoration:none;color:inherit;cursor:pointer";

    async function refresh() {
      if (!window.GalleryDB || typeof GalleryDB.enabled !== "function" || !GalleryDB.enabled()) {
        return;
      }
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

    function startPresence() {
      try {
        if (window.GalleryDB && typeof GalleryDB.joinPresenceOnline === "function") {
          GalleryDB.joinPresenceOnline(function (n) {
            const o = document.getElementById("fs-online");
            if (o) o.textContent = n;
          });
        }
      } catch (e) {}
    }

    // tunggu GalleryDB siap (script order)
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
