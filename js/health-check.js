/** Diagnostik koneksi & layanan — tombol status server */
(function () {
  const CHECKS = [
    { id: "config", label: "Konfigurasi aplikasi" },
    { id: "supabase_js", label: "Library Supabase JS" },
    { id: "supabase_url", label: "Endpoint database (URL)" },
    { id: "supabase_ping", label: "Koneksi ke database" },
    { id: "auth", label: "Layanan autentikasi" },
    { id: "session", label: "Sesi login pengguna" },
    { id: "t_angkatan", label: "Tabel angkatan" },
    { id: "t_alumni", label: "Tabel alumni / santriwati" },
    { id: "t_websites", label: "Tabel website karya" },
    { id: "t_videos", label: "Tabel video" },
    { id: "t_video_cat", label: "Tabel kategori video" },
    { id: "t_profiles", label: "Tabel profil pengguna" },
    { id: "t_reactions", label: "Tabel reaksi (love)" },
    { id: "t_comments", label: "Tabel komentar" },
    { id: "t_events", label: "Tabel statistik kunjungan" },
    { id: "t_chat", label: "Tabel chat" },
    { id: "t_settings", label: "Tabel pengaturan" },
    { id: "gallery_load", label: "Muat data gallery" },
    { id: "thumb", label: "Layanan thumbnail (pratinjau)" },
    { id: "pages_origin", label: "Origin situs (domain)" },
  ];

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function injectUI() {
    if (document.getElementById("shHealthBtn")) return;
    const btn = el("button", "sh-health-btn", "Status server");
    btn.id = "shHealthBtn";
    btn.type = "button";
    btn.title = "Cek koneksi database & layanan";
    btn.addEventListener("click", openModal);
    document.body.appendChild(btn);

    const modal = el("div", "sh-health-modal", "");
    modal.id = "shHealthModal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="sh-health-panel" role="dialog" aria-labelledby="shHealthTitle">
        <header>
          <h2 id="shHealthTitle">Status server & koneksi</h2>
          <button type="button" class="sh-health-close" id="shHealthClose" aria-label="Tutup">×</button>
        </header>
        <p class="sh-health-lead muted">Ringkasan untuk pengguna & laporan ke admin jika ada masalah.</p>
        <div class="sh-health-summary" id="shHealthSummary">—</div>
        <div class="sh-health-list" id="shHealthList"></div>
        <div class="sh-health-actions">
          <button type="button" class="btn btn-primary" id="shHealthRerun">Cek ulang</button>
          <button type="button" class="btn btn-ghost" id="shHealthCopy">Salin laporan</button>
        </div>
        <pre class="sh-health-log" id="shHealthLog" hidden></pre>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    document.getElementById("shHealthClose").onclick = closeModal;
    document.getElementById("shHealthRerun").onclick = runChecks;
    document.getElementById("shHealthCopy").onclick = copyReport;
  }

  function openModal() {
    const m = document.getElementById("shHealthModal");
    if (m) {
      m.hidden = false;
      runChecks();
    }
  }
  function closeModal() {
    const m = document.getElementById("shHealthModal");
    if (m) m.hidden = true;
  }

  let lastReport = "";

  async function probeTable(sb, table) {
    const t0 = performance.now();
    const { error, count } = await sb.from(table).select("id", { count: "exact", head: true });
    const ms = Math.round(performance.now() - t0);
    if (error) return { ok: false, detail: error.message || String(error), ms };
    return { ok: true, detail: "OK · ~" + (count != null ? count + " baris" : "terhubung") + " · " + ms + " ms", ms };
  }

  async function runChecks() {
    const list = document.getElementById("shHealthList");
    const summary = document.getElementById("shHealthSummary");
    if (!list) return;
    list.innerHTML = CHECKS.map((c) => rowHtml(c.id, c.label, "…", "pending")).join("");
    summary.textContent = "Memeriksa…";
    summary.className = "sh-health-summary";

    const results = [];
    const set = (id, ok, detail) => {
      results.push({ id, ok, detail });
      const row = list.querySelector('[data-id="' + id + '"]');
      if (row) {
        row.className = "sh-health-row " + (ok ? "ok" : "fail");
        row.querySelector(".sh-health-st").textContent = ok ? "OK" : "GAGAL";
        row.querySelector(".sh-health-dt").textContent = detail;
      }
    };

    // config
    const cfg = (window.SUPABASE_CONFIG || window.GalleryConfig || {});
    const url = (cfg.url || cfg.supabaseUrl || "").trim();
    const key = (cfg.anonKey || cfg.supabaseAnonKey || cfg.key || "").trim();
    set("config", !!(url && key), url ? "URL & anon key terisi" : "supabase-config.js belum lengkap");

    set("supabase_js", !!(window.supabase && window.supabase.createClient), window.supabase ? "createClient tersedia" : "Script Supabase belum termuat");

    let host = "";
    try {
      host = url ? new URL(url).host : "";
    } catch (e) {
      host = "";
    }
    set("supabase_url", !!host, host || "URL tidak valid");

    let sb = null;
    try {
      if (window.GalleryDB && GalleryDB.client) sb = GalleryDB.client();
      else if (window.supabase && url && key) sb = window.supabase.createClient(url, key);
    } catch (e) {
      sb = null;
    }

    if (!sb) {
      set("supabase_ping", false, "Client database tidak bisa dibuat");
      ["auth", "session", "t_angkatan", "t_alumni", "t_websites", "t_videos", "t_video_cat", "t_profiles", "t_reactions", "t_comments", "t_events", "t_chat", "t_settings", "gallery_load"].forEach((id) =>
        set(id, false, "Dilewati (database offline)")
      );
    } else {
      try {
        const t0 = performance.now();
        const { error } = await sb.from("gallery_angkatan").select("id", { head: true, count: "exact" });
        const ms = Math.round(performance.now() - t0);
        set("supabase_ping", !error, error ? error.message : "Respons " + ms + " ms");
      } catch (e) {
        set("supabase_ping", false, e.message || String(e));
      }

      try {
        const { data, error } = await sb.auth.getSession();
        set("auth", !error, error ? error.message : "Auth API merespons");
        const sess = data && data.session;
        set(
          "session",
          true,
          sess && sess.user
            ? "Login: " + (sess.user.email || sess.user.id)
            : "Pengunjung (belum login) — normal"
        );
      } catch (e) {
        set("auth", false, e.message || String(e));
        set("session", false, e.message || String(e));
      }

      const tables = [
        ["t_angkatan", "gallery_angkatan"],
        ["t_alumni", "gallery_alumni"],
        ["t_websites", "gallery_websites"],
        ["t_videos", "gallery_videos"],
        ["t_video_cat", "gallery_video_categories"],
        ["t_profiles", "gallery_profiles"],
        ["t_reactions", "gallery_reactions"],
        ["t_comments", "gallery_comments"],
        ["t_events", "gallery_events"],
        ["t_chat", "gallery_chat"],
        ["t_settings", "gallery_settings"],
      ];
      for (const [id, table] of tables) {
        try {
          const r = await probeTable(sb, table);
          set(id, r.ok, r.detail);
        } catch (e) {
          set(id, false, e.message || String(e));
        }
      }

      try {
        if (window.GalleryDB && GalleryDB.fetchGalleryFromDb) {
          const t0 = performance.now();
          const data = await GalleryDB.fetchGalleryFromDb();
          const n = (data && data.students && data.students.length) || 0;
          const ms = Math.round(performance.now() - t0);
          set("gallery_load", n > 0, n + " santriwati termuat · " + ms + " ms");
        } else {
          set("gallery_load", false, "GalleryDB.fetchGalleryFromDb tidak ada");
        }
      } catch (e) {
        set("gallery_load", false, e.message || String(e));
      }
    }

    // thumbnail service (HEAD/GET small)
    try {
      const t0 = performance.now();
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch("https://image.thum.io/get/width/100/https://example.com", {
        signal: ctrl.signal,
        mode: "cors",
      }).catch(() => null);
      clearTimeout(to);
      const ms = Math.round(performance.now() - t0);
      // opaque/cors may fail but network reached
      set(
        "thumb",
        true,
        res
          ? "thum.io merespons · " + ms + " ms"
          : "Tidak bisa diverifikasi dari browser (CORS) · layanan opsional"
      );
    } catch (e) {
      set("thumb", true, "Opsional · " + (e.message || "tidak diuji"));
    }

    set("pages_origin", true, location.origin + " · " + location.pathname);

    const failed = results.filter((r) => r.ok === false);
    const ok = results.filter((r) => r.ok === true).length;
    if (failed.length === 0) {
      summary.textContent = "Semua pengecekan inti tampak sehat (" + ok + " OK).";
      summary.className = "sh-health-summary all-ok";
    } else {
      summary.textContent =
        failed.length +
        " masalah terdeteksi. Silakan salin laporan dan kirim ke admin.";
      summary.className = "sh-health-summary has-fail";
    }

    lastReport = [
      "Silverhawk Gallery — laporan status " + new Date().toISOString(),
      "URL: " + location.href,
      "UserAgent: " + navigator.userAgent,
      "",
      ...results.map((r) => (r.ok ? "[OK] " : "[GAGAL] ") + r.id + " — " + r.detail),
      "",
      "Gagal: " + (failed.map((f) => f.id).join(", ") || "(tidak ada)"),
    ].join("\n");
  }

  function rowHtml(id, label, detail, st) {
    return `<div class="sh-health-row ${st}" data-id="${id}">
      <span class="sh-health-st">${st === "pending" ? "…" : st}</span>
      <span class="sh-health-lb">${label}</span>
      <span class="sh-health-dt">${detail}</span>
    </div>`;
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(lastReport || "(belum ada laporan)");
      const s = document.getElementById("shHealthSummary");
      if (s) s.textContent = (s.textContent || "") + " · Laporan disalin.";
    } catch (e) {
      const log = document.getElementById("shHealthLog");
      if (log) {
        log.hidden = false;
        log.textContent = lastReport;
      }
      alert("Salin manual dari kotak teks di bawah.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectUI);
  } else {
    injectUI();
  }
})();
