(() => {
  const $ = s => document.querySelector(s);
  const esc = t => String(t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  let data = null, filter = "all", sort = "bonus";

  function bar(n, tone) {
    const c = n >= 85 ? "#8ff5bd" : n >= 60 ? "#7de3ff" : n > 0 ? "#fde68a" : "#64748b";
    return `<div class="bonus-bar"><i style="width:${Math.min(100,n)}%;background:${c}"></i><span>${n}</span></div>`;
  }

  function render() {
    if (!data) return;
    let rows = data.students.slice();
    if (filter !== "all") rows = rows.filter(s => s.class === filter);
    if (sort === "bonus") rows.sort((a,b) => b.bonus - a.bonus || a.name.localeCompare(b.name));
    else if (sort === "works") rows.sort((a,b) => b.worksBonus - a.worksBonus || b.works - a.works || a.name.localeCompare(b.name));
    else if (sort === "name") rows.sort((a,b) => a.name.localeCompare(b.name));
    else rows.sort((a,b) => a.class.localeCompare(b.class) || b.bonus - a.bonus);

    $("#list").innerHTML = rows.map(s => `
      <div class="bonus-row bonus-row-2">
        <div class="bonus-id"><span class="badge-kelas">Kls ${esc(s.class)}</span></div>
        <div class="bonus-name">${esc(s.name)}</div>
        <div class="bonus-metric">
          <small>Refleksi</small>
          ${bar(s.bonus)}
        </div>
        <div class="bonus-metric">
          <small>Website (${s.works})</small>
          ${bar(s.worksBonus)}
        </div>
      </div>`).join("");
  }

  function downloadCSV(kelas) {
    if (!data) return;
    let rows = data.students.slice();
    if (kelas !== "all") rows = rows.filter(s => s.class === kelas);
    rows.sort((a,b) => a.name.localeCompare(b.name));
    const header = "Kelas,Nama,Nilai Refleksi,Jumlah Website,Nilai Website";
    const lines = rows.map(s => `${s.class},"${s.name}",${s.bonus},${s.works},${s.worksBonus}`);
    const csv = "\uFEFF" + header + "\n" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = kelas === "all" ? "nilai-proses-semua-kelas.csv" : `nilai-proses-kelas-${kelas}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  fetch("data/refleksi-bonus.json", { cache: "no-store" }).then(r => r.json()).then(d => {
    data = d;
    $("#lead").textContent = d.meta.subtitle;
    $("#updated").textContent = "Pembaruan data: " + d.meta.updated + (d.meta.note ? " · " + d.meta.note : "");
    const vals = d.students.map(s => s.bonus);
    const wvals = d.students.map(s => s.worksBonus);
    const avg = Math.round(vals.reduce((a,b)=>a+b,0) / vals.length);
    const filled = vals.filter(v => v > 0).length;
    $("#sumStats").innerHTML = `
      <div><strong>${d.students.length}</strong><span>Santriwati</span></div>
      <div><strong>${filled}</strong><span>Sudah berrefleksi</span></div>
      <div><strong>${avg}</strong><span>Rata-rata refleksi</span></div>
      <div><strong>${d.meta.maxWorks}</strong><span>Web terbanyak (=100%)</span></div>`;
    render();
  });

  document.querySelectorAll(".filter").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filter = btn.dataset.class;
    render();
  }));
  $("#sortSelect").addEventListener("change", e => { sort = e.target.value; render(); });
  $("#dl51").addEventListener("click", () => downloadCSV("51"));
  $("#dl52").addEventListener("click", () => downloadCSV("52"));
  $("#dlAll").addEventListener("click", () => downloadCSV("all"));
})();
