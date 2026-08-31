
(() => {
  const state = { data:null, query:"", classFilter:"all", sort:"name" };
  const $ = s => document.querySelector(s);
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
      <a class="work-choice ${i===0?"active":""}" data-index="${i}" href="${w.url}" target="_blank" rel="noopener noreferrer">
        <span>${String(i+1).padStart(2,"0")}</span><b>${w.title}</b><small>${w.category}</small><em>↗</em>
      </a>`).join("");
  }
  function card(s,index){
    const w=s.works[0], ai=s.aiTool?` • ${s.aiTool}`:"";
    const tags=[w.category,...(w.tags||[]),...(s.aiTool?["eksperimen AI"]:[])].filter(Boolean).slice(0,4);
    return `<article class="card" data-card>
      <div class="cover">
        <img class="thumb" src="${w.thumb}" data-site="${w.url}" alt="Thumbnail ${w.title}">
        <div class="cover-overlay"></div>
        <div class="cover-top"><span class="pill">${w.category}</span><span class="cover-number">${String(index+1).padStart(2,"0")}</span></div>
        <div class="cover-title"><h3>${w.title}</h3><span>${s.works.length} karya</span></div>
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
  function render(){
    const list=sorted(state.data.students.filter(matches));
    $("#galleryGrid").innerHTML=list.map(card).join("");
    $("#resultInfo").textContent=`${list.length} santriwati ditampilkan • ${allWorks().length} karya dalam galeri`;
    $("#emptyState").hidden=list.length!==0;
    document.querySelectorAll(".thumb").forEach(loadScreenshot);
    document.querySelectorAll(".work-choice").forEach(a=>a.addEventListener("click",e=>{
      e.stopPropagation();
    }));
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
  }
  init();
})();