(() => {
  const $ = (s) => document.querySelector(s);
  async function load() {
    try {
      const res = await fetch("data/skills.json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (e) {
      console.error("skills.json gagal dimuat", e);
      return null;
    }
  }
  function esc(t) {
    return String(t || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function levelClass(lv) {
    if (lv === "Applied") return "lv-applied";
    if (lv === "Practiced") return "lv-practiced";
    return "lv-intro";
  }
  function setText(sel, text) {
    const el = $(sel);
    if (el) el.textContent = text;
  }
  function setHtml(sel, html) {
    const el = $(sel);
    if (el) el.innerHTML = html;
  }
  function setHref(sel, href) {
    const el = $(sel);
    if (el) el.href = href;
  }
  function render(data) {
    if (!data || !data.meta) {
      setHtml("#levelGrid", '<p class="muted">Data skills belum tersedia. Pastikan file data/skills.json ter-deploy.</p>');
      return;
    }
    const m = data.meta;
    setText("#skillsTitle", m.title);
    setText("#skillsSubtitle", m.subtitle);
    setHtml("#skillsMeta", `
      <span><b>Program</b> ${esc(m.program)}</span>
      <span><b>Pengajar</b> ${esc(m.instructor)}</span>
      <span><b>Periode</b> ${esc(m.period)}</span>
      <span><b>Untuk</b> ${esc(m.audience)}</span>`);
    setHref("#docsBtn", m.docsUrl || "#");
    setHref("#docsLinkTop", m.docsUrl || "#");
    const docsBtn = $("#docsBtn");
    if (docsBtn) docsBtn.innerHTML = esc(m.docsLabel || "Dokumen") + " <span>↗</span>";

    setHtml("#frameworkBox", `
      <div class="framework-card">
        <div class="eyebrow">FRAMEWORK</div>
        <p>${esc(m.framework)}</p>
      </div>`);

    const sum = data.summary || { headline: "", points: [] };
    setHtml("#summaryBox", `
      <div class="summary-card">
        <div class="eyebrow">EXECUTIVE SUMMARY</div>
        <h2>${esc(sum.headline)}</h2>
        <ul>${(sum.points || []).map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
      </div>`);

    const levels = data.levels || [];
    setHtml("#levelGrid", levels.map((l) => `
      <div class="level-card ${levelClass(l.id)}">
        <div class="level-badge">${esc(l.id)}</div>
        <h3>${esc(l.label)}</h3>
        <p>${esc(l.desc)}</p>
      </div>`).join("") || '<p class="muted">Belum ada data tingkat penguasaan.</p>');

    const domains = data.domains || [];
    setHtml("#domainList", domains.map((d) => `
      <article class="domain-card" style="--domain:${esc(d.color || "#7de3ff")}">
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
          ${(d.skills || []).map((s) => `
            <div class="skill-row">
              <span class="skill-name">${esc(s.name)}</span>
              <span class="skill-level ${levelClass(s.level)}">${esc(s.level)}</span>
              <span class="skill-evidence">${esc(s.evidence)}</span>
            </div>`).join("")}
        </div>
      </article>`).join("") || '<p class="muted">Belum ada data domain keterampilan.</p>');
  }
  load().then((d) => render(d));
})();
