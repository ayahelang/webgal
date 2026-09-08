(() => {
  const $ = s => document.querySelector(s);
  const esc = t => String(t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  let data = null, filter = "all", sort = "bonus";
  function bar(n) {
    const c = n >= 85 ? "#8ff5bd" : n >= 60 ? "#7de3ff" : n > 0 ? "#fde68a" : "#64748b";
    return `<div class="bonus-bar"><i style="width:${n}%;background:${c}"></i><span>${n}</span></div>`;
  }
  function render() {
    if (!data) return;
    let rows = data.students.slice();
    if (filter !== "all") rows = rows.filter(s => s.class === filter);
    if (sort === "bonus") rows.sort((a,b) => b.bonus - a.bonus || a.name.localeCompare(b.name));
    else if (sort === "name") rows.sort((a,b) => a.name.localeCompare(b.name));
    else rows.sort((a,b) => a.class.localeCompare(b.class) || b.bonus - a.bonus);
    $("#list").innerHTML = rows.map(s => `
      <div class="bonus-row">
        <div class="bonus-id"><span class="badge-kelas">Kls ${esc(s.class)}</span></div>
        <div class="bonus-name">${esc(s.name)}</div>
        ${bar(s.bonus)}
      </div>`).join("");
  }
  fetch("data/refleksi-bonus.json",{cache:"no-store"}).then(r=>r.json()).then(d => {
    data = d;
    $("#lead").textContent = d.meta.subtitle;
    $("#updated").textContent = "Pembaruan data: " + d.meta.updated + " · " + d.meta.note;
    const vals = d.students.map(s => s.bonus);
    const avg = Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
    const filled = vals.filter(v => v > 0).length;
    $("#sumStats").innerHTML = `
      <div><strong>${d.students.length}</strong><span>Santriwati</span></div>
      <div><strong>${filled}</strong><span>Sudah berrefleksi</span></div>
      <div><strong>${avg}</strong><span>Rata-rata nilai</span></div>
      <div><strong>${Math.max(...vals)}</strong><span>Nilai tertinggi</span></div>`;
    render();
  });
  document.querySelectorAll(".filter").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filter = btn.dataset.class;
    render();
  }));
  $("#sortSelect").addEventListener("change", e => { sort = e.target.value; render(); });
})();
