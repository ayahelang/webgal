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

  /**
   * Kotak = jendela zoom. Gambar ditata proporsional (bukan crop),
   * zoom 2×–4× (menyesuaikan resolusi), pan mengikuti mouse:
   * sudut kotak ↔ sudut gambar asli.
   */
  function bindMagnifier(wrap) {
    const img = wrap.querySelector("img");
    if (!img || wrap.dataset.magBound) return;
    wrap.dataset.magBound = "1";

    function layoutBase() {
      const nw = img.naturalWidth || 1;
      const nh = img.naturalHeight || 1;
      const boxW = wrap.clientWidth || 1;
      const boxH = wrap.clientHeight || 1;
      // tampilan awal: contain (penuh proporsional di dalam kotak)
      const fit = Math.min(boxW / nw, boxH / nh);
      const baseW = nw * fit;
      const baseH = nh * fit;
      img.style.position = "absolute";
      img.style.maxWidth = "none";
      img.style.width = baseW + "px";
      img.style.height = baseH + "px";
      img.style.left = (boxW - baseW) / 2 + "px";
      img.style.top = (boxH - baseH) / 2 + "px";
      img.style.objectFit = "fill";
      img.style.transform = "none";
      return { nw, nh, boxW, boxH, baseW, baseH, fit };
    }

    function pickZoom(nw, nh, boxW, boxH) {
      // seberapa besar resolusi asli dibanding kotak
      const res = Math.min(nw / boxW, nh / boxH);
      // 2× minimum, sampai 4× jika gambar cukup tajam
      let z = 2 + Math.min(2, Math.max(0, (res - 1) * 0.75));
      if (z < 2) z = 2;
      if (z > 4) z = 4;
      return z;
    }

    function setPan(e) {
      const nw = img.naturalWidth || 1;
      const nh = img.naturalHeight || 1;
      const boxW = wrap.clientWidth || 1;
      const boxH = wrap.clientHeight || 1;
      const zoom = pickZoom(nw, nh, boxW, boxH);

      // ukuran gambar di-zoom, tetap proporsional terhadap aspek asli
      const fit = Math.min(boxW / nw, boxH / nh);
      const zW = nw * fit * zoom;
      const zH = nh * fit * zoom;

      const r = wrap.getBoundingClientRect();
      let px = (e.clientX - r.left) / boxW;
      let py = (e.clientY - r.top) / boxH;
      if (px < 0) px = 0;
      if (px > 1) px = 1;
      if (py < 0) py = 0;
      if (py > 1) py = 1;

      // sudut kiri-atas kotak → sudut kiri-atas gambar; kanan-bawah → kanan-bawah
      const left = px * (boxW - zW);
      const top = py * (boxH - zH);

      img.style.width = zW + "px";
      img.style.height = zH + "px";
      img.style.left = left + "px";
      img.style.top = top + "px";
      img.style.transform = "none";
    }

    function onReady() {
      layoutBase();
    }
    if (img.complete && img.naturalWidth) onReady();
    else img.addEventListener("load", onReady);

    wrap.addEventListener("pointerenter", (e) => {
      wrap.classList.add("is-zooming");
      if (!img.naturalWidth) return;
      setPan(e);
    });
    wrap.addEventListener("pointermove", (e) => {
      if (!wrap.classList.contains("is-zooming")) return;
      if (!img.naturalWidth) return;
      setPan(e);
    });
    wrap.addEventListener("pointerleave", () => {
      wrap.classList.remove("is-zooming");
      if (img.naturalWidth) layoutBase();
    });
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
