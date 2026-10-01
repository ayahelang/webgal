(() => {
  const ACTIVE_YEAR = String(new Date().getFullYear() - 1); // 2026 → 2025 masih belajar
  const state = { data:null, query:"", classFilter:"y:"+ACTIVE_YEAR, sort:"name" };
  let viewerCtx = { loggedIn: false, name: "", year: "", classCode: "" };
  const $ = (s) => document.querySelector(s);
  let tipEl = null;
  const metaCache = new Map();

  async function resolveViewer() {
    try {
      if (!window.GalleryDB || !GalleryDB.enabled()) return;
      const sess = await GalleryDB.getSession();
      if (!sess || !sess.user) return;
      viewerCtx.loggedIn = true;
      const meta = sess.user.user_metadata || {};
      viewerCtx.name = meta.full_name || meta.name || "";
      try {
        const prof = await GalleryDB.getMyProfile();
        if (prof) {
          if (prof.linked_student_name) viewerCtx.name = prof.linked_student_name;
          viewerCtx.year = String(prof.linked_angkatan_year || "");
          viewerCtx.classCode = String(prof.linked_class_code || "");
        }
      } catch (e) {}
    } catch (e) {}
  }

  function contactBarHtml(s) {
    const c = s.contact || {};
    if (!window.GalleryDB || typeof GalleryDB.canViewContact !== "function") return "";
    const chips = [];
    const esc = (x) => String(x || "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
    const ic = {
      wa: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M17.47 14.38c-.28-.14-1.64-.81-1.9-.9-.25-.1-.44-.14-.62.14-.18.28-.71.9-.87 1.08-.16.18-.32.2-.6.07-.28-.14-1.17-.43-2.23-1.37-.82-.73-1.38-1.64-1.54-1.92-.16-.28-.02-.43.12-.57.13-.13.28-.32.42-.48.14-.16.18-.28.28-.46.1-.18.05-.34-.02-.48-.07-.14-.62-1.49-.85-2.04-.22-.53-.45-.46-.62-.47h-.53c-.18 0-.48.07-.73.34-.25.28-.96.94-.96 2.3 0 1.36.98 2.67 1.12 2.85.14.18 1.93 2.95 4.68 4.13.65.28 1.16.45 1.56.58.66.21 1.26.18 1.73.11.53-.08 1.64-.67 1.87-1.32.23-.65.23-1.2.16-1.32-.07-.11-.25-.18-.53-.32z"/><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12c0 1.77.46 3.43 1.27 4.87L2.05 22l5.27-1.38A9.96 9.96 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.6 0-3.09-.47-4.34-1.28l-.31-.18-3.13.82.84-3.05-.2-.33A7.96 7.96 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/></svg>',
      ig: '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zm5.25-3.75a1 1 0 1 1-1 1 1 1 0 0 1 1-1z"/></svg>',
      fb: '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M14 8.5h2.5V6H14a3.5 3.5 0 0 0-3.5 3.5V12H8v2.5h2.5V20H14v-5.5h2.3l.45-2.5H14V9.5a1 1 0 0 1 1-1z"/></svg>',
      x: '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M4 4h4.1l3.4 4.8L15.8 4H20l-5.6 6.6L20 20h-4.1l-3.7-5.2L8.2 20H4l5.9-6.9L4 4z"/></svg>',
      tt: '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M14 3h2.1a5.2 5.2 0 0 0 4 3.1V10a7.2 7.2 0 0 1-4-.1v5.3A5.2 5.2 0 1 1 10.8 10v2.2a3 3 0 1 0 2.1 2.9V3z"/></svg>',
    };
    if (c.wa && GalleryDB.canViewContact("wa", c, s, viewerCtx)) {
      const num = String(c.wa).replace(/\D/g, "");
      if (num) chips.push(`<a class="contact-chip wa" href="https://wa.me/${esc(num)}" target="_blank" rel="noopener" title="WhatsApp">${ic.wa}<span>WA</span></a>`);
    }
    const social = (key, label, svg, build) => {
      if (!c[key] || !GalleryDB.canViewContact("social", c, s, viewerCtx)) return;
      const href = build(String(c[key]).trim());
      if (href) chips.push(`<a class="contact-chip" href="${esc(href)}" target="_blank" rel="noopener" title="${label}">${svg}<span>${label}</span></a>`);
    };
    social("ig", "IG", ic.ig, (v) => (v.startsWith("http") ? v : "https://instagram.com/" + v.replace(/^@/, "")));
    social("fb", "FB", ic.fb, (v) => (v.startsWith("http") ? v : "https://facebook.com/" + v.replace(/^@/, "")));
    social("twitter", "X", ic.x, (v) => (v.startsWith("http") ? v : "https://x.com/" + v.replace(/^@/, "")));
    social("tiktok", "TikTok", ic.tt, (v) => (v.startsWith("http") ? v : "https://tiktok.com/@" + v.replace(/^@/, "")));
    if (!chips.length) return "";
    return `<div class="contact-bar">${chips.join("")}</div>`;
  }
  function ensureTooltip(){
    if(tipEl) return tipEl;
    tipEl = document.createElement("div");
    tipEl.className = "sh-tooltip";
    tipEl.setAttribute("role","tooltip");
    document.body.appendChild(tipEl);
    return tipEl;
  }

  function placeTip(target){
    const el = ensureTooltip();
    const r = target.getBoundingClientRect();
    const tw = el.offsetWidth || 220;
    const th = el.offsetHeight || 60;
    let left = r.left + r.width/2 - tw/2;
    let top  = r.top - th - 12;
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    if(top < 8){
      top = r.bottom + 12;
      el.classList.add("below");
    } else {
      el.classList.remove("below");
    }
    el.style.left = left + "px";
    el.style.top  = top + "px";
  }

  function renderTipContent(html){
    const el = ensureTooltip();
    el.innerHTML = html;
  }

  function showTip(target, fallbackTitle, fallbackDesc, siteUrl){
    const el = ensureTooltip();
    el.classList.add("visible");

    // immediate fallback content
    const safeTitle = fallbackTitle || "Website";
    const safeDesc  = fallbackDesc || "Karya website siswa dari galeri Silverhawk.";
    renderTipContent(`
      <div class="tip-title">${escapeHtml(safeTitle)}</div>
      ${safeDesc ? `<div class="tip-desc">${escapeHtml(safeDesc)}</div>` : ""}
      <div class="tip-loading">Memuat info website…</div>
    `);
    placeTip(target);

    if(!siteUrl) return;

    // already cached?
    if(metaCache.has(siteUrl)){
      const m = metaCache.get(siteUrl);
      if(m.status === "ok"){
        renderTipContent(`
          <div class="tip-title">${escapeHtml(m.title || safeTitle)}</div>
          <div class="tip-desc">${escapeHtml(m.description || safeDesc || "Tidak ada deskripsi")}</div>
          <div class="tip-source">INFO WEBSITE • HOVER / FOCUS</div>
        `);
        placeTip(target);
      } else if(m.status === "fail"){
        // keep fallback, remove loading
        renderTipContent(`
          <div class="tip-title">${escapeHtml(safeTitle)}</div>
          ${safeDesc ? `<div class="tip-desc">${escapeHtml(safeDesc)}</div>` : ""}
        `);
        placeTip(target);
      }
      return;
    }

    // fetch live meta via microlink (public)
    metaCache.set(siteUrl, {status:"loading"});
    const api = "https://api.microlink.io/?url=" + encodeURIComponent(siteUrl) + "&palette=false&audio=false&video=false&iframe=false";

    fetch(api, {signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined})
      .then(r => r.json())
      .then(json => {
        if(!json || json.status !== "success" || !json.data){
          throw new Error("no data");
        }
        const d = json.data;
        const title = (d.title || "").trim() || safeTitle;
        const description = (d.description || "").trim() || safeDesc || "";
        metaCache.set(siteUrl, {status:"ok", title, description});

        // only update if tooltip still visible and still for roughly same context
        if(tipEl && tipEl.classList.contains("visible")){
          renderTipContent(`
            <div class="tip-title">${escapeHtml(title)}</div>
            <div class="tip-desc">${escapeHtml(description || "Tidak ada deskripsi")}</div>
            <div class="tip-source">INFO WEBSITE • HOVER / FOCUS</div>
          `);
          placeTip(target);
        }
      })
      .catch(() => {
        metaCache.set(siteUrl, {status:"fail"});
        if(tipEl && tipEl.classList.contains("visible")){
          renderTipContent(`
            <div class="tip-title">${escapeHtml(safeTitle)}</div>
            ${safeDesc ? `<div class="tip-desc">${escapeHtml(safeDesc)}</div>` : ""}
          `);
          placeTip(target);
        }
      });
  }

  function hideTip(){
    if(tipEl) tipEl.classList.remove("visible");
  }

  function escapeHtml(str){
    return String(str||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  async function loadData(){
    // Sumber utama: Supabase saja (hindari dobel dengan JSON)
    try {
      if (window.GalleryDB && GalleryDB.enabled()) {
        const dbData = await GalleryDB.fetchGalleryFromDb();
        if (dbData && Array.isArray(dbData.students) && dbData.students.length) {
          return dbData;
        }
      }
    } catch (e) {
      console.warn("Supabase gallery load failed", e);
    }
    // Cadangan darurat saja jika DB kosong / gagal
    try {
      if (window.GALLERY_DATA) return window.GALLERY_DATA;
      return await (await fetch("data/websites.json", { cache: "no-store" })).json();
    } catch (e) {
      console.warn("JSON fallback failed", e);
      return { meta: {}, students: [] };
    }
  }
  const allWorks=()=>state.data.students.flatMap(s=>s.works.map(w=>({...w,student:s})));
  function studentYear(s){
    return String(s.angkatan || s.year || "2025");
  }
  function cohortKey(s){
    return studentYear(s) + "-" + String(s.class || "");
  }
  function updateStats(){
    const ss=state.data.students, ww=allWorks();
    $("#studentCount").textContent=ss.length;
    $("#workCount").textContent=ww.length;
    const ac = document.getElementById("angkatanCount");
    if (ac) ac.textContent = new Set(ss.map(studentYear)).size;
    $("#classCount").textContent=new Set(ss.map(cohortKey)).size;
    $("#categoryCount").textContent=new Set(ww.map(w=>w.category)).size;
  }
  function matches(s){
    const f = state.classFilter;
    const y = studentYear(s);
    const c = String(s.class || "");
    if(f === "all"){
      /* semua angkatan */
    } else if(f.startsWith("y:")){
      if(y !== f.slice(2)) return false;
    } else if(f.startsWith("c:")){
      // c:2025-51
      if(cohortKey(s) !== f.slice(2)) return false;
    } else {
      // legacy data-class=51
      if(c !== f) return false;
    }
    const q=state.query.trim().toLowerCase(); if(!q)return true;
    const hay=[s.name,s.class,y,s.angkatanLabel||"",s.aiTool||"",...s.works.flatMap(w=>[w.title,w.category,w.description,w.url,(w.tags||[]).join(" ")])].join(" ").toLowerCase();
    return hay.includes(q);
  }
  function buildFilters(){
    const host = document.getElementById("classFilters");
    if(!host || !state.data) return;
    const years = [...new Set(state.data.students.map(studentYear))].sort().reverse();
    const cohorts = [...new Set(state.data.students.map(cohortKey))].sort();
    let html = `<button type="button" class="filter" data-filter="all">Semua</button>`;
    // default group: angkatan aktif
    html += `<button type="button" class="filter" data-filter="y:${ACTIVE_YEAR}">Angkatan ${ACTIVE_YEAR}</button>`;
    cohorts.forEach(ck => {
      const [yy, cc] = ck.split("-");
      const label = `${cc} · ${yy}`;
      html += `<button type="button" class="filter" data-filter="c:${ck}">${label}</button>`;
    });
    // other full years if not active
    years.forEach(yy => {
      if(yy === ACTIVE_YEAR) return;
      html += `<button type="button" class="filter" data-filter="y:${yy}">Angkatan ${yy}</button>`;
    });
    host.innerHTML = html;
    host.querySelectorAll(".filter").forEach(b => {
      b.classList.toggle("active", b.dataset.filter === state.classFilter);
      b.addEventListener("click", () => {
        host.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        state.classFilter = b.dataset.filter;
        render();
      });
    });
  }
  function sorted(a){
    return [...a].sort((x,y)=>state.sort==="class"?(x.class.localeCompare(y.class)||x.name.localeCompare(y.name)):
      state.sort==="works"?(y.works.length-x.works.length||x.name.localeCompare(y.name)):
      x.name.localeCompare(y.name,"id"));
  }
  function workButtons(s){
    return s.works.map((w,i)=>{
      const tid = w.url || (s.id + "-" + i);
      const react = window.SHSocial
        ? SHSocial.miniBarHtml("website", tid)
        : "";
      return `<div class="work-row" data-work-url="${escapeAttr(w.url)}">
      <a class="work-choice ${i===0?"active":""}" data-index="${i}"
         href="${w.url}" target="_blank" rel="noopener noreferrer"
         data-tip-title="${escapeAttr(w.title)}"
         data-tip-desc="${escapeAttr(w.description || w.category)}"
         data-tip-url="${escapeAttr(w.url)}">
        <span>${String(i+1).padStart(2,"0")}</span><b>${w.title}</b><small>${w.category}</small><em class="open-site" title="Buka website">↗</em>
      </a>
      ${react}
    </div>`;
    }).join("");
  }
  function escapeAttr(str){
    return String(str||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
  }

  function autoThumb(title, url){
    const t = String(title||"Web").slice(0,28);
    let host = "";
    try { host = new URL(url).hostname.replace(/^www\./,""); } catch(e){}
    let seed = 0;
    for (let i=0;i<(t+host).length;i++) seed += (t+host).charCodeAt(i);
    const hues = [200,160,280,320,30,190];
    const h = hues[seed % hues.length];
    const h2 = (h+40)%360;
    const esc = (s)=>String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">'
      + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
      + '<stop offset="0%" stop-color="hsl('+h+',55%,28%)"/>'
      + '<stop offset="100%" stop-color="hsl('+h2+',50%,16%)"/></linearGradient></defs>'
      + '<rect width="640" height="400" fill="url(#g)"/>'
      + '<circle cx="520" cy="80" r="90" fill="rgba(255,255,255,0.06)"/>'
      + '<circle cx="80" cy="340" r="120" fill="rgba(0,0,0,0.12)"/>'
      + '<text x="32" y="56" fill="rgba(255,255,255,0.45)" font-family="system-ui,sans-serif" font-size="14" font-weight="700" letter-spacing="2">SILVERHAWK</text>'
      + '<text x="32" y="200" fill="#e8f4f8" font-family="system-ui,sans-serif" font-size="28" font-weight="700">'+esc(t)+'</text>'
      + '<text x="32" y="236" fill="rgba(200,230,240,0.7)" font-family="system-ui,sans-serif" font-size="14">'+esc(host)+'</text>'
      + '</svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function card(s,index){
    const w=s.works[0], ai=s.aiTool?` • ${s.aiTool}`:"";
    const tags=[w.category,...(w.tags||[]),...(s.aiTool?["eksperimen AI"]:[])].filter(Boolean).slice(0,4);
    return `<article class="card" data-card
        data-tip-title="${escapeAttr(w.title)}"
        data-tip-desc="${escapeAttr((s.name) + (w.description ? " — " + w.description : ""))}"
        data-tip-url="${escapeAttr(w.url)}">
      <div class="cover">
        <img class="thumb" src="${(w.thumb && String(w.thumb).trim()) ? w.thumb : autoThumb(w.title, w.url)}" data-site="${w.url}" alt="Thumbnail ${w.title}" loading="lazy">
        <div class="cover-overlay"></div>
        <div class="cover-top"><span class="pill">${w.category}</span><span class="cover-number">${String(index+1).padStart(2,"0")}</span></div>
        <div class="cover-title"><h3 title="${escapeAttr(w.title)}">${w.title}</h3><span>${s.works.length} karya</span></div>
      </div>
      <div class="card-body">
        <div class="student-row"><div class="student">${s.name}</div><span class="class-badge">${s.classLabel || ("Kelas " + s.class + " · " + studentYear(s))}</span></div>
        <p class="card-desc">${w.description}${ai}</p>
        <div class="meta-row">${tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div>
        ${contactBarHtml(s)}
        <div class="works-title">KARYA <span>${s.works.length} LINK</span></div>
        <div class="work-list">${workButtons(s)}</div>
      </div>
    </article>`;
  }
  function loadScreenshot(img){
    const site=img.dataset.site;
    if(!site)return;
    const screenshot="https://image.thum.io/get/width/1200/crop/700/"+encodeURIComponent(site);
    const test=new Image();
    test.onload=()=>{img.src=test.src; img.classList.add("live-thumb");};
    test.onerror=()=>{};
    test.src=screenshot;
  }
  function bindTooltips(root){
    root.querySelectorAll("[data-tip-url], [data-tip-title]").forEach(el=>{
      el.addEventListener("mouseenter", () => {
        const title = el.getAttribute("data-tip-title") || "";
        const desc  = el.getAttribute("data-tip-desc") || "";
        const url   = el.getAttribute("data-tip-url") || "";
        showTip(el, title, desc, url);
      });
      el.addEventListener("mouseleave", hideTip);
      el.addEventListener("focus", () => {
        const title = el.getAttribute("data-tip-title") || "";
        const desc  = el.getAttribute("data-tip-desc") || "";
        const url   = el.getAttribute("data-tip-url") || "";
        showTip(el, title, desc, url);
      });
      el.addEventListener("blur", hideTip);
    });
  }
  function render(){
    const list=sorted(state.data.students.filter(matches));
    const worksShown = list.reduce((n,s)=>n+(s.works||[]).length,0);
    $("#galleryGrid").innerHTML=list.map(card).join("");
    $("#resultInfo").textContent=`${list.length} santriwati ditampilkan • ${worksShown} karya (filter aktif) · total ${allWorks().length} di database`;
    $("#emptyState").hidden=list.length!==0;
    document.querySelectorAll(".thumb").forEach(loadScreenshot);
    if (window.SHSocial) { SHSocial.bind(document); SHSocial.hydrate(document); }
    document.querySelectorAll("a.work-choice, a.card-link").forEach(a=>{
      a.addEventListener("click",()=>{ try{ GalleryDB.trackEvent("click",{url:a.href}); }catch(e){} });
    });
    document.querySelectorAll(".work-choice").forEach(a=>a.addEventListener("click",e=>{
      e.stopPropagation();
    }));
    bindTooltips(document);
  }
  async function init(){
    try{await resolveViewer();state.data=await loadData();updateStats();buildFilters();render();}
    catch(e){$("#galleryGrid").innerHTML=`<div class="empty"><h3>Data galeri belum dapat dimuat</h3></div>`;return;}
    $("#searchInput").addEventListener("input",e=>{state.query=e.target.value;render();});
    $("#sortSelect").addEventListener("change",e=>{state.sort=e.target.value;render();});
    $("#clearBtn").addEventListener("click",()=>{
      $("#searchInput").value="";
      state.query="";
      state.classFilter="y:"+ACTIVE_YEAR;
      buildFilters();
      render();
    });
    $("#randomBtn").addEventListener("click",()=>{const s=state.data.students[Math.floor(Math.random()*state.data.students.length)];
      const w=s.works[Math.floor(Math.random()*s.works.length)];window.open(w.url,"_blank","noopener,noreferrer");});
    addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#searchInput").focus();}});
    addEventListener("scroll", hideTip, {passive:true});
    addEventListener("resize", hideTip);
  }
  init();
})();
