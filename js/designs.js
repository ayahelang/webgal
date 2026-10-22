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


  let alumniIndex = {};

  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return String(iso).slice(0, 10);
    }
  }

  function metaForAuthor(name) {
    const hit = alumniIndex[String(name || "").toLowerCase().trim()];
    if (!hit) return { year: "", kelas: "", role: "" };
    return hit;
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
      .map((d) => {
        const m = metaForAuthor(d.author_name);
        const ang = m.year ? "Angkatan " + m.year : "";
        const kls = m.kelas ? "Kls " + m.kelas : (m.role && /pengajar/i.test(m.role) ? "Pengajar" : "");
        const metaLine = [d.category || "Umum", d.author_name || "—", ang, kls]
          .filter(Boolean)
          .join(" · ");
        const social =
          window.SHSocial && d.id
            ? SHSocial.miniBarHtml("design", d.id)
            : "";
        const isPdf =
          window.SHPdfFlip && SHPdfFlip.isPdfUrl
            ? SHPdfFlip.isPdfUrl(d.image_url)
            : /\.pdf(\?|#|$)/i.test(String(d.image_url || ""));
        const media = isPdf
          ? `<div class="des-pdf-host" data-pdf-url="${esc(d.image_url)}" data-pdf-title="${esc(d.title)}"></div>`
          : `<button type="button" class="video-thumb-wrap des-thumb" data-full="${esc(d.image_url)}" data-title="${esc(d.title)}" data-meta="${esc(metaLine)}" aria-label="Perbesar ${esc(d.title)}">
          <img src="${esc(d.image_url)}" alt="${esc(d.title)}" loading="lazy" decoding="async">
        </button>`;
        return (
          `<article class="video-card design-card${isPdf ? " is-pdf" : ""}" data-design-id="${esc(d.id)}">
        ${media}
        <div class="video-body" style="padding:12px">
          <h3 class="des-title" style="margin:0 0 4px;font-size:15px;cursor:pointer" title="Klik judul: tampilkan love & komentar">${esc(d.title)}</h3>
          <p class="muted" style="margin:0;font-size:12px">${esc(metaLine)}${isPdf ? " · PDF" : ""}</p>
          <p class="muted" style="margin:4px 0 0;font-size:11px">Submit: ${esc(fmtDate(d.created_at))}</p>
          <p style="margin:8px 0 0;font-size:13px;color:#c5d8e0">${esc(d.description || "")}</p>
          <div class="des-social-wrap" style="margin-top:10px">${social}</div>
        </div>
      </article>`
        );
      })
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

    // PDF flip-page
    grid.querySelectorAll(".des-pdf-host").forEach((host) => {
      const url = host.getAttribute("data-pdf-url");
      if (url && window.SHPdfFlip) {
        SHPdfFlip.mount(host, url, { title: host.getAttribute("data-pdf-title") || "" });
      } else if (url) {
        host.innerHTML =
          '<p class="muted" style="padding:12px;font-size:12px">PDF: <a href="' +
          esc(url) +
          '" target="_blank" rel="noopener">buka file</a></p>';
      }
    });

    // Toggle love/komentar via judul (mirip website)
    grid.querySelectorAll(".des-title").forEach((h) => {
      h.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const card = h.closest(".design-card");
        if (!card) return;
        const bar = card.querySelector(".react-mini");
        const panel = card.querySelector(".cmt-panel");
        if (!bar) return;
        const open = bar.hasAttribute("hidden");
        if (open) {
          bar.removeAttribute("hidden");
          bar.classList.remove("is-collapsed");
        } else {
          bar.setAttribute("hidden", "");
          bar.classList.add("is-collapsed");
          if (panel) panel.setAttribute("hidden", "");
        }
      });
    });

    if (window.SHSocial) {
      SHSocial.bind(grid);
      SHSocial.hydrate(grid);
    }
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
    // indeks nama → angkatan/kelas untuk meta card
    try {
      if (window.GalleryDB && typeof GalleryDB.fetchGalleryFromDb === "function") {
        const g = await GalleryDB.fetchGalleryFromDb();
        (g && g.students ? g.students : []).forEach((s) => {
          if (s.name)
            alumniIndex[String(s.name).toLowerCase().trim()] = {
              year: s.angkatan || "",
              kelas: s.class || "",
              role: s.role || "",
            };
        });
      }
    } catch (e) {}
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
