(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  let selectedUser = null;
  let authCtx = null;

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

    $("#btnGoogle").onclick = () =>
      GalleryDB.signInWithGoogle({
      redirectTo: location.origin + location.pathname.replace(/[^/]+$/, "") + "admin.html",
      returnTo: location.href,
    }).catch((e) => alert(e.message || e));
    $("#btnLogout").onclick = async () => {
      await GalleryDB.signOut();
      location.href = "admin.html";
    };

    const auth = await GalleryDB.requireAdmin();
    authCtx = auth;
    if (!auth.ok) {
      panel.hidden = true;
      gate.hidden = false;
      if (auth.reason === "forbidden") {
        $("#gateMsg").textContent =
          "Akun " + (auth.email || "") + " berhasil login Google tetapi belum punya hak admin. Minta admin utama mengundang dari tab Users.";
        // still show logout
        const b = document.createElement("button");
        b.className = "btn btn-ghost";
        b.textContent = "Keluar";
        b.onclick = async () => {
          await GalleryDB.signOut();
          location.reload();
        };
        gate.appendChild(b);
      }
      return;
    }

    // logged in admin: hide gate completely
    gate.hidden = true;
    gate.style.display = "none";
    panel.hidden = false;

    const session = auth.session;
    const meta = (session.user && session.user.user_metadata) || {};
    $("#adminEmail").textContent = auth.email;
    $("#adminName").textContent = meta.full_name || meta.name || "Admin";
    if (meta.avatar_url || meta.picture) {
      const img = $("#adminAvatar");
      img.src = meta.avatar_url || meta.picture;
      img.hidden = false;
    }

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
    await refreshUsers();

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
      } catch (e) {
        alert(e.message || e);
      }
    };

    $("#btnSaveAdmin").onclick = async () => {
      if (!selectedUser) return;
      const permissions = {};
      $$("#permChecks input[type=checkbox]").forEach((c) => {
        permissions[c.value] = c.checked;
      });
      try {
        await GalleryDB.setUserAdmin(selectedUser.id, { isAdmin: true, permissions });
        alert("Admin tambahan disimpan.");
        await refreshUsers();
      } catch (e) {
        alert(e.message || e);
      }
    };
    $("#btnRevokeAdmin").onclick = async () => {
      if (!selectedUser) return;
      if (!confirm("Cabut hak admin user ini?")) return;
      try {
        await GalleryDB.setUserAdmin(selectedUser.id, { isAdmin: false, permissions: {} });
        $("#permBox").hidden = true;
        await refreshUsers();
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
    $("#vidList").innerHTML =
      rows
        .map(
          (v) => `<div class="admin-row"><div><strong>${esc(v.title)}</strong><br><small>${esc(v.platform)}</small></div>
        <button type="button" data-del-vid="${v.id}">Hapus</button></div>`
        )
        .join("") || "<p class='muted'>Belum ada video.</p>";
    $$("#vidList [data-del-vid]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Hapus?")) return;
        await GalleryDB.deleteVideo(b.dataset.delVid);
        await refreshVideos();
      })
    );
  }
  async function refreshWebs() {
    const rows = await GalleryDB.adminListWebsites();
    $("#webList").innerHTML =
      rows
        .map(
          (w) => `<div class="admin-row"><div><strong>${esc(w.title)}</strong><br><small><a href="${esc(w.url)}" target="_blank">${esc(w.url)}</a></small></div>
        <button type="button" data-del-web="${w.id}">Hapus</button></div>`
        )
        .join("") || "<p class='muted'>Belum ada.</p>";
    $$("#webList [data-del-web]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Hapus?")) return;
        await GalleryDB.adminDeleteWebsite(b.dataset.delWeb);
        await refreshWebs();
      })
    );
  }
  async function refreshAlumni() {
    const rows = await GalleryDB.adminListAlumni();
    $("#alumniList").innerHTML =
      rows
        .map(
          (a) => `<div class="admin-row"><div><strong>${esc(a.name)}</strong> · Kelas ${esc(a.class_code || "—")}<br>
        <small>${esc((a.gallery_angkatan && a.gallery_angkatan.label) || "")}</small></div>
        <button type="button" data-del-al="${a.id}">Hapus</button></div>`
        )
        .join("") || "<p class='muted'>Belum ada.</p>";
    $$("#alumniList [data-del-al]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Hapus alumni + website?")) return;
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
        (a) => `<div class="admin-row"><div><strong>${esc(a.label)}</strong><br><small>${esc(a.label_norm)}</small></div>
        <button type="button" data-del-ang="${a.id}">Hapus</button></div>`
      )
      .join("");
    $$("#angList [data-del-ang]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Hapus angkatan?")) return;
        try {
          await GalleryDB.adminDeleteAngkatan(b.dataset.delAng);
          await refreshAngkatan();
        } catch (e) {
          alert(e.message || e);
        }
      })
    );
  }

  async function refreshUsers() {
    const rows = await GalleryDB.listRegisteredUsers();
    const keys = (window.GALLERY_SUPABASE && GALLERY_SUPABASE.adminPermissionKeys) || [];
    $("#userList").innerHTML =
      rows
        .map((u) => {
          const st = u.linked_angkatan_year ? SHStatus.compute(u.linked_angkatan_year).label : "Belum tautkan siswa";
          return `<div class="admin-row" style="cursor:pointer" data-user='${esc(JSON.stringify({ id: u.id, email: u.email, is_admin: u.is_admin, permissions: u.permissions || {} }))}'>
          <div style="display:flex;gap:10px;align-items:center">
            ${u.avatar_url ? `<img src="${esc(u.avatar_url)}" style="width:36px;height:36px;border-radius:50%">` : "👤"}
            <div><strong>${esc(u.display_name || u.email)}</strong>
              ${u.is_admin ? " · <em>Admin</em>" : ""}
              <br><small>${esc(u.email)} · ${esc(st)}</small>
              ${u.linked_student_name ? `<br><small>Taut: ${esc(u.linked_student_name)} · ${esc(u.linked_angkatan_year)} · K${esc(u.linked_class_code)}</small>` : ""}
            </div>
          </div>
          <span class="muted">Atur →</span>
        </div>`;
        })
        .join("") || "<p class='muted'>Belum ada user login Google. Minta mereka Login di halaman Profil.</p>";

    $$("#userList [data-user]").forEach((row) =>
      row.addEventListener("click", () => {
        selectedUser = JSON.parse(row.getAttribute("data-user"));
        $("#permBox").hidden = false;
        $("#permTarget").textContent = "Hak akses untuk: " + selectedUser.email;
        const perms = selectedUser.permissions || {};
        $("#permChecks").innerHTML = keys
          .map(
            (k) => `<label style="display:flex;gap:8px;align-items:center;font-size:13px;color:#c5d8e0">
            <input type="checkbox" value="${k}" ${perms[k] ? "checked" : ""}> ${k}</label>`
          )
          .join("");
      })
    );
  }

  boot();
})();
