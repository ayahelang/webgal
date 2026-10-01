(function () {
  function esc(t) {
    return String(t || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }
  function ytId(url) {
    const u = String(url || "");
    const m = u.match(/(?:youtu\.be\/|v=|\/embed\/|shorts\/)([\w-]{6,})/);
    return m ? m[1] : "";
  }
  function showModal(html) {
    let m = document.getElementById("shPreviewModal");
    if (!m) {
      m = document.createElement("div");
      m.id = "shPreviewModal";
      m.className = "preview-modal";
      m.innerHTML = `<div class="preview-panel"><div style="display:flex;justify-content:space-between;align-items:center"><h3>Preview card</h3><button type="button" class="btn btn-ghost" id="shPreviewClose">Tutup</button></div><div id="shPreviewBody"></div></div>`;
      document.body.appendChild(m);
      m.addEventListener("click", (e) => {
        if (e.target === m) m.hidden = true;
      });
      document.getElementById("shPreviewClose").onclick = () => (m.hidden = true);
    }
    document.getElementById("shPreviewBody").innerHTML = html;
    m.hidden = false;
  }

  function previewWebsite({ title, url, category, description, name }) {
    const t = title || "Website";
    const host = (() => {
      try {
        return new URL(url).hostname.replace(/^www\./, "");
      } catch (e) {
        return url || "";
      }
    })();
    showModal(`<article class="card" style="max-width:100%">
      <div class="card-body" style="padding:12px">
        <div class="student-row"><div class="student">${esc(name || "Siswa")}</div><span class="class-badge">${esc(category || "Web")}</span></div>
        <p class="card-desc">${esc(description || host)}</p>
        <div class="works-title">KARYA</div>
        <div class="work-list"><div class="work-row"><a class="work-choice active" href="${esc(url)}" target="_blank" rel="noopener"><span>01</span><b>${esc(t)}</b><small>${esc(category || "Web")}</small><em>↗</em></a></div></div>
      </div>
    </article>`);
  }

  function previewVideo({ title, url, description, owner }) {
    const id = ytId(url);
    const thumb = id ? "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg" : "";
    showModal(`<article class="video-card" style="max-width:100%">
      <div class="video-frame">${
        thumb
          ? `<img class="video-thumb" src="${esc(thumb)}" alt="" style="width:100%;display:block;border-radius:8px">`
          : `<div class="muted" style="padding:40px;text-align:center">Tidak ada thumbnail</div>`
      }</div>
      <div class="video-meta">
        <span class="pill">Preview</span>
        <h3>${esc(title || "Video")}</h3>
        ${owner ? `<p class="muted">${esc(owner)}</p>` : ""}
        ${description ? `<p>${esc(description)}</p>` : ""}
        <a href="${esc(url)}" target="_blank" rel="noopener">Buka sumber ↗</a>
      </div>
    </article>`);
  }

  window.SHPreview = { previewWebsite, previewVideo, showModal };
})();
