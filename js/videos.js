(() => {
  const $ = (s) => document.querySelector(s);
  const grid = $("#videoGrid");
  const filters = $("#videoFilters");
  let all = [];
  let cat = "";

  function esc(t) {
    return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }

  function card(v) {
    const catName = (v.gallery_video_categories && v.gallery_video_categories.name) || "Video";
    return `<article class="video-card">
      <div class="video-frame">
        <iframe src="${esc(v.embed_url)}" title="${esc(v.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
      </div>
      <div class="video-meta">
        <span class="pill">${esc(catName)}</span>
        <h3>${esc(v.title)}</h3>
        ${v.description ? `<p>${esc(v.description)}</p>` : ""}
        <a href="${esc(v.url)}" target="_blank" rel="noopener">Buka sumber ↗</a>
      </div>
    </article>`;
  }

  function render() {
    const list = cat ? all.filter((v) => v.category_id === cat) : all;
    grid.innerHTML = list.map(card).join("");
    $("#videoEmpty").hidden = list.length > 0;
  }

  async function init() {
    if (!GalleryDB.enabled()) {
      $("#videoEmpty").hidden = false;
      $("#videoEmpty").textContent = "Supabase belum dikonfigurasi.";
      return;
    }
    try {
      const cats = await GalleryDB.listVideoCategories();
      cats.forEach((c) => {
        const b = document.createElement("button");
        b.className = "filter";
        b.dataset.cat = c.id;
        b.textContent = c.name;
        filters.appendChild(b);
      });
      filters.querySelectorAll(".filter").forEach((b) =>
        b.addEventListener("click", () => {
          filters.querySelectorAll(".filter").forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
          cat = b.dataset.cat || "";
          render();
        })
      );
      all = await GalleryDB.listVideos();
      render();
    } catch (e) {
      $("#videoEmpty").hidden = false;
      $("#videoEmpty").textContent = "Gagal memuat: " + (e.message || e);
    }
  }
  init();
})();
