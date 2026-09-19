(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  function esc(t) {
    return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }

  async function boot() {
    const gate = $("#gate");
    const panel = $("#panel");
    if (!GalleryDB.enabled()) {
      $("#gateMsg").textContent = "Supabase belum dikonfigurasi.";
      return;
    }

    $("#btnGoogle").onclick = () => GalleryDB.signInWithGoogle().catch((e) => alert(e.message || e));
    $("#btnLogout").onclick = async () => {
      await GalleryDB.signOut();
      location.reload();
    };

    const auth = await GalleryDB.requireAdmin();
    if (!auth.ok) {
      panel.hidden = true;
      gate.hidden = false;
      if (auth.reason === "forbidden") {
        $("#gateMsg").textContent =
          "Login berhasil sebagai " + (auth.email || "") + " tetapi email ini tidak diizinkan sebagai admin. Keluar lalu ganti akun.";
        const b = document.createElement("button");
        b.className = "btn btn-ghost";
        b.textContent = "Keluar dari akun ini";
        b.onclick = async () => {
          await GalleryDB.signOut();
          location.reload();
        };
        gate.appendChild(b);
      }
      return;
    }

    gate.hidden = true;
    panel.hidden = false;
    $("#adminEmail").textContent = "Admin: " + auth.email;

    $$("#adminTabs .filter").forEach((btn) =>
      btn.addEventListener("click", () => {
        $$("#adminTabs .filter").forEach((x) => x.classList.remove("active"));
        btn.classList.add("active");
        $$(".admin-pane").forEach((p) => {
          p.hidden = p.getAttribute("data-panel") !== btn.dataset.tab;
        });
      })
    );

    await refreshCats();
    await refreshVideos();
    await refreshWebs();
    await refreshAlumni();
    await refreshAngkatan();

    $("#videoForm").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      $("#vidStatus").textContent = "Menyimpan...";
      try {
        await GalleryDB.addVideo({
          title: fd.get("title"),
          url: fd.get("url"),
          categoryId: fd.get("categoryId") || null,
          description: fd.get("description"),
          createdBy: auth.email,
        });
        ev.target.reset();
        $("#vidStatus").textContent = "Video tersimpan.";
        await refreshVideos();
      } catch (e) {
        $("#vidStatus").textContent = e.message || String(e);
      }
    };

    $("#btnAddCat").onclick = async () => {
      const name = prompt("Nama kategori baru:");
      if (!name) return;
      try {
        await GalleryDB.addVideoCategory(name.trim());
        await refreshCats();
        alert("Kategori ditambahkan.");
      } catch (e) {
        alert(e.message || e);
      }
    };
  }

  async function refreshCats() {
    const cats = await GalleryDB.listVideoCategories();
    $("#vidCat").innerHTML = cats.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  }

  async function refreshVideos() {
    const rows = await GalleryDB.listVideos();
    $("#vidList").innerHTML = rows
      .map(
        (v) => `<div class="admin-row">
        <div><strong>${esc(v.title)}</strong><br><small>${esc(v.platform)} · ${esc((v.gallery_video_categories && v.gallery_video_categories.name) || "")}</small></div>
        <button type="button" data-del-vid="${v.id}">Hapus</button>
      </div>`
      )
      .join("") || "<p class='muted'>Belum ada video.</p>";
    $$("#vidList [data-del-vid]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Hapus video ini?")) return;
        await GalleryDB.deleteVideo(b.dataset.delVid);
        await refreshVideos();
      })
    );
  }

  async function refreshWebs() {
    const rows = await GalleryDB.adminListWebsites();
    $("#webList").innerHTML = rows
      .map(
        (w) => `<div class="admin-row">
        <div><strong>${esc(w.title)}</strong> · ${esc((w.gallery_alumni && w.gallery_alumni.name) || "")}<br>
        <small><a href="${esc(w.url)}" target="_blank">${esc(w.url)}</a></small></div>
        <button type="button" data-del-web="${w.id}">Hapus</button>
      </div>`
      )
      .join("") || "<p class='muted'>Belum ada.</p>";
    $$("#webList [data-del-web]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Hapus website ini?")) return;
        await GalleryDB.adminDeleteWebsite(b.dataset.delWeb);
        await refreshWebs();
      })
    );
  }

  async function refreshAlumni() {
    const rows = await GalleryDB.adminListAlumni();
    $("#alumniList").innerHTML = rows
      .map(
        (a) => `<div class="admin-row">
        <div><strong>${esc(a.name)}</strong> · Kelas ${esc(a.class_code || "—")}<br>
        <small>${esc((a.gallery_angkatan && a.gallery_angkatan.label) || "")}</small></div>
        <button type="button" data-del-al="${a.id}">Hapus</button>
      </div>`
      )
      .join("") || "<p class='muted'>Belum ada.</p>";
    $$("#alumniList [data-del-al]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Hapus alumni + semua websitenya?")) return;
        await GalleryDB.adminDeleteAlumni(b.dataset.delAl);
        await refreshAlumni();
        await refreshWebs();
      })
    );
  }

  async function refreshAngkatan() {
    const rows = await GalleryDB.adminListAngkatanAll();
    $("#angList").innerHTML = rows
      .map(
        (a) => `<div class="admin-row">
        <div><strong>${esc(a.label)}</strong><br><small>${esc(a.label_norm)}</small></div>
        <button type="button" data-del-ang="${a.id}">Hapus</button>
      </div>`
      )
      .join("");
    $$("#angList [data-del-ang]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Hapus angkatan? Gagal jika masih ada data terkait.")) return;
        try {
          await GalleryDB.adminDeleteAngkatan(b.dataset.delAng);
          await refreshAngkatan();
        } catch (e) {
          alert(e.message || e);
        }
      })
    );
  }

  boot();
})();
