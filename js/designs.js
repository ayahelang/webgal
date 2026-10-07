(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  let all = [];
  let cat = "all";
  let q = "";
  try {
    const sp = new URLSearchParams(location.search);
    const st = (sp.get("student") || sp.get("q") || "").trim();
    if (st) q = st.toLowerCase();
  } catch (e) {}

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function filtered() {
    return all.filter((d) => {
      if (cat !== "all" && String(d.category || "") !== cat) return false;
      if (!q) return true;
      const hay = [d.title, d.author_name, d.description, d.category].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  function renderFilters() {
    const host = $("#designFilters");
    if (!host) return;
    const cats = [...new Set(all.map((d) => d.category || "Umum"))].sort();
    host.innerHTML =
      '<button type="button" class="filter' +
      (cat === "all" ? " active" : "") +
      '" data-cat="all">Semua</button>' +
      cats
        .map(
          (c) =>
            '<button type="button" class="filter' +
            (cat === c ? " active" : "") +
            '" data-cat="' +
            esc(c) +
            '">' +
            esc(c) +
            "</button>"
        )
        .join("");
    host.querySelectorAll(".filter").forEach((b) => {
      b.addEventListener("click", () => {
        cat = b.getAttribute("data-cat") || "all";
        render();
        renderFilters();
      });
    });
  }

  /** Lightbox full-frame proporsional */
  function openLightbox(src, title, meta) {
    let lb = document.getElementById("designLightbox");
    if (!lb) {
      lb = document.createElement("div");
      lb.id = "designLightbox";
      lb.className = "design-lightbox";
      lb.innerHTML =
        '<div class="dlb-backdrop"></div>' +
        '<div class="dlb-frame">' +
        '<button type="button" class="dlb-close" aria-label="Tutup">✕</button>' +
        '<img class="dlb-img" alt="">' +
        '<div class="dlb-caption"></div>' +
        "</div>";
      document.body.appendChild(lb);
      const close = () => {
        lb.classList.remove("is-open");
        document.body.style.overflow = "";
      };
      lb.querySelector(".dlb-backdrop").onclick = close;
      lb.querySelector(".dlb-close").onclick = close;
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && lb.classList.contains("is-open")) close();
      });
    }
    const img = lb.querySelector(".dlb-img");
    img.removeAttribute("width");
    img.removeAttribute("height");
    img.style.maxWidth = "min(96vw, 1400px)";
    img.style.maxHeight = "min(88vh, 1200px)";
    img.style.width = "auto";
    img.style.height = "auto";
    img.style.objectFit = "contain";
    img.alt = title || "";
    img.src = src;
    lb.querySelector(".dlb-caption").textContent =
      (title || "") + (meta ? " · " + meta : "");
    document.body.style.overflow = "hidden";
    lb.classList.add("is-open");
  }

  /** Efek kaca pembesar pada hover */
  function bindMagnifier(wrap) {
    const img = wrap.querySelector("img");
    if (!img || wrap.dataset.magBound) return;
    wrap.dataset.magBound = "1";
    let lens = wrap.querySelector(".des-mag-lens");
    if (!lens) {
      lens = document.createElement("div");
      lens.className = "des-mag-lens";
      wrap.appendChild(lens);
    }
    const size = 120;
    lens.style.width = size + "px";
    lens.style.height = size + "px";

    function move(e) {
      const r = wrap.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) {
        lens.classList.remove("is-on");
        return;
      }
      lens.classList.add("is-on");
      const half = size / 2;
      let lx = x - half;
      let ly = y - half;
      if (lx < 0) lx = 0;
      if (ly < 0) ly = 0;
      if (lx > r.width - size) lx = r.width - size;
      if (ly > r.height - size) ly = r.height - size;
      lens.style.left = lx + "px";
      lens.style.top = ly + "px";
      // zoom ~2.2x, background position follows cursor
      const zx = ((x / r.width) * 100).toFixed(2);
      const zy = ((y / r.height) * 100).toFixed(2);
      lens.style.backgroundImage = 'url("' + img.currentSrc + '")';
      lens.style.backgroundSize = r.width * 2.2 + "px " + r.height * 2.2 + "px";
      lens.style.backgroundPosition = zx + "% " + zy + "%";
    }
    wrap.addEventListener("pointerenter", move);
    wrap.addEventListener("pointermove", move);
    wrap.addEventListener("pointerleave", () => lens.classList.remove("is-on"));
  }

  function render() {
    const list = filtered();
    const grid = $("#designGrid");
    const empty = $("#designEmpty");
    const info = $("#designResultInfo");
    if (info) info.textContent = list.length + " karya ditampilkan · total " + all.length;
    if (!list.length) {
      if (grid) grid.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    grid.innerHTML = list
      .map(
        (d) =>
          `<article class="video-card design-card">
        <button type="button" class="video-thumb-wrap des-thumb" data-full="${esc(d.image_url)}" data-title="${esc(d.title)}" data-meta="${esc((d.category || "") + " · " + (d.author_name || "—"))}" aria-label="Perbesar ${esc(d.title)}">
          <img src="${esc(d.image_url)}" alt="${esc(d.title)}" loading="lazy" decoding="async">
        </button>
        <div class="video-body" style="padding:12px">
          <h3 style="margin:0 0 4px;font-size:15px">${esc(d.title)}</h3>
          <p class="muted" style="margin:0;font-size:12px">${esc(d.category)} · ${esc(d.author_name || "—")}</p>
          <p style="margin:8px 0 0;font-size:13px;color:#c5d8e0">${esc(d.description || "")}</p>
        </div>
      </article>`
      )
      .join("");

    grid.querySelectorAll(".des-thumb").forEach((wrap) => {
      bindMagnifier(wrap);
      wrap.addEventListener("click", (e) => {
        e.preventDefault();
        openLightbox(
          wrap.getAttribute("data-full"),
          wrap.getAttribute("data-title"),
          wrap.getAttribute("data-meta")
        );
      });
    });
  }

  async function init() {
    try {
      all = (window.GalleryDB && (await GalleryDB.listDesignsPublic())) || [];
      if (!all.length && window.GalleryDB && GalleryDB.listDesigns) {
        all = (await GalleryDB.listDesigns()) || [];
      }
    } catch (e) {
      all = [];
      console.warn(e);
    }
    const search = $("#designSearch");
    if (search) {
      if (q) search.value = q;
      search.addEventListener("input", () => {
        q = (search.value || "").trim().toLowerCase();
        render();
      });
    }
    renderFilters();
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
