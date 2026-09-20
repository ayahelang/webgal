(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let data = null,
    filter = "all",
    sort = "bonus";

  function bar(n) {
    const v = Number(n) || 0;
    const c = v >= 85 ? "#8ff5bd" : v >= 60 ? "#7de3ff" : v > 0 ? "#fde68a" : "#64748b";
    return `<div class="bonus-bar"><i style="width:${Math.min(100, v)}%;background:${c}"></i><span>${v}</span></div>`;
  }

  function norm(n) {
    return String(n || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function render() {
    const list = $("#list");
    if (!list || !data) return;
    let rows = data.students.slice();
    if (filter !== "all") rows = rows.filter((s) => String(s.class) === String(filter));
    if (sort === "bonus") rows.sort((a, b) => b.bonus - a.bonus || a.name.localeCompare(b.name));
    else if (sort === "works") rows.sort((a, b) => (b.worksBonus || 0) - (a.worksBonus || 0) || a.name.localeCompare(b.name));
    else if (sort === "engage") rows.sort((a, b) => (b.engageBonus || 0) - (a.engageBonus || 0) || a.name.localeCompare(b.name));
    else if (sort === "name") rows.sort((a, b) => a.name.localeCompare(b.name));
    else rows.sort((a, b) => String(a.class).localeCompare(String(b.class)) || b.bonus - a.bonus);

    list.innerHTML = rows
      .map(
        (s) => `<div class="bonus-row bonus-row-3">
        <div class="bonus-id"><span class="badge-kelas">Kls ${esc(s.class)}</span></div>
        <div class="bonus-name">${esc(s.name)}
          <small class="muted" style="display:block;font-size:11px">♥R ${s.loveRed || 0} · ♥B ${s.loveBlue || 0} · 💬R ${s.commentRed || 0} · 💬B ${s.commentBlue || 0}</small>
        </div>
        <div class="bonus-metric"><small>Refleksi</small>${bar(s.bonus)}</div>
        <div class="bonus-metric"><small>Website (${s.works || 0})</small>${bar(s.worksBonus)}</div>
        <div class="bonus-metric"><small>Interaksi</small>${bar(s.engageBonus || 0)}</div>
      </div>`
      )
      .join("");
  }

  function downloadCSV(kelas) {
    if (!data) return;
    let rows = data.students.slice();
    if (kelas !== "all") rows = rows.filter((s) => String(s.class) === String(kelas));
    rows.sort((a, b) => a.name.localeCompare(b.name));
    const header =
      "Kelas,Nama,Nilai Refleksi,Jumlah Website,Nilai Website,Love Merah,Love Biru,Komentar Merah,Komentar Biru,Nilai Interaksi";
    const lines = rows.map(
      (s) =>
        `${s.class},"${s.name}",${s.bonus},${s.works || 0},${s.worksBonus || 0},${s.loveRed || 0},${s.loveBlue || 0},${s.commentRed || 0},${s.commentBlue || 0},${s.engageBonus || 0}`
    );
    const csv = "\uFEFF" + header + "\n" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = kelas === "all" ? "nilai-proses-semua-kelas.csv" : `nilai-proses-kelas-${kelas}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function enrichEngagement() {
    if (!data) return;
    if (!window.GalleryDB || !GalleryDB.enabled()) {
      data.students.forEach((s) => {
        s.loveRed = s.loveRed || 0;
        s.loveBlue = s.loveBlue || 0;
        s.commentRed = s.commentRed || 0;
        s.commentBlue = s.commentBlue || 0;
        s.engageBonus = s.engageBonus || 0;
      });
      return;
    }
    let students = [];
    try {
      const res = await fetch("data/websites.json", { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        students = j.students || [];
      }
    } catch (e) {}
    try {
      const db = await GalleryDB.fetchGalleryFromDb();
      if (db && db.students && db.students.length) {
        const map = {};
        students.forEach((s) => {
          map[norm(s.name)] = s;
        });
        db.students.forEach((s) => {
          const k = norm(s.name);
          if (!map[k]) map[k] = { name: s.name, works: s.works || [] };
          else {
            const urls = new Set((map[k].works || []).map((w) => w.url));
            (s.works || []).forEach((w) => {
              if (w.url && !urls.has(w.url)) (map[k].works = map[k].works || []).push(w);
            });
          }
        });
        students = Object.values(map);
      }
    } catch (e) {}

    const byName = {};
    students.forEach((s) => {
      byName[norm(s.name)] = (s.works || []).map((w) => w.url).filter(Boolean);
    });

    let maxScore = 1;
    for (const s of data.students) {
      const urls = byName[norm(s.name)] || [];
      try {
        if (urls.length && GalleryDB.sumReactionsForUrls) {
          const eng = await GalleryDB.sumReactionsForUrls(urls);
          s.loveRed = eng.loveRed;
          s.loveBlue = eng.loveBlue;
          s.commentRed = eng.commentRed;
          s.commentBlue = eng.commentBlue;
          s._engScore = eng.score;
          if (eng.score > maxScore) maxScore = eng.score;
        } else {
          s.loveRed = s.loveBlue = s.commentRed = s.commentBlue = 0;
          s._engScore = 0;
        }
      } catch (e) {
        s.loveRed = s.loveBlue = s.commentRed = s.commentBlue = 0;
        s._engScore = 0;
      }
    }
    data.students.forEach((s) => {
      s.engageBonus = Math.round(((s._engScore || 0) / maxScore) * 100);
    });
  }

  function paintMeta() {
    if (!data) return;
    const lead = $("#lead");
    const updated = $("#updated");
    const sum = $("#sumStats");
    if (lead) {
      lead.textContent =
        (data.meta && data.meta.subtitle) ||
        "Nilai tambahan dari refleksi, jumlah website, dan interaksi (love & komentar).";
    }
    if (updated) {
      updated.textContent =
        "Pembaruan data: " +
        ((data.meta && data.meta.updated) || "-") +
        (data.meta && data.meta.note ? " · " + data.meta.note : "");
    }
    if (sum) {
      const vals = data.students.map((s) => s.bonus || 0);
      const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      const filled = vals.filter((v) => v > 0).length;
      sum.innerHTML = `
      <div><strong>${data.students.length}</strong><span>Santriwati</span></div>
      <div><strong>${filled}</strong><span>Sudah berrefleksi</span></div>
      <div><strong>${avg}</strong><span>Rata-rata refleksi</span></div>
      <div><strong>${(data.meta && data.meta.maxWorks) || "-"}</strong><span>Web terbanyak (=100%)</span></div>`;
    }
  }

  fetch("data/refleksi-bonus.json", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error("Gagal memuat refleksi-bonus.json (" + r.status + ")");
      return r.json();
    })
    .then(async (d) => {
      data = d;
      if (!Array.isArray(data.students)) data.students = [];
      data.students.forEach((s) => {
        s.engageBonus = s.engageBonus || 0;
        s.loveRed = s.loveRed || 0;
        s.loveBlue = s.loveBlue || 0;
        s.commentRed = s.commentRed || 0;
        s.commentBlue = s.commentBlue || 0;
      });
      paintMeta();
      render(); // tampil dulu agar tidak blank
      try {
        await enrichEngagement();
        paintMeta();
        render();
      } catch (e) {
        console.warn("enrich engagement", e);
      }
    })
    .catch((e) => {
      const list = $("#list");
      if (list) list.innerHTML = `<p class="muted">Gagal memuat data: ${esc(e.message || e)}</p>`;
    });

  document.querySelectorAll(".filter[data-class]").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter[data-class]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filter = btn.dataset.class;
      render();
    })
  );
  const sortEl = $("#sortSelect");
  if (sortEl) {
    if (![...sortEl.options].some((o) => o.value === "engage")) {
      const opt = document.createElement("option");
      opt.value = "engage";
      opt.textContent = "Interaksi tertinggi";
      sortEl.appendChild(opt);
    }
    sortEl.addEventListener("change", (e) => {
      sort = e.target.value;
      render();
    });
  }
  const dl51 = $("#dl51");
  const dl52 = $("#dl52");
  const dlAll = $("#dlAll");
  if (dl51) dl51.addEventListener("click", () => downloadCSV("51"));
  if (dl52) dl52.addEventListener("click", () => downloadCSV("52"));
  if (dlAll) dlAll.addEventListener("click", () => downloadCSV("all"));
})();
