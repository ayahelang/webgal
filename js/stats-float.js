(function () {
  function boot() {
    if (document.getElementById("sh-float-stats")) return;
    const el = document.createElement("div");
    el.id = "sh-float-stats";
    el.innerHTML = `
      <button type="button" class="fs-hide" title="Sembunyikan">−</button>
      <div class="fs-body">
        <span>Online <b id="fs-online">—</b></span>
        <span>Kunjung <b id="fs-visit">—</b></span>
        <span>♥R <b id="fs-lr">0</b></span>
        <span>♥B <b id="fs-lb">0</b></span>
        <span>💬R <b id="fs-cr">0</b></span>
        <span>💬B <b id="fs-cb">0</b></span>
        <a href="stats.html" class="fs-more">Detail</a>
      </div>
      <button type="button" class="fs-show" hidden title="Statistik">📊</button>`;
    document.body.appendChild(el);

    let drag = false, ox = 0, oy = 0;
    el.addEventListener("pointerdown", (e) => {
      if (e.target.closest("a,button")) return;
      drag = true;
      const r = el.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", (e) => {
      if (!drag) return;
      el.style.left = Math.max(0, e.clientX - ox) + "px";
      el.style.top = Math.max(0, e.clientY - oy) + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
    });
    el.addEventListener("pointerup", () => { drag = false; });

    el.querySelector(".fs-hide").onclick = () => {
      el.querySelector(".fs-body").hidden = true;
      el.querySelector(".fs-hide").hidden = true;
      el.querySelector(".fs-show").hidden = false;
    };
    el.querySelector(".fs-show").onclick = () => {
      el.querySelector(".fs-body").hidden = false;
      el.querySelector(".fs-hide").hidden = false;
      el.querySelector(".fs-show").hidden = true;
    };

    async function refresh() {
      if (!window.GalleryDB || !GalleryDB.enabled()) {
        document.getElementById("fs-online").textContent = "–";
        return;
      }
      try {
        if (!sessionStorage.getItem("sh_visited")) {
          await GalleryDB.trackEvent("visit", { page: location.pathname });
          sessionStorage.setItem("sh_visited", "1");
        }
        const s = await GalleryDB.getStatsSummary();
        if (s) {
          const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
          set("fs-visit", s.all.visit || 0);
          set("fs-lr", s.all.love_red || 0);
          set("fs-lb", s.all.love_blue || 0);
          set("fs-cr", s.all.comment_red || 0);
          set("fs-cb", s.all.comment_blue || 0);
        }
      } catch (e) {
        console.warn("stats", e);
      }
    }

    try {
      GalleryDB.joinPresenceOnline((n) => {
        const o = document.getElementById("fs-online");
        if (o) o.textContent = n;
      });
    } catch (e) {}

    refresh();
    setInterval(refresh, 45000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
