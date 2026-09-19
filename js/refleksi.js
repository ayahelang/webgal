(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let data = null,
    filter = "all",
    sort = "bonus",
    galleryByName = {};

  function bar(n) {
    const c = n >= 85 ? "#8ff5bd" : n >= 60 ? "#7de3ff" : n > 0 ? "#fde68a" : "#64748b";
    return `<div class="bonus-bar"><i style="width:${Math.min(100, n)}%;background:${c}"></i><span>${n}</span></div>`;
  }

  function norm(n) {
    return String(n || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function render() {
    if (!data) return;
    let rows = data.students.slice();
    if (filter !== "all") rows = rows.filter((s) => s.class === filter);
    if (sort === "bonus") rows.sort((a, b) => b.bonus - a.bonus || a.name.localeCompare(b.name));
    else if (sort === "works") rows.sort((a, b) => b.worksBonus - a.worksBonus || a.name.localeCompare(b.name));
    else if (sort === "engage") rows.sort((a, b) => (b.engageBonus || 0) - (a.engageBonus || 0) || a.name.localeCompare(b.name));
    else rows.sort((a, b) => a.class.localeCompare(b.class) || b.bonus - a.bonus);

    $("#list").innerHTML = rows
      .map(
        (s) => `<div class="bonus-row bonus-row-3">
        <div class="bonus-id"><span class="badge-kelas">Kls ${esc(s.class)}</span></div>
        <div class="bonus-name">${esc(s.name)}
          <small class="muted" style="display:block;font-size:11px">♥R${s.loveRed || 0} ♥B${s.loveBlue || 0} · 💬R${s.commentRed || 0} 💬B${s.commentBlue || 0}</small>
        </div>
        <div class="bonus-metric"><small>Refleksi</small>${bar(s.bonus)}</div>
        <div class="bonus-metric"><small>Website (${s.works})</small>${bar(s.worksBonus)}</div>
        <div class="bonus-metric"><small>Interaksi</small>${bar(s.engageBonus || 0)}</div>
      </div>`
      )
      .join("");
  }

  function downloadCSV(kelas) {
    if (!data) return;
    let rows = data.students.slice();
    if (kelas !== "all") rows = rows.filter((s) => s.class === kelas);
    rows.sort((a, b) => a.name.localeCompare(b.name));
    const header =
      "Kelas,Nama,Nilai Refleksi,Jumlah Website,Nilai Website,Love Merah,Love Biru,Komentar Merah,Komentar Biru,Nilai Interaksi";
    const lines = rows.map(
      (s) =>
        `${s.class},"${s.name}",${s.bonus},${s.works},${s.worksBonus},${s.loveRed || 0},${s.loveBlue || 0},${s.commentRed || 0},${s.commentBlue || 0},${s.engageBonus || 0}`
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
    if (!window.GalleryDB || !GalleryDB.enabled() || !data) return;
    // load gallery urls per student name
    let students = [];
    try {
      const res = await fetch("data/websites.json", { cache: "no-store" });
      const j = await res.json();
      students = j.students || [];
    } catch (e) {}
    try {
      const db = await GalleryDB.fetchGalleryFromDb();
      if (db && db.students) {
        // merge by name
        const map = {};
        students.forEach((s) => {
          map[norm(s.name)] = s;
        });
        db.students.forEach((s) => {
          const k = norm(s.name);
          if (!map[k]) map[k] = s;
          else {
            const urls = new Set((map[k].works || []).map((w) => w.url));
            (s.works || []).forEach((w) => {
              if (!urls.has(w.url)) (map[k].works = map[k].works || []).push(w);
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
        const eng = await GalleryDB.sumReactionsForUrls(urls);
        s.loveRed = eng.loveRed;
        s.loveBlue = eng.loveBlue;
        s.commentRed = eng.commentRed;
        s.commentBlue = eng.commentBlue;
        s._engScore = eng.score;
        if (eng.score > maxScore) maxScore = eng.score;
      } catch (e) {
        s.loveRed = s.loveBlue = s.commentRed = s.commentBlue = 0;
        s._engScore = 0;
      }
    }
    data.students.forEach((s) => {
      s.engageBonus = Math.round(((s._engScore || 0) / maxScore) * 100);
    });
  }

  fetch("data/refleksi-bonus.json", { cache: "no-store" })
    .then((r) => r.json())
    .then(async (d) => {
      data = d;
      d.meta.subtitle =
        (d.meta.subtitle || "") +
        " Ditambah nilai interaksi (love & komentar merah/biru) dari apresiasi pengunjung.";
      $("#lead").textContent = d.meta.subtitle;
      $("#updated").textContent = "Pembaruan data: " + d.meta.updated + (d.meta.note ? " · " + d.meta.note : "");

      await enrichEngagement();

      const vals = d.students.map((s) => s.bonus);
      const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      const filled = vals.filter((v) => v > 0).length;
      $("#sumStats").innerHTML = `
      <div><strong>${d.students.length}</strong><span>Santriwati</span></div>
      <div><strong>${filled}</strong><span>Sudah berrefleksi</span></div>
      <div><strong>${avg}</strong><span>Rata-rata refleksi</span></div>
      <div><strong>${d.meta.maxWorks}</strong><span>Web terbanyak (=100%)</span></div>`;
      render();
    });

  document.querySelectorAll(".filter").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filter = btn.dataset.class;
      render();
    })
  );
  const sortEl = $("#sortSelect");
  if (sortEl) {
    // ensure engage option
    if (![...sortEl.options].some((o) => o.value === "engage")) {
      const opt = document.createElement("option");
      opt.value = "engage";
      opt.textContent = "Nilai interaksi";
      sortEl.appendChild(opt);
    }
    sortEl.addEventListener("change", (e) => {
      sort = e.target.value;
      render();
    });
  }
  $("#dl51") && $("#dl51").addEventListener("click", () => downloadCSV("51"));
  $("#dl52") && $("#dl52").addEventListener("click", () => downloadCSV("52"));
  $("#dlAll") && $("#dlAll").addEventListener("click", () => downloadCSV("all"));
})();
