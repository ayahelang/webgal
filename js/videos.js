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
  let myUserId = "";
  let myLinkedName = "";
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

  function platformLabel(v) {
    const p = String((parsedVideo(v).platform || v.platform || "")).toLowerCase();
    if (p === "facebook") return "Facebook";
    if (p === "instagram") return "Instagram";
    if (p === "tiktok") return "TikTok";
    if (p === "twitter") return "X / Twitter";
    if (p === "direct") return "Video";
    if (p === "youtube") return "YouTube";
    if (p === "dailymotion") return "Dailymotion";
    return "Video";
  }

  function normName(n) {
    return String(n || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function isOwnerVideo(v) {
    if (!v) return false;
    if (myUserId && v.owner_user_id && String(v.owner_user_id) === String(myUserId)) return true;
    if (myLinkedName && v.owner_name && normName(v.owner_name) === normName(myLinkedName)) return true;
    return false;
  }

  function canManageVideo(v) {
    return !!(iAmAdmin || isOwnerVideo(v));
  }

  function enrich(v) {
    const on = v.owner_name || "";
    if (!on) return Object.assign({}, v, { _class: "", _year: "" });
    const hit = students.find((s) => norm(s.name) === norm(on));
    if (hit) return Object.assign({}, v, { _class: String(hit.class || ""), _year: String(hit.angkatan || "") });
    const m = String(v.description || "").match(/Angkatan\s+(\d{4}).*?(\d{2})/i);
    if (m) return Object.assign({}, v, { _year: m[1], _class: m[2] });
    return Object.assign({}, v, { _class: "", _year: "" });
  }

  function filtered() {
    return all.filter((v) => {
      if (state.cat !== "all" && v.category_id !== state.cat) return false;
      if (state.year && v._year && v._year !== state.year) return false;
      if (state.kelas && v._class && v._class !== state.kelas) return false;
      if (state.q) {
        const hay = [v.title, v.description, v.owner_name, v.url].join(" ").toLowerCase();
        if (!hay.includes(state.q)) return false;
      }
      return true;
    });
  }

  function card(v) {
    const catName = (v.gallery_video_categories && v.gallery_video_categories.name) || "Video";
    // meta owner/angkatan/kelas dihilangkan — sudah ada di judul & deskripsi
    const thumb = thumbUrl(v);
    const embed = ensureEmbed(v);
    const mode = playModeOf(v);
    const embEsc = esc(embed);
    const label = platformLabel(v);
    const plat = String((parsedVideo(v).platform || "")).toLowerCase();
    let frame;
    if (mode === "video") {
      frame = `<button type="button" class="video-thumb-btn video-thumb-ph is-direct" data-embed="${embEsc}" data-play="video" aria-label="Putar video">
          <span class="video-ph-label">${esc(label)}</span>
          <span class="video-play">▶</span>
        </button>`;
    } else if (mode === "link") {
      frame = `<a class="video-thumb-btn video-thumb-ph is-link" href="${esc(v.url || embed)}" target="_blank" rel="noopener" aria-label="Buka di ${esc(label)}">
          <span class="video-ph-label">${esc(label)}</span>
          <span class="video-play">↗</span>
        </a>`;
    } else if (thumb) {
      frame = `<button type="button" class="video-thumb-btn" data-embed="${embEsc}" data-play="iframe" data-src-url="${esc(v.url || "")}" data-platform="${esc(plat)}" aria-label="Putar video">
          <img class="video-thumb" src="${esc(thumb)}" alt="" loading="lazy" decoding="async" width="480" height="270">
          <span class="video-play">▶</span>
        </button>`;
    } else {
      frame = `<button type="button" class="video-thumb-btn video-thumb-ph is-${esc(plat || "video")}" data-embed="${embEsc}" data-play="iframe" data-src-url="${esc(v.url || "")}" data-platform="${esc(plat)}" aria-label="Putar video">
          <span class="video-ph-label">${esc(label)}</span>
          <span class="video-play">▶</span>
        </button>`;
    }
    const manage = canManageVideo(v);
    const manageBtns = manage
      ? `<div class="video-card-foot">
          <a class="video-src-link" href="${esc(v.url)}" target="_blank" rel="noopener">Buka sumber ↗</a>
          <div class="video-admin-acts">
            <button type="button" class="video-admin-btn" data-video-act="edit" title="Ubah">✎ Ubah</button>
            <button type="button" class="video-admin-btn is-danger" data-video-act="del" title="Hapus">🗑 Hapus</button>
          </div>
        </div>`
      : `<div class="video-card-foot">
          <a class="video-src-link" href="${esc(v.url)}" target="_blank" rel="noopener">Buka sumber ↗</a>
        </div>`;
    return `<article class="video-card" data-video-id="${esc(v.id || "")}" data-video-url="${esc(v.url || "")}">
      <div class="video-frame" data-video-frame>${frame}</div>
      <div class="video-meta">
        <div class="video-meta-main">
          <span class="pill">${esc(catName)}</span>
          <h3>${esc(v.title)}</h3>
          ${v.description ? `<p class="muted">${esc(v.description)}</p>` : ""}
          ${window.SHSocial ? SHSocial.barHtml("video", v.id, {}) : ""}
        </div>
        ${manageBtns}
      </div>
    </article>`;
  }

  function bindPlay(root) {
    (root || document).querySelectorAll("button.video-thumb-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const embed = btn.getAttribute("data-embed") || "";
        const mode = btn.getAttribute("data-play") || "iframe";
        const srcUrl = btn.getAttribute("data-src-url") || "";
        const platform = btn.getAttribute("data-platform") || "";
        const host = btn.closest("[data-video-frame]");
        if (!host || !embed) return;
        if (mode === "video") {
          host.innerHTML = `<video class="video-native" src="${embed.replace(/"/g, "&quot;")}" controls autoplay playsinline preload="metadata"></video>`;
          return;
        }
        const sep = embed.indexOf("?") >= 0 ? "&" : "?";
        const src = embed + sep + "autoplay=1";
        const openHref = (srcUrl || embed).replace(/"/g, "&quot;");
        // Facebook sering "Video unavailable" di iframe — tampilkan iframe + tombol buka sumber
        if (platform === "facebook") {
          host.innerHTML = `
            <div class="video-fb-wrap">
              <iframe src="${src.replace(/"/g, "&quot;")}" title="Video" allow="autoplay; encrypted-media; picture-in-picture; web-share" allowfullscreen loading="eager"></iframe>
              <a class="video-open-src" href="${openHref}" target="_blank" rel="noopener">Jika tidak diputar, buka di Facebook ↗</a>
            </div>`;
          return;
        }
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
          <p class="muted video-admin-hint">Didukung: YouTube, Dailymotion, TikTok (/video/ANGKA), Instagram (/reel/KODE), X (/status/ANGKA), Facebook (/reel/ANGKA), atau URL .mp4. Hindari facebook.com/share/v/…</p>
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
    m.addEventListener("click", async (ev) => {
      if (ev.target && ev.target.getAttribute("data-close") === "1") closeAdminModal();
    });
    // Panel bisa digeser lewat header
    (function bindDragPanel() {
      const panel = m.querySelector(".video-admin-panel");
      const head = m.querySelector(".video-admin-head");
      if (!panel || !head) return;
      let dragging = false;
      let ox = 0, oy = 0;
      head.addEventListener("pointerdown", (ev) => {
        if (ev.target.closest("button") || ev.target.closest("[data-close]")) return;
        dragging = true;
        const r = panel.getBoundingClientRect();
        // pindah ke posisi fixed absolute dari center layout
        panel.style.position = "fixed";
        panel.style.margin = "0";
        panel.style.left = r.left + "px";
        panel.style.top = r.top + "px";
        panel.style.transform = "none";
        ox = ev.clientX - r.left;
        oy = ev.clientY - r.top;
        head.classList.add("is-dragging");
        try { head.setPointerCapture(ev.pointerId); } catch (e) {}
        ev.preventDefault();
      });
      head.addEventListener("pointermove", (ev) => {
        if (!dragging) return;
        const w = panel.offsetWidth;
        const h = panel.offsetHeight;
        let nl = ev.clientX - ox;
        let nt = ev.clientY - oy;
        nl = Math.max(8, Math.min(window.innerWidth - Math.min(80, w), nl));
        nt = Math.max(8, Math.min(window.innerHeight - 40, nt));
        panel.style.left = nl + "px";
        panel.style.top = nt + "px";
      });
      function endDrag(ev) {
        if (!dragging) return;
        dragging = false;
        head.classList.remove("is-dragging");
        try { if (ev && ev.pointerId != null) head.releasePointerCapture(ev.pointerId); } catch (e) {}
      }
      head.addEventListener("pointerup", endDrag);
      head.addEventListener("pointercancel", endDrag);
    })();
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
        const mode = form.dataset.mode || "admin";
        if (mode === "admin" && GalleryDB.adminUpdateVideo) {
          await GalleryDB.adminUpdateVideo(id, payload);
        } else if (GalleryDB.updateMyVideo) {
          await GalleryDB.updateMyVideo(id, {
            title: payload.title,
            url: payload.url,
            description: payload.description,
          });
        } else {
          throw new Error("Simpan tidak tersedia");
        }
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
    const asAdmin = iAmAdmin;
    form.dataset.id = v.id;
    form.dataset.mode = asAdmin ? "admin" : "owner";
    form.title.value = v.title || "";
    form.url.value = v.url || "";
    form.ownerName.value = v.owner_name || "";
    form.description.value = v.description || "";
    const sel = form.categoryId;
    sel.innerHTML = `<option value="">—</option>` + (videoCats || [])
      .map((c) => `<option value="${esc(c.id)}" ${c.id === v.category_id ? "selected" : ""}>${esc(c.name)}</option>`)
      .join("");
    // Siswa pemilik: sembunyikan kategori & pemilik (hanya admin yang ubah itu)
    const labCat = sel.closest("label");
    const labOwn = form.ownerName.closest("label");
    if (labCat) labCat.hidden = !asAdmin;
    if (labOwn) labOwn.hidden = !asAdmin;
    const head = m.querySelector(".video-admin-head strong");
    if (head) head.textContent = asAdmin ? "Ubah video (admin)" : "Ubah video saya";
    m.querySelector("#videoAdminStatus").textContent = "";
    m.hidden = false;
  }

  function bindAdmin(root) {
    (root || document).querySelectorAll("[data-video-act]").forEach((btn) => {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const card = btn.closest(".video-card");
        if (!card) return;
        const id = card.getAttribute("data-video-id");
        const v = all.find((x) => String(x.id) === String(id));
        if (!v || !canManageVideo(v)) return;
        const act = btn.getAttribute("data-video-act");
        if (act === "edit") {
          openAdminEdit(v);
          return;
        }
        if (act === "del") {
          if (window.SHDialog) { if (!(await SHDialog.confirm("Hapus video \"" + ((v && v.title) || id) + "\"?"))) return; } else if (!confirm("Hapus video \"" + ((v && v.title) || id) + "\"?")) return;
          try {
            if (iAmAdmin) {
              await GalleryDB.deleteVideo(id);
            } else if (GalleryDB.deleteMyVideo) {
              await GalleryDB.deleteMyVideo(id);
            } else {
              throw new Error("Hapus tidak tersedia");
            }
            all = all.filter((x) => String(x.id) !== String(id));
            render();
          } catch (e) {
            window.SHDialog ? SHDialog.alert(e.message || String(e)) : alert(e.message || String(e));
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
      b.addEventListener("click", async () => {
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
      async function refreshAdminFlag() {
        let admin = false;
        let uid = "";
        let linked = "";
        try {
          if (GalleryDB.isCurrentUserAdmin) admin = !!(await GalleryDB.isCurrentUserAdmin());
        } catch (e) {}
        try {
          const sess = GalleryDB.getSession ? await GalleryDB.getSession() : null;
          if (sess && sess.user) uid = sess.user.id || "";
          const email = sess && sess.user && sess.user.email;
          if (!admin && email && window.SUPABASE_CONFIG && Array.isArray(SUPABASE_CONFIG.adminEmails)) {
            admin = SUPABASE_CONFIG.adminEmails.map(String).map((x) => x.toLowerCase()).includes(String(email).toLowerCase());
          }
        } catch (e) {}
        try {
          const prof = GalleryDB.getMyProfile ? await GalleryDB.getMyProfile() : null;
          if (prof) {
            if (prof.is_admin) admin = true;
            linked = String(prof.linked_student_name || "").trim();
          }
        } catch (e) {}
        const changed =
          admin !== iAmAdmin ||
          String(uid) !== String(myUserId) ||
          String(linked) !== String(myLinkedName);
        iAmAdmin = admin;
        myUserId = uid;
        myLinkedName = linked;
        return changed;
      }
      await refreshAdminFlag();
      // Auth kadang siap belakangan — cek ulang
      setTimeout(async () => {
        if (await refreshAdminFlag()) render();
      }, 1500);
      setTimeout(async () => {
        if (await refreshAdminFlag()) render();
      }, 4000);
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
          b.addEventListener("click", async () => {
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
