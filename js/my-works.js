(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  function esc(t) {
    return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }

  async function boot() {
    const session = await GalleryDB.getSession();
    if (!session) {
      $("#needLogin").hidden = false;
      $("#works").hidden = true;
      return;
    }
    try {
      await GalleryDB.upsertMyProfileFromSession();
      const prof = await GalleryDB.getMyProfile();
      if (!prof || !prof.linked_student_name || !prof.linked_angkatan_year) {
        $("#needLogin").innerHTML =
          `<p class="muted">Profil belum ditautkan ke nama siswa & angkatan.</p>
           <p><a class="btn btn-primary" href="profile.html">Lengkapi Profil</a></p>`;
        return;
      }
    } catch (e) {
      $("#needLogin").textContent = e.message || String(e);
      return;
    }

    $("#needLogin").hidden = true;
    $("#works").hidden = false;

    $$("#tabs .filter").forEach((b) =>
      b.addEventListener("click", () => {
        $$("#tabs .filter").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        $$("[data-pane]").forEach((p) => {
          p.hidden = p.getAttribute("data-pane") !== b.dataset.tab;
        });
      })
    );

    $("#webReset").onclick = () => {
      $("#webForm").reset();
      $("#webForm [name=id]").value = "";
    };
    $("#vidReset").onclick = () => {
      $("#vidForm").reset();
      $("#vidForm [name=id]").value = "";
    };

    $("#webForm").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      $("#webMsg").textContent = "Menyimpan...";
      try {
        const id = fd.get("id");
        const payload = { title: fd.get("title"), url: fd.get("url"), category: fd.get("category") || "Web Kreatif" };
        if (id) await GalleryDB.updateMyWebsite(id, payload);
        else await GalleryDB.addMyWebsite(payload);
        $("#webMsg").textContent = "Tersimpan.";
        ev.target.reset();
        $("#webForm [name=id]").value = "";
        await loadWeb();
      } catch (e) {
        $("#webMsg").textContent = e.message || String(e);
      }
    };

    $("#vidForm").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      $("#vidMsg").textContent = "Mengambil info video & menyimpan...";
      try {
        const id = fd.get("id");
        const payload = {
          title: fd.get("title"),
          url: fd.get("url"),
          description: fd.get("description"),
        };
        if (id) await GalleryDB.updateMyVideo(id, payload);
        else await GalleryDB.addMyVideo(payload);
        $("#vidMsg").textContent = "Tersimpan (meta otomatis jika judul/deskripsi kosong).";
        ev.target.reset();
        $("#vidForm [name=id]").value = "";
        await loadVid();
      } catch (e) {
        $("#vidMsg").textContent = e.message || String(e);
      }
    };

    await loadWeb();
    await loadVid();
  }

  async function loadWeb() {
    const rows = await GalleryDB.myWebsites();
    $("#webList").innerHTML =
      rows
        .map(
          (w) => `<div class="admin-row">
        <div><strong>${esc(w.title)}</strong><br><small><a href="${esc(w.url)}" target="_blank">${esc(w.url)}</a></small></div>
        <div style="display:flex;gap:6px">
          <button type="button" data-edit-web='${esc(JSON.stringify(w))}'>Edit</button>
          <button type="button" data-del-web="${w.id}">Hapus</button>
        </div></div>`
        )
        .join("") || "<p class='muted'>Belum ada website.</p>";

    $$("#webList [data-edit-web]").forEach((b) =>
      b.addEventListener("click", () => {
        const w = JSON.parse(b.getAttribute("data-edit-web"));
        $("#webForm [name=id]").value = w.id;
        $("#webForm [name=title]").value = w.title || "";
        $("#webForm [name=url]").value = w.url || "";
        $("#webForm [name=category]").value = w.category || "";
      })
    );
    $$("#webList [data-del-web]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Hapus website ini?")) return;
        await GalleryDB.deleteMyWebsite(b.dataset.delWeb);
        await loadWeb();
      })
    );
  }

  async function loadVid() {
    const rows = await GalleryDB.myVideos();
    $("#vidList").innerHTML =
      rows
        .map(
          (v) => `<div class="admin-row">
        <div><strong>${esc(v.title)}</strong> · <small>${esc(v.platform)}</small><br>
        <small><a href="${esc(v.url)}" target="_blank">${esc(v.url)}</a></small>
        ${v.description ? `<br><small>${esc(v.description)}</small>` : ""}</div>
        <div style="display:flex;gap:6px">
          <button type="button" data-edit-vid='${esc(JSON.stringify({ id: v.id, title: v.title, url: v.url, description: v.description || "" }))}'>Edit</button>
          <button type="button" data-del-vid="${v.id}">Hapus</button>
        </div></div>`
        )
        .join("") || "<p class='muted'>Belum ada video.</p>";

    $$("#vidList [data-edit-vid]").forEach((b) =>
      b.addEventListener("click", () => {
        const v = JSON.parse(b.getAttribute("data-edit-vid"));
        $("#vidForm [name=id]").value = v.id;
        $("#vidForm [name=title]").value = v.title || "";
        $("#vidForm [name=url]").value = v.url || "";
        $("#vidForm [name=description]").value = v.description || "";
      })
    );
    $$("#vidList [data-del-vid]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Hapus video ini?")) return;
        await GalleryDB.deleteMyVideo(b.dataset.delVid);
        await loadVid();
      })
    );
  }

  boot();
})();
