(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  let all = [];
  let cat = "all";
  let q = "";

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
        <a href="${esc(d.image_url)}" target="_blank" rel="noopener" class="video-thumb-wrap">
          <img src="${esc(d.image_url)}" alt="${esc(d.title)}" loading="lazy" style="width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#0a1218">
        </a>
        <div class="video-body" style="padding:12px">
          <h3 style="margin:0 0 4px;font-size:15px">${esc(d.title)}</h3>
          <p class="muted" style="margin:0;font-size:12px">${esc(d.category)} · ${esc(d.author_name || "—")}</p>
          <p style="margin:8px 0 0;font-size:13px;color:#c5d8e0">${esc(d.description || "")}</p>
        </div>
      </article>`
      )
      .join("");
  }

  async function init() {
    try {
      all = (window.GalleryDB && (await GalleryDB.listDesigns())) || [];
    } catch (e) {
      all = [];
      console.warn(e);
    }
    const search = $("#designSearch");
    if (search) {
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
