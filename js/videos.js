(() => {
  const $ = (s) => document.querySelector(s);
  const grid = $("#videoGrid");
  let all = [];
  let students = []; // {name, class, angkatan}
  let state = {
    q: "",
    cat: "all", // all | categoryId
    catSlug: "",
    year: "", // for karya siswa
    kelas: "",
    student: "",
  };

  function esc(t) {
    return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }
  function norm(n) {
    return String(n || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function enrich(v) {
    const on = v.owner_name || "";
    if (!on) return { ...v, _class: "", _year: "" };
    const hit = students.find((s) => norm(s.name) === norm(on));
    if (hit) return { ...v, _class: String(hit.class || ""), _year: String(hit.angkatan || "") };
    // parse from description "Angkatan 2024 Kls 51"
    const m = String(v.description || "").match(/Angkatan\s+(\d{4}).*?(\d{2})/i);
    if (m) return { ...v, _year: m[1], _class: m[2] };
    return { ...v, _class: "", _year: "" };
  }

  function filtered() {
    return all.filter((v) => {
      if (state.cat !== "all" && v.category_id !== state.cat) return false;
      if (state.year && v._year && v._year !== state.year) return false;
      if (state.year && !v._year && state.catSlug === "karya-siswa") {
        // keep if no year meta? optional exclude
      }
      if (state.kelas && v._class && v._class !== state.kelas) return false;
      if (state.student && norm(v.owner_name) !== norm(state.student)) return false;
      if (state.q) {
        const hay = [v.title, v.description, v.owner_name, v.url].join(" ").toLowerCase();
        if (!hay.includes(state.q)) return false;
      }
      return true;
    });
  }

  function card(v) {
    const catName = (v.gallery_video_categories && v.gallery_video_categories.name) || "Video";
    const meta = [v.owner_name, v._year ? "Angkatan " + v._year : "", v._class ? "Kls " + v._class : ""]
      .filter(Boolean)
      .join(" · ");
    return `<article class="video-card">
      <div class="video-frame">
        <iframe src="${esc(v.embed_url)}" title="${esc(v.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
      </div>
      <div class="video-meta">
        <span class="pill">${esc(catName)}</span>
        <h3>${esc(v.title)}</h3>
        ${meta ? `<p class="muted">${esc(meta)}</p>` : ""}
        ${v.description ? `<p>${esc(v.description)}</p>` : ""}
        ${window.SHSocial ? SHSocial.barHtml("video", v.id, {}) : ""}
        <a href="${esc(v.url)}" target="_blank" rel="noopener">Buka sumber ↗</a>
      </div>
    </article>`;
  }

  function render() {
    const list = filtered();
    grid.innerHTML = list.map(card).join("") || "";
    if (window.SHSocial) {
      SHSocial.bind(grid);
      SHSocial.hydrate(grid);
    }
    const empty = $("#videoEmpty");
    if (empty) empty.hidden = list.length > 0;
    const info = $("#videoResultInfo");
    if (info) info.textContent = list.length + " video ditampilkan · " + all.length + " total";
  }

  function buildSubFilters(cats) {
    const sub = $("#videoSubFilters");
    const stu = $("#videoStudentFilters");
    if (!sub || !stu) return;
    const isKarya = state.catSlug === "karya-siswa";
    sub.hidden = !isKarya;
    stu.hidden = !isKarya;
    if (!isKarya) {
      state.year = "";
      state.kelas = "";
      state.student = "";
      sub.innerHTML = "";
      stu.innerHTML = "";
      return;
    }
    const years = [...new Set(all.filter((v) => v._year).map((v) => v._year))].sort().reverse();
    const classes = [...new Set(all.filter((v) => v._class).map((v) => v._class))].sort();
    sub.innerHTML =
      `<button type="button" class="filter ${!state.year && !state.kelas ? "active" : ""}" data-y="" data-k="">Semua karya siswa</button>` +
      years
        .map(
          (y) =>
            `<button type="button" class="filter ${state.year === y && !state.kelas ? "active" : ""}" data-y="${y}" data-k="">Angkatan ${y}</button>`
        )
        .join("") +
      classes
        .map((c) =>
          years
            .map(
              (y) =>
                `<button type="button" class="filter ${state.year === y && state.kelas === c ? "active" : ""}" data-y="${y}" data-k="${c}">${c} · ${y}</button>`
            )
            .join("")
        )
        .join("");

    sub.querySelectorAll(".filter").forEach((b) =>
      b.addEventListener("click", () => {
        state.year = b.dataset.y || "";
        state.kelas = b.dataset.k || "";
        state.student = "";
        buildStudentFilters();
        buildSubFilters(cats);
        render();
      })
    );
    buildStudentFilters();
  }

  function buildStudentFilters() {
    const stu = $("#videoStudentFilters");
    if (!stu) return;
    let pool = all.filter((v) => v.owner_name);
    if (state.year) pool = pool.filter((v) => v._year === state.year);
    if (state.kelas) pool = pool.filter((v) => v._class === state.kelas);
    const names = [...new Set(pool.map((v) => v.owner_name))].sort((a, b) => a.localeCompare(b, "id"));
    stu.hidden = names.length === 0;
    // Dropdown agar hemat ruang (tidak pakai tab/button yang panjang di laptop)
    const opts =
      `<option value="">Semua siswa (${names.length})</option>` +
      names.map((n) => `<option value="${esc(n)}" ${state.student === n ? "selected" : ""}>${esc(n)}</option>`).join("");
    stu.innerHTML = `
      <label class="field" style="margin:0;min-width:220px;max-width:320px">
        <span style="font-size:12px;color:#8aa0ab">Filter nama siswa</span>
        <select id="videoStudentSelect" class="filter-select" style="width:100%;margin-top:4px">
          ${opts}
        </select>
      </label>`;
    const sel = stu.querySelector("#videoStudentSelect");
    if (sel) {
      sel.addEventListener("change", () => {
        state.student = sel.value || "";
        render();
      });
    }
  }

  async function loadStudents() {
    try {
      if (GalleryDB.fetchGalleryFromDb) {
        const db = await GalleryDB.fetchGalleryFromDb();
        students = (db && db.students) || [];
      }
    } catch (e) {}
    if (!students.length) {
      try {
        const r = await fetch("data/websites.json", { cache: "no-store" });
        const j = await r.json();
        students = (j.students || []).map((s) => ({
          name: s.name,
          class: s.class,
          angkatan: s.angkatan || "2025",
        }));
      } catch (e) {}
    }
  }

  async function init() {
    if (!GalleryDB.enabled()) {
      $("#videoEmpty").hidden = false;
      $("#videoEmpty").textContent = "Layanan data belum siap.";
      return;
    }
    try {
      await loadStudents();
      const cats = await GalleryDB.listVideoCategories();
      const filters = $("#videoFilters");
      filters.innerHTML = `<button type="button" class="filter active" data-cat="all" data-slug="">Semua</button>`;
      cats.forEach((c) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "filter";
        b.dataset.cat = c.id;
        b.dataset.slug = c.slug || "";
        b.textContent = c.name;
        filters.appendChild(b);
      });
      filters.querySelectorAll(".filter").forEach((b) =>
        b.addEventListener("click", () => {
          filters.querySelectorAll(".filter").forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
          state.cat = b.dataset.cat === "all" ? "all" : b.dataset.cat;
          state.catSlug = b.dataset.slug || "";
          state.year = "";
          state.kelas = "";
          state.student = "";
          buildSubFilters(cats);
          render();
        })
      );

      const raw = await GalleryDB.listVideos();
      all = raw.map(enrich);
      buildSubFilters(cats);
      render();

      const search = $("#videoSearch");
      if (search) {
        search.addEventListener("input", () => {
          state.q = search.value.trim().toLowerCase();
          render();
        });
      }
    } catch (e) {
      $("#videoEmpty").hidden = false;
      $("#videoEmpty").textContent = "Gagal memuat: " + (e.message || e);
    }
  }
  init();
})();
