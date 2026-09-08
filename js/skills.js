(() => {
  const $ = s => document.querySelector(s);
  async function load() {
    try {
      const res = await fetch("data/skills.json", { cache: "no-store" });
      return await res.json();
    } catch (e) {
      return null;
    }
  }
  function esc(t) {
    return String(t || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }
  function levelClass(lv) {
    if (lv === "Applied") return "lv-applied";
    if (lv === "Practiced") return "lv-practiced";
    return "lv-intro";
  }
  function render(data) {
    const m = data.meta;
    $("#skillsTitle").textContent = m.title;
    $("#skillsSubtitle").textContent = m.subtitle;
    $("#skillsMeta").innerHTML = `
      <span><b>Program</b> ${esc(m.program)}</span>
      <span><b>Pengajar</b> ${esc(m.instructor)}</span>
      <span><b>Periode</b> ${esc(m.period)}</span>
      <span><b>Untuk</b> ${esc(m.audience)}</span>`;
    $("#docsBtn").href = m.docsUrl;
    $("#docsLinkTop").href = m.docsUrl;
    $("#docsBtn").innerHTML = esc(m.docsLabel) + ' <span>↗</span>';

    $("#frameworkBox").innerHTML = `
      <div class="framework-card">
        <div class="eyebrow">FRAMEWORK</div>
        <p>${esc(m.framework)}</p>
      </div>`;

    const sum = data.summary;
    $("#summaryBox").innerHTML = `
      <div class="summary-card">
        <div class="eyebrow">EXECUTIVE SUMMARY</div>
        <h2>${esc(sum.headline)}</h2>
        <ul>${sum.points.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
      </div>`;

    $("#levelGrid").innerHTML = data.levels.map(l => `
      <div class="level-card ${levelClass(l.id)}">
        <div class="level-badge">${esc(l.id)}</div>
        <h3>${esc(l.label)}</h3>
        <p>${esc(l.desc)}</p>
      </div>`).join("");

    $("#domainList").innerHTML = data.domains.map(d => `
      <article class="domain-card" style="--domain:${d.color}">
        <header class="domain-head">
          <div class="domain-code">${esc(d.code)}</div>
          <div>
            <h3>${esc(d.name)}</h3>
            <small>${esc(d.nameEn)}</small>
          </div>
        </header>
        <p class="domain-desc">${esc(d.description)}</p>
        <div class="skill-table">
          <div class="skill-row skill-head"><span>Kompetensi</span><span>Level</span><span>Bukti pembelajaran</span></div>
          ${d.skills.map(s => `
            <div class="skill-row">
              <span class="skill-name">${esc(s.name)}</span>
              <span class="skill-level ${levelClass(s.level)}">${esc(s.level)}</span>
              <span class="skill-evidence">${esc(s.evidence)}</span>
            </div>`).join("")}
        </div>
      </article>`).join("");
  }
  load().then(d => { if (d) render(d); });
})();
