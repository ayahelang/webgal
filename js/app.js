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
    const safeDesc  = fallbackDesc || "";
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
          <div class="tip-source">dari website</div>
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
            <div class="tip-source">dari website</div>
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
    if(window.GALLERY_DATA) return window.GALLERY_DATA;
    return await (await fetch("data/websites.json",{cache:"no-store"})).json();
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
    return s.works.map((w,i)=>`
      <a class="work-choice ${i===0?"active":""}" data-index="${i}"
         href="${w.url}" target="_blank" rel="noopener noreferrer"
         data-tip-title="${escapeAttr(w.title)}"
         data-tip-desc="${escapeAttr(w.description || w.category)}"
         data-tip-url="${escapeAttr(w.url)}">
        <span>${String(i+1).padStart(2,"0")}</span><b>${w.title}</b><small>${w.category}</small><em>↗</em>
      </a>`).join("");
  }
  function escapeAttr(str){
    return String(str||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
  }
  function card(s,index){
    const w=s.works[0], ai=s.aiTool?` • ${s.aiTool}`:"";
    const tags=[w.category,...(w.tags||[]),...(s.aiTool?["eksperimen AI"]:[])].filter(Boolean).slice(0,4);
    return `<article class="card" data-card
        data-tip-title="${escapeAttr(w.title)}"
        data-tip-desc="${escapeAttr((s.name) + (w.description ? " — " + w.description : ""))}"
        data-tip-url="${escapeAttr(w.url)}">
      <div class="cover">
        <img class="thumb" src="${w.thumb}" data-site="${w.url}" alt="Thumbnail ${w.title}">
        <div class="cover-overlay"></div>
        <div class="cover-top"><span class="pill">${w.category}</span><span class="cover-number">${String(index+1).padStart(2,"0")}</span></div>
        <div class="cover-title"><h3 title="${escapeAttr(w.title)}">${w.title}</h3><span>${s.works.length} karya</span></div>
      </div>
      <div class="card-body">
        <div class="student-row"><div class="student">${s.name}</div><span class="class-badge">KELAS ${s.class}</span></div>
        <p class="card-desc">${w.description}${ai}</p>
        <div class="meta-row">${tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div>
        ${s.works.length>1?`<div class="works-title">PILIH KARYA <span>${s.works.length} PROJECT</span></div><div class="work-list">${workButtons(s)}</div>`:
          `<a class="card-link" href="${w.url}" target="_blank" rel="noopener noreferrer"><span>Buka website</span><span>↗</span></a>`}
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
