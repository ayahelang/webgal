(() => {
  const $ = s => document.querySelector(s);
  const esc = t => String(t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  fetch("data/kisi-kisi-sts.json",{cache:"no-store"}).then(r=>r.json()).then(d=>{
    const m = d.meta;
    $("#examLinks").innerHTML = m.platforms.map(p =>
      `<a class="btn btn-primary" href="${p.url}" target="_blank" rel="noopener">${esc(p.name)} <span>↗</span></a>`
    ).join("") + `<a class="btn btn-ghost" href="skills.html">Skills Map</a>`;
    $("#metaBox").innerHTML = `<div class="summary-card">
      <div class="eyebrow">INFORMASI UJIAN</div>
      <p><b>${esc(m.subject)}</b> · Kode ${esc(m.code)} · ${esc(m.teacher)}</p>
      <p>${esc(m.school)}</p>
      <p>${esc(m.period)}</p>
      <p>Format: <b>${esc(m.format)}</b> · ${esc(m.durationHint)}</p>
      <p style="margin-top:10px;color:#8aa0ab">${esc(m.note)}</p>
    </div>`;
    $("#pgBox").innerHTML = d.pg.domains.map(dom => `
      <article class="domain-card" style="--domain:#7de3ff">
        <header class="domain-head">
          <div class="domain-code">PG</div>
          <div><h3>${esc(dom.name)}</h3><small>Nomor soal: ${esc(dom.items)}</small></div>
        </header>
        <ul style="margin:0;padding-left:18px;color:#b7cdd6;line-height:1.65;font-size:13px">
          ${dom.competencies.map(c=>`<li>${esc(c)}</li>`).join("")}
        </ul>
      </article>`).join("");
    $("#essayBox").innerHTML = `<div class="skill-table">${
      `<div class="skill-row skill-head"><span>Kode</span><span>Fokus</span><span>Indikator</span></div>` +
      d.essay.items.map(e => `<div class="skill-row">
        <span class="skill-name">${esc(e.id)}</span>
        <span>${esc(e.focus)}</span>
        <span class="skill-evidence">${esc(e.indicator)}</span>
      </div>`).join("")
    }</div>`;
    $("#tipsBox").innerHTML = `<div class="summary-card">
      <div class="eyebrow">TIPS BELAJAR</div>
      <h2>Persiapan menuju STS</h2>
      <ul>${d.studyTips.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>
    </div>`;
  });
})();
