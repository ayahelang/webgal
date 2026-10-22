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
    // dailymotion fallback: no easy static without id parse
    const dm = String(v.url || "").match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
    if (dm) return "https://www.dailymotion.com/thumbnail/video/" + dm[1];
    // hint dari GalleryDB jika ada
    try {
      if (window.GalleryDB && GalleryDB.videoThumbnailHint) {
        const h = GalleryDB.videoThumbnailHint(v.url || v.embed_url || "");
        if (h) return h;
      }
    } catch (e) {}
    return "";
  }

  function isFacebookVideo(v) {
    const p = String(v.platform || "").toLowerCase();
    if (p === "facebook") return true;
    const u = String(v.url || "") + " " + String(v.embed_url || "");
    return /facebook\.com|fb\.watch/i.test(u);
  }

  function ensureEmbed(v) {
    let emb = String(v.embed_url || "").trim();
    // Perbaiki embed lama yang masih URL facebook mentah
    if (isFacebookVideo(v) && emb && !/plugins\/video\.php/i.test(emb)) {
      try {
        if (window.GalleryDB && GalleryDB.parseVideoUrl) {
          const parsed = GalleryDB.parseVideoUrl(v.url || emb);
          if (parsed && parsed.embed_url) emb = parsed.embed_url;
        } else {
          const href = (v.url || emb).split("#")[0];
          emb =
            "https://www.facebook.com/plugins/video.php?href=" +
            encodeURIComponent(href) +
            "&show_text=0&width=560";
        }
      } catch (e) {}
    }
    return emb;
  }

  function enrich(v) {
    const on = v.owner_name || "";
    if (!on) return { ...v, _class: "", _year: "" };
    const hit = students.find((s) => norm(s.name) === norm(on));
    if (hit) return { ...v, _class: String(hit.class || ""), _year: String(hit.angkatan || "") };
    const m = String(v.description || "").match(/Angkatan\s+(\d{4}).*?(\d{2})/i);
    if (m) return { ...v, _year: m[1], _class: m[2] };
    return { ...v, _class: "", _year: "" };
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
    const meta = [v.owner_name, v._year ? "Angkatan " + v._year : "", v._class ? "Kls " + v._class : ""]
      .filter(Boolean)
      .join(" · ");
    const thumb = thumbUrl(v);
    const embed = esc(ensureEmbed(v));
    const fb = isFacebookVideo(v);
    let frame;
    if (thumb) {
      frame = `<button type="button" class="video-thumb-btn" data-embed="${embed}" aria-label="Putar video">
          <img class="video-thumb" src="${esc(thumb)}" alt="" loading="lazy" decoding="async" width="480" height="270">
          <span class="video-play">▶</span>
        </button>`;
    } else if (fb || embed) {
      // Placeholder + tombol play (hindari auto-load iframe FB yang berat)
      frame = `<button type="button" class="video-thumb-btn video-thumb-ph ${fb ? "is-fb" : ""}" data-embed="${embed}" aria-label="Putar video">
          <span class="video-ph-label">${fb ? "Facebook" : "Video"}</span>
          <span class="video-play">▶</span>
        </button>`;
    } else {
      frame = `<div class="video-thumb-ph">Tidak ada embed</div>`;
    }
    return `<article class="video-card" data-video-id="${esc(v.id || "")}" data-video-url="${esc(v.url || "")}">
      <div class="video-frame" data-video-frame>${frame}</div>
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

  function bindPlay(root) {
    (root || document).querySelectorAll(".video-thumb-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        let embed = btn.getAttribute("data-embed") || "";
        const host = btn.closest("[data-video-frame]");
        if (!host || !embed) return;
        // Facebook plugin: autoplay param
        const sep = embed.indexOf("?") >= 0 ? "&" : "?";
        const src = /plugins\/video\.php/i.test(embed)
          ? embed + sep + "autoplay=1"
          : embed + sep + "autoplay=1";
        host.innerHTML = `<iframe src="${src}" title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="eager"></iframe>`;
      });
    });
  }

  async function enrichFacebookThumbs(root) {
    if (!window.GalleryDB || !GalleryDB.fetchVideoMeta) return;
    const cards = (root || document).querySelectorAll(".video-card[data-video-url]");
    for (const el of cards) {
      const url = el.getAttribute("data-video-url") || "";
      if (!/facebook\.com|fb\.watch/i.test(url)) continue;
      const img = el.querySelector(".video-thumb");
      if (img && img.getAttribute("src")) continue;
      const ph = el.querySelector(".video-thumb-ph");
      try {
        const meta = await GalleryDB.fetchVideoMeta(url);
        if (meta && meta.thumbnail) {
          const frame = el.querySelector("[data-video-frame]");
          const btn = el.querySelector(".video-thumb-btn");
          const embed = (btn && btn.getAttribute("data-embed")) || "";
          if (frame) {
            frame.innerHTML = `<button type="button" class="video-thumb-btn" data-embed="${embed.replace(/"/g, "&quot;")}" aria-label="Putar video">
              <img class="video-thumb" src="${String(meta.thumbnail).replace(/"/g, "&quot;")}" alt="" loading="lazy" decoding="async" width="480" height="270">
              <span class="video-play">▶</span>
            </button>`;
            bindPlay(frame);
          }
          if (meta.title && meta.title !== "Video Facebook") {
            const h3 = el.querySelector("h3");
            if (h3 && (/^Video/i.test(h3.textContent || "") || !h3.textContent)) h3.textContent = meta.title;
          }
        }
      } catch (e) {}
    }
  }

  function render() {
    if (!grid) return;
    const list = filtered();
    grid.innerHTML = list.map(card).join("") || "";
    bindPlay(grid);
    enrichFacebookThumbs(grid);
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
      const cats = await GalleryDB.listVideoCategories();
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
