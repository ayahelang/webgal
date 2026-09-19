(() => {
  const state = { data:null, query:"", classFilter:"all", sort:"name" };
  const $ = s => document.querySelector(s);

  // ===== Tooltip + live meta cache =====
  let tipEl = null;
  const metaCache = new Map(); // url -> {title, description, status}

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
    let jsonData = null;
    try {
      if (window.GALLERY_DATA) jsonData = window.GALLERY_DATA;
      else jsonData = await (await fetch("data/websites.json",{cache:"no-store"})).json();
    } catch (e) {
      console.warn("JSON load failed", e);
      jsonData = { meta:{}, students:[] };
    }
    let dbData = null;
    try {
      if (window.GalleryDB && GalleryDB.enabled()) {
        dbData = await GalleryDB.fetchGalleryFromDb();
      }
    } catch (e) {
      console.warn("Supabase gallery load failed, pakai JSON", e);
    }
    if (window.GalleryDB && typeof GalleryDB.mergeGallery === "function") {
      return GalleryDB.mergeGallery(jsonData, dbData);
    }
    if (dbData && dbData.students && dbData.students.length) return dbData;
    return jsonData;
  }
  const allWorks=()=>state.data.students.flatMap(s=>s.works.map(w=>({...w,student:s})));
  function updateStats(){
    const ss=state.data.students, ww=allWorks();
    $("#studentCount").textContent=ss.length; $("#workCount").textContent=ww.length;
    $("#classCount").textContent=new Set(ss.map(s=>s.class)).size;
    $("#categoryCount").textContent=new Set(ww.map(w=>w.category)).size;
  }
  function matches(s){
    if(state.classFilter!=="all"&&s.class!==state.classFilter)return false;
    const q=state.query.trim().toLowerCase(); if(!q)return true;
    const hay=[s.name,s.class,s.aiTool||"",...s.works.flatMap(w=>[w.title,w.category,w.description,w.url,(w.tags||[]).join(" ")])].join(" ").toLowerCase();
    return hay.includes(q);
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
        <span>${String(i+1).padStart(2,"0")}</span><b>${w.title}</b><small>${w.category}</small><em title="Buka website">↗</em>
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
        <div class="student-row"><div class="student">${s.name}</div><span class="class-badge">${s.classLabel || ("KELAS " + s.class)}</span></div>
        <p class="card-desc">${w.description}${ai}</p>
        <div class="meta-row">${tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div>
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
    $("#galleryGrid").innerHTML=list.map(card).join("");
    $("#resultInfo").textContent=`${list.length} santriwati ditampilkan • ${allWorks().length} karya dalam galeri`;
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
    try{state.data=await loadData();updateStats();render();}
    catch(e){$("#galleryGrid").innerHTML=`<div class="empty"><h3>Data galeri belum dapat dimuat</h3></div>`;return;}
    $("#searchInput").addEventListener("input",e=>{state.query=e.target.value;render();});
    document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{
      document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");
      state.classFilter=b.dataset.class;render();
    }));
    $("#sortSelect").addEventListener("change",e=>{state.sort=e.target.value;render();});
    $("#clearBtn").addEventListener("click",()=>{$("#searchInput").value="";state.query="";state.classFilter="all";
      document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x.dataset.class==="all"));render();});
    $("#randomBtn").addEventListener("click",()=>{const s=state.data.students[Math.floor(Math.random()*state.data.students.length)];
      const w=s.works[Math.floor(Math.random()*s.works.length)];window.open(w.url,"_blank","noopener,noreferrer");});
    addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#searchInput").focus();}});
    addEventListener("scroll", hideTip, {passive:true});
    addEventListener("resize", hideTip);
  }
  init();
})();
