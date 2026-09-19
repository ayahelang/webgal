(function () {
  function boot() {
    if (document.getElementById("sh-float-stats")) return;
    const el = document.createElement("div");
    el.id = "sh-float-stats";
    el.style.left = "16px";
    el.style.bottom = "16px";
    el.style.right = "auto";
    el.style.top = "auto";
    el.innerHTML = `
      <button type="button" class="fs-hide" title="Sembunyikan">−</button>
      <div class="fs-body">
        <span class="fs-drag" title="Geser">⋮⋮</span>
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

    let dragging = false;
    let startX = 0, startY = 0, origL = 0, origT = 0;

    function onDown(e) {
      if (e.target.closest("a,button") && !e.target.classList.contains("fs-drag")) return;
      dragging = true;
      const r = el.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      origL = r.left;
      origT = r.top;
      el.style.right = "auto";
      el.style.bottom = "auto";
      el.style.left = origL + "px";
      el.style.top = origT + "px";
      el.classList.add("is-dragging");
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let nl = origL + dx;
      let nt = origT + dy;
      nl = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, nl));
      nt = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, nt));
      el.style.left = nl + "px";
      el.style.top = nt + "px";
    }
    function onUp() {
      dragging = false;
      el.classList.remove("is-dragging");
    }

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    // touch
    el.addEventListener("touchstart", (e) => {
      if (e.target.closest("a,button") && !e.target.classList.contains("fs-drag")) return;
      const t = e.touches[0];
      onDown({ clientX: t.clientX, clientY: t.clientY, preventDefault() {}, target: e.target });
    }, { passive: false });
    window.addEventListener("touchmove", (e) => {
      if (!dragging) return;
      const t = e.touches[0];
      onMove({ clientX: t.clientX, clientY: t.clientY });
    }, { passive: true });
    window.addEventListener("touchend", onUp);

    el.querySelector(".fs-hide").onclick = (e) => {
      e.stopPropagation();
      el.querySelector(".fs-body").hidden = true;
      el.querySelector(".fs-hide").hidden = true;
      el.querySelector(".fs-show").hidden = false;
    };
    el.querySelector(".fs-show").onclick = (e) => {
      e.stopPropagation();
      el.querySelector(".fs-body").hidden = false;
      el.querySelector(".fs-hide").hidden = false;
      el.querySelector(".fs-show").hidden = true;
    };

    async function refresh() {
      if (!window.GalleryDB || !GalleryDB.enabled()) return;
      try {
        if (!sessionStorage.getItem("sh_visited")) {
          await GalleryDB.trackEvent("visit", { page: location.pathname });
          sessionStorage.setItem("sh_visited", "1");
        }
        const s = await GalleryDB.getStatsSummary();
        if (s) {
          const set = (id, v) => {
            const n = document.getElementById(id);
            if (n) n.textContent = v;
          };
          set("fs-visit", s.all.visit || 0);
          set("fs-lr", s.all.love_red || 0);
          set("fs-lb", s.all.love_blue || 0);
          set("fs-cr", s.all.comment_red || 0);
          set("fs-cb", s.all.comment_blue || 0);
        }
      } catch (e) {}
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
