(() => {
  const $ = (s) => document.querySelector(s);
  const grid = $("#videoGrid");
  let all = [];
  let students = [];
  let state = {
    q: "",
    cat: "all",
    catSlug: "",
    year: "",
    kelas: "",
  };
  let iAmAdmin = false;
  let videoCats = [];
  try {
    const sp = new URLSearchParams(location.search);
    const st = (sp.get("student") || sp.get("q") || "").trim();
    if (st) state.q = st.toLowerCase();
  } catch (e) {}

  function esc(t) {
    return String(t || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function norm(n) {
    return String(n || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function ytId(url) {
    const u = String(url || "");
    let m = u.match(/(?:youtu\.be\/|v=|\/embed\/|shorts\/)([\w-]{6,})/);
    return m ? m[1] : "";
  }

  function thumbUrl(v) {
    if (v._thumb) return v._thumb;
    const id = ytId(v.url) || ytId(v.embed_url);
    if (id) return "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
    const dm = String(v.url || "").match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
    if (dm) return "https://www.dailymotion.com/thumbnail/video/" + dm[1];
    try {
      if (window.GalleryDB && GalleryDB.videoThumbnailHint) {
        const h = GalleryDB.videoThumbnailHint(v.url || v.embed_url || "");
        if (h) return h;
      }
    } catch (e) {}
    return "";
  }

  function parsedVideo(v) {
    try {
      if (window.GalleryDB && GalleryDB.parseVideoUrl) {
        return GalleryDB.parseVideoUrl(v.url || v.embed_url || "");
      }
    } catch (e) {}
    return { platform: v.platform || "other", embed_url: v.embed_url || v.url || "", play_mode: "iframe" };
  }

  function isDirectVideo(v) {
    const p = parsedVideo(v);
    if (p.play_mode === "video" || p.platform === "direct") return true;
    const u = String(v.url || "") + " " + String(v.embed_url || "");
    return /\.(mp4|webm|ogg|m4v)(\?|#|$)/i.test(u) || /fbcdn\.net\/.*\.mp4/i.test(u);
  }

  function isFacebookVideo(v) {
    const p = String(v.platform || "").toLowerCase();
    if (p === "facebook") return true;
    const u = String(v.url || "") + " " + String(v.embed_url || "");
    return /facebook\.com|fb\.watch/i.test(u);
  }

  function ensureEmbed(v) {
    const p = parsedVideo(v);
    return String(p.embed_url || v.embed_url || v.url || "").trim();
  }

  function playModeOf(v) {
    const p = parsedVideo(v);
    if (p.play_mode) return p.play_mode;
    if (isDirectVideo(v)) return "video";
    return "iframe";
  }

  function card(v) {
    const catName = (v.gallery_video_categories && v.gallery_video_categories.name) || "Video";
    const meta = [v.owner_name, v._year ? "Angkatan " + v._year : "", v._class ? "Kls " + v._class : ""]
      .filter(Boolean)
      .join(" · ");
    const thumb = thumbUrl(v);
    const embed = ensureEmbed(v);
    const mode = playModeOf(v);
    const embEsc = esc(embed);
    const fb = isFacebookVideo(v) && mode !== "video";
    let frame;
    if (mode === "video") {
      frame = `<button type="button" class="video-thumb-btn video-thumb-ph is-direct" data-embed="${embEsc}" data-play="video" aria-label="Putar video">
          <span class="video-ph-label">Video</span>
          <span class="video-play">▶</span>
        </button>`;
    } else if (thumb) {
      frame = `<button type="button" class="video-thumb-btn" data-embed="${embEsc}" data-play="iframe" aria-label="Putar video">
          <img class="video-thumb" src="${esc(thumb)}" alt="" loading="lazy" decoding="async" width="480" height="270">
          <span class="video-play">▶</span>
        </button>`;
    } else {
      frame = `<button type="button" class="video-thumb-btn video-thumb-ph ${fb ? "is-fb" : ""}" data-embed="${embEsc}" data-play="iframe" aria-label="Putar video">
          <span class="video-ph-label">${fb ? "Facebook" : "Video"}</span>
          <span class="video-play">▶</span>
        </button>`;
    }
    const adminBtns = iAmAdmin
      ? `<div class="video-admin-acts">
          <button type="button" class="video-admin-btn" data-video-act="edit" title="Ubah">✎ Ubah</button>
          <button type="button" class="video-admin-btn is-danger" data-video-act="del" title="Hapus">🗑 Hapus</button>
        </div>`
      : "";
    return `<article class="video-card" data-video-id="${esc(v.id || "")}" data-video-url="${esc(v.url || "")}">
      <div class="video-frame" data-video-frame>${frame}</div>
      <div class="video-meta">
        <span class="pill">${esc(catName)}</span>
        <h3>${esc(v.title)}</h3>
        ${meta ? `<p class="muted">${esc(meta)}</p>` : ""}
        ${v.description ? `<p>${esc(v.description)}</p>` : ""}
        ${window.SHSocial ? SHSocial.barHtml("video", v.id, {}) : ""}
        <a href="${esc(v.url)}" target="_blank" rel="noopener">Buka sumber ↗</a>
        ${adminBtns}
      </div>
    </article>`;
  }

  function bindPlay(root) {
    (root || document).querySelectorAll(".video-thumb-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const embed = btn.getAttribute("data-embed") || "";
        const mode = btn.getAttribute("data-play") || "iframe";
        const host = btn.closest("[data-video-frame]");
        if (!host || !embed) return;
        if (mode === "video") {
          host.innerHTML = `<video class="video-native" src="${embed.replace(/"/g, "&quot;")}" controls autoplay playsinline preload="metadata"></video>`;
          return;
        }
        const sep = embed.indexOf("?") >= 0 ? "&" : "?";
        const src = embed + sep + "autoplay=1";
        host.innerHTML = `<iframe src="${src.replace(/"/g, "&quot;")}" title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="eager"></iframe>`;
      });
    });
  }

  function ensureAdminModal() {
    let m = document.getElementById("videoAdminModal");
    if (m) return m;
    m = document.createElement("div");
    m.id = "videoAdminModal";
    m.className = "video-admin-modal";
    m.hidden = true;
    m.innerHTML = `
      <div class="video-admin-backdrop" data-close="1"></div>
      <div class="video-admin-panel" role="dialog" aria-modal="true" aria-label="Ubah video">
        <header class="video-admin-head">
          <strong>Ubah video</strong>
          <button type="button" class="video-admin-x" data-close="1" aria-label="Tutup">✕</button>
        </header>
        <form id="videoAdminForm" class="video-admin-form">
          <label>Judul<input name="title" required maxlength="200" /></label>
          <label>URL video<input name="url" required /></label>
          <p class="muted video-admin-hint">Didukung: YouTube, Dailymotion, facebook.com/reel/ANGKA, atau URL .mp4 langsung. Link share/v Facebook & halaman Instagram tidak bisa diputar.</p>
          <label>Kategori<select name="categoryId"><option value="">—</option></select></label>
          <label>Pemilik / pemilik karya<input name="ownerName" maxlength="120" /></label>
          <label>Deskripsi<textarea name="description" rows="3" maxlength="2000"></textarea></label>
          <p id="videoAdminStatus" class="muted" style="margin:0"></p>
          <div class="video-admin-foot">
            <button type="button" class="btn btn-ghost" data-close="1">Batal</button>
            <button type="submit" class="btn btn-primary">Simpan</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(m);
    m.addEventListener("click", (ev) => {
      if (ev.target && ev.target.getAttribute("data-close") === "1") closeAdminModal();
    });
    const form = m.querySelector("#videoAdminForm");
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const id = form.dataset.id;
      const status = m.querySelector("#videoAdminStatus");
      const fd = new FormData(form);
      const payload = {
        title: String(fd.get("title") || "").trim(),
        url: String(fd.get("url") || "").trim(),
        categoryId: String(fd.get("categoryId") || "").trim() || null,
        ownerName: String(fd.get("ownerName") || "").trim(),
        description: String(fd.get("description") || "").trim(),
      };
      status.textContent = "Menyimpan…";
      try {
        await GalleryDB.adminUpdateVideo(id, payload);
        status.textContent = "Tersimpan.";
        const raw = await GalleryDB.listVideos();
        all = (raw || []).map(enrich);
        render();
        setTimeout(closeAdminModal, 400);
      } catch (e) {
        status.textContent = e.message || String(e);
      }
    });
    return m;
  }

  function closeAdminModal() {
    const m = document.getElementById("videoAdminModal");
    if (m) m.hidden = true;
  }

  function openAdminEdit(v) {
    const m = ensureAdminModal();
    const form = m.querySelector("#videoAdminForm");
    form.dataset.id = v.id;
    form.title.value = v.title || "";
    form.url.value = v.url || "";
    form.ownerName.value = v.owner_name || "";
    form.description.value = v.description || "";
    const sel = form.categoryId;
    sel.innerHTML = `<option value="">—</option>` + (videoCats || [])
      .map((c) => `<option value="${esc(c.id)}" ${c.id === v.category_id ? "selected" : ""}>${esc(c.name)}</option>`)
      .join("");
    m.querySelector("#videoAdminStatus").textContent = "";
    m.hidden = false;
  }

  function bindAdmin(root) {
    if (!iAmAdmin) return;
    (root || document).querySelectorAll("[data-video-act]").forEach((btn) => {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const card = btn.closest(".video-card");
        if (!card) return;
        const id = card.getAttribute("data-video-id");
        const v = all.find((x) => String(x.id) === String(id));
        if (!v) return;
        const act = btn.getAttribute("data-video-act");
        if (act === "edit") {
          openAdminEdit(v);
          return;
        }
        if (act === "del") {
          if (!confirm("Hapus video \"" + (v.title || id) + "\"?")) return;
          try {
            await GalleryDB.deleteVideo(id);
            all = all.filter((x) => String(x.id) !== String(id));
            render();
          } catch (e) {
            alert(e.message || String(e));
          }
        }
      });
    });
  }

  function render() {
    if (!grid) return;
    const list = filtered();
    grid.innerHTML = list.map(card).join("") || "";
    bindPlay(grid);
    bindAdmin(grid);
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
    if (!sub) return;
    const isKarya = state.catSlug === "karya-siswa";
    sub.hidden = !isKarya;
    if (!isKarya) {
      state.year = "";
      state.kelas = "";
      sub.innerHTML = "";
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
        buildSubFilters(cats);
        render();
      })
    );
  }

  async function loadStudents() {
    try {
      if (window.GalleryDB && GalleryDB.fetchGalleryFromDb) {
        const db = await GalleryDB.fetchGalleryFromDb();
        students = (db && db.students) || [];
      const searchEl = $("#videoSearch") || document.querySelector('input[type="search"]');
      if (searchEl && state.q) {
        searchEl.value = state.q;
      }
      }
    } catch (e) {}
  }

  async function init() {
    const empty = $("#videoEmpty");
    if (!window.GalleryDB || !GalleryDB.enabled()) {
      if (empty) {
        empty.hidden = false;
        empty.textContent = "Layanan database belum siap.";
      }
      return;
    }
    try {
      await loadStudents();
      try {
        if (GalleryDB.isCurrentUserAdmin) iAmAdmin = !!(await GalleryDB.isCurrentUserAdmin());
      } catch (e) { iAmAdmin = false; }
      const cats = await GalleryDB.listVideoCategories();
      videoCats = cats || [];
      const filters = $("#videoFilters");
      if (filters) {
        filters.innerHTML = `<button type="button" class="filter active" data-cat="all" data-slug="">Semua</button>`;
        (cats || []).forEach((c) => {
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
            buildSubFilters(cats);
            render();
          })
        );
      }
      const raw = await GalleryDB.listVideos();
      all = (raw || []).map(enrich);
      buildSubFilters(cats || []);
      render();
      const search = $("#videoSearch");
      if (search) {
        search.addEventListener("input", () => {
          state.q = search.value.trim().toLowerCase();
          render();
        });
      }
    } catch (e) {
      console.error(e);
      if (empty) {
        empty.hidden = false;
        empty.textContent = "Gagal memuat: " + (e.message || e);
      }
    }
  }
  init();
})();
