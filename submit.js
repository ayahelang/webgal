(() => {
  const $ = (s) => document.querySelector(s);
  const linksBox = $("#linksBox");
  const status = $("#formStatus");
  const sel = $("#angkatanSelect");
  const neu = $("#angkatanNew");

  function linkRow() {
    const div = document.createElement("div");
    div.className = "link-row";
    div.style.cssText = "display:grid;grid-template-columns:1fr 1.4fr auto;gap:8px";
    div.innerHTML = `
      <input name="title" type="text" placeholder="Judul karya" maxlength="80">
      <input name="url" type="url" placeholder="https://..." required>
      <button type="button" class="btn btn-ghost rm" style="padding:6px 10px">✕</button>`;
    div.querySelector(".rm").onclick = () => {
      if (linksBox.children.length > 1) div.remove();
    };
    linksBox.appendChild(div);
  }

  function modeUI() {
    const mode = document.querySelector('input[name="mode"]:checked')?.value;
    if (mode === "new") {
      sel.style.display = "none";
      neu.style.display = "block";
      sel.required = false;
      neu.required = true;
    } else {
      sel.style.display = "block";
      neu.style.display = "none";
      sel.required = true;
      neu.required = false;
    }
  }

  async function loadAngkatan() {
    if (!window.GalleryDB || !GalleryDB.enabled()) {
      status.textContent = "Supabase belum dikonfigurasi.";
      return;
    }
    try {
      const list = await GalleryDB.listAngkatan({ mainOnly: true });
      sel.innerHTML =
        list.map((a) => `<option value="${a.id}">${a.label}</option>`).join("") ||
        '<option value="">— belum ada —</option>';
    } catch (e) {
      status.textContent = "Gagal memuat angkatan: " + (e.message || e);
    }
  }

  $("#addLinkBtn").onclick = () => linkRow();
  document.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener("change", modeUI));
  linkRow();
  modeUI();
  loadAngkatan();

  $("#alumniForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const btn = $("#submitBtn");
    btn.disabled = true;
    status.textContent = "Menyimpan...";
    try {
      const fd = new FormData(ev.target);
      const mode = fd.get("mode");
      const websites = [...linksBox.querySelectorAll(".link-row")].map((row) => ({
        title: row.querySelector('[name="title"]').value,
        url: row.querySelector('[name="url"]').value,
      }));
      const result = await GalleryDB.submitAlumni({
        code: fd.get("code"),
        name: fd.get("name"),
        classCode: fd.get("classCode"),
        createNew: mode === "new",
        angkatanId: mode === "existing" ? fd.get("angkatanId") : null,
        angkatanLabel: mode === "new" ? fd.get("angkatanNew") : null,
        websites,
      });
      status.textContent =
        `Berhasil. Website baru: ${result.added}` +
        (result.skipped ? `, dilewati (duplikat): ${result.skipped}` : "") +
        ". Lihat di Gallery.";
      ev.target.reset();
      linksBox.innerHTML = "";
      linkRow();
      modeUI();
      await loadAngkatan();
    } catch (e) {
      status.textContent = "Gagal: " + (e.message || e);
    } finally {
      btn.disabled = false;
    }
  });
})();
