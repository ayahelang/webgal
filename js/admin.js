(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  let selectedUser = null;
  let alumniCache = [];
  let angkatanCache = [];
  let videoCache = [];
  let webCache = [];

  function esc(t) {
    return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
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
    if (!auth.ok) {
      panel.hidden = true;
      gate.hidden = false;
      if (auth.reason === "forbidden") {
        $("#gateMsg").textContent =
          "Akun " + (auth.email || "") + " berhasil login Google tetapi belum punya hak admin. Minta admin utama mengundang dari tab Users.";
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

    bindForms(session);
    await refreshCats();
    await refreshAngkatan();
    await refreshAlumni();
    await refreshVideos();
    await refreshWebs();
    await refreshUsers();
  }

  function bindForms(session) {
    // Video
    $("#videoForm").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const id = fd.get("id");
      const payload = {
        title: fd.get("title"),
        url: fd.get("url"),
        categoryId: fd.get("categoryId") || null,
        description: fd.get("description") || "",
        createdBy: session.user.email,
      };
      try {
        if (id) await GalleryDB.adminUpdateVideo(id, payload);
        else await GalleryDB.addVideo(payload);
        $("#vidStatus").textContent = id ? "Video diperbarui." : "Video ditambah.";
        ev.target.reset();
        ev.target.querySelector('[name=id]').value = "";
        await refreshVideos();
      } catch (e) {
        $("#vidStatus").textContent = e.message || String(e);
      }
    };
    const vidReset = $("#vidReset");
    if (vidReset) {
      vidReset.onclick = () => {
        $("#videoForm").reset();
        $("#videoForm [name=id]").value = "";
        $("#vidStatus").textContent = "";
      };
    }
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

    // Website
    $("#webForm").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const payload = {
        id: fd.get("id") || null,
        title: fd.get("title"),
        url: fd.get("url"),
        category: fd.get("category") || "Web Kreatif",
        alumniId: fd.get("alumniId"),
      };
      try {
        await GalleryDB.adminUpsertWebsite(payload);
        $("#webStatus").textContent = payload.id ? "Website diperbarui." : "Website ditambah.";
        ev.target.reset();
        ev.target.querySelector('[name=id]').value = "";
        await refreshWebs();
      } catch (e) {
        $("#webStatus").textContent = e.message || String(e);
      }
    };
    $("#webReset").onclick = () => {
      $("#webForm").reset();
      $("#webForm [name=id]").value = "";
      $("#webStatus").textContent = "";
    };

    // Alumni
    $("#alumniForm").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const payload = {
        id: fd.get("id") || null,
        name: fd.get("name"),
        angkatanId: fd.get("angkatanId"),
        classCode: fd.get("classCode"),
        role: fd.get("role") || "Santriwati",
      };
      try {
        await GalleryDB.adminUpsertAlumni(payload);
        $("#alumniStatus").textContent = payload.id ? "Alumni diperbarui." : "Alumni ditambah.";
        ev.target.reset();
        ev.target.querySelector('[name=id]').value = "";
        await refreshAlumni();
        await fillAlumniSelects();
      } catch (e) {
        $("#alumniStatus").textContent = e.message || String(e);
      }
    };
    $("#alumniReset").onclick = () => {
      $("#alumniForm").reset();
      $("#alumniForm [name=id]").value = "";
      $("#alumniStatus").textContent = "";
    };

    // Angkatan
    $("#angForm").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const payload = { id: fd.get("id") || null, label: fd.get("label") };
      try {
        await GalleryDB.adminUpsertAngkatan(payload);
        $("#angStatus").textContent = payload.id ? "Angkatan diperbarui." : "Angkatan ditambah.";
        ev.target.reset();
        ev.target.querySelector('[name=id]').value = "";
        await refreshAngkatan();
        await fillAlumniSelects();
      } catch (e) {
        $("#angStatus").textContent = e.message || String(e);
      }
    };
    $("#angReset").onclick = () => {
      $("#angForm").reset();
      $("#angForm [name=id]").value = "";
      $("#angStatus").textContent = "";
    };

    // Users admin
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
    const btnDel = $("#btnDeleteUser");
    if (btnDel) {
      btnDel.onclick = async () => {
        if (!selectedUser) return;
        if (selectedUser.is_admin) {
          alert("Tidak dapat menghapus user yang berstatus admin.");
          return;
        }
        const mainEmails = (window.GALLERY_SUPABASE && GALLERY_SUPABASE.adminEmails) || [];
        if (mainEmails.map((e) => String(e).toLowerCase()).includes(String(selectedUser.email || "").toLowerCase())) {
          alert("Tidak dapat menghapus email admin utama.");
          return;
        }
        if (!confirm("Hapus profil user ini dari daftar terdaftar?")) return;
        try {
          await GalleryDB.adminDeleteUserProfile(selectedUser.id);
          $("#permBox").hidden = true;
          selectedUser = null;
          await refreshUsers();
          alert("User dihapus dari daftar.");
        } catch (e) {
          alert(e.message || e);
        }
      };
    }
  }

  async function refreshCats() {
    const cats = await GalleryDB.listVideoCategories();
    $("#vidCat").innerHTML = cats.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  }

  async function refreshVideos() {
    const rows = await GalleryDB.listVideos();
    videoCache = rows || [];
    $("#vidList").innerHTML =
      videoCache
        .map(
          (v) => `<div class="admin-row">
          <div><strong>${esc(v.title)}</strong><br><small>${esc(v.platform)} · ${esc(v.url)}</small></div>
          <div style="display:flex;gap:6px">
            <button type="button" data-edit-vid="${v.id}">Ubah</button>
            <button type="button" data-del-vid="${v.id}">Hapus</button>
          </div>
        </div>`
        )
        .join("") || "<p class='muted'>Belum ada video.</p>";
    $$("#vidList [data-del-vid]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Hapus video?")) return;
        try {
          await GalleryDB.deleteVideo(b.dataset.delVid);
          await refreshVideos();
        } catch (e) {
          alert(e.message || e);
        }
      })
    );
    $$("#vidList [data-edit-vid]").forEach((b) =>
      b.addEventListener("click", () => {
        const v = videoCache.find((x) => String(x.id) === String(b.dataset.editVid));
        if (!v) return;
        const f = $("#videoForm");
        f.querySelector('[name=id]').value = v.id;
        f.querySelector('[name=title]').value = v.title || "";
        f.querySelector('[name=url]').value = v.url || "";
        f.querySelector('[name=description]').value = v.description || "";
        if (v.category_id) f.querySelector('[name=categoryId]').value = v.category_id;
        $("#vidStatus").textContent = "Mode edit: " + (v.title || "");
        f.scrollIntoView({ behavior: "smooth", block: "nearest" });
      })
    );
  }

  async function fillAlumniSelects() {
    const sel = $("#webAlumniSelect");
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML =
      '<option value="">— pilih alumni —</option>' +
      alumniCache
        .map((a) => `<option value="${a.id}">${esc(a.name)} · K${esc(a.class_code || "?")}</option>`)
        .join("");
    if (cur) sel.value = cur;
  }

  async function refreshWebs() {
    const rows = await GalleryDB.adminListWebsites();
    webCache = rows || [];
    await fillAlumniSelects();
    $("#webList").innerHTML =
      webCache
        .map((w) => {
          const owner = (w.gallery_alumni && w.gallery_alumni.name) || "";
          return `<div class="admin-row">
          <div><strong>${esc(w.title || owner)}</strong><br><small>${esc(w.url)}</small>
          ${owner ? `<br><small>${esc(owner)}</small>` : ""}</div>
          <div style="display:flex;gap:6px">
            <button type="button" data-edit-web="${w.id}">Ubah</button>
            <button type="button" data-del-web="${w.id}">Hapus</button>
          </div>
        </div>`;
        })
        .join("") || "<p class='muted'>Belum ada website.</p>";
    $$("#webList [data-del-web]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Hapus website?")) return;
        try {
          await GalleryDB.adminDeleteWebsite(b.dataset.delWeb);
          await refreshWebs();
        } catch (e) {
          alert(e.message || e);
        }
      })
    );
    $$("#webList [data-edit-web]").forEach((b) =>
      b.addEventListener("click", () => {
        const w = webCache.find((x) => String(x.id) === String(b.dataset.editWeb));
        if (!w) return;
        const f = $("#webForm");
        f.querySelector('[name=id]').value = w.id;
        f.querySelector('[name=title]').value = w.title || "";
        f.querySelector('[name=url]').value = w.url || "";
        f.querySelector('[name=category]').value = w.category || "";
        if (w.alumni_id) f.querySelector('[name=alumniId]').value = w.alumni_id;
        $("#webStatus").textContent = "Mode edit: " + (w.title || "");
        f.scrollIntoView({ behavior: "smooth", block: "nearest" });
      })
    );
  }

  async function refreshAlumni() {
    const rows = await GalleryDB.adminListAlumni();
    alumniCache = rows || [];
    const angSel = $("#alumniAngSelect");
    if (angSel) {
      const cur = angSel.value;
      angSel.innerHTML =
        '<option value="">— pilih angkatan —</option>' +
        angkatanCache.map((a) => `<option value="${a.id}">${esc(a.label)}</option>`).join("");
      if (cur) angSel.value = cur;
    }
    $("#alumniList").innerHTML =
      alumniCache
        .map((a) => {
          const ang = (a.gallery_angkatan && a.gallery_angkatan.label) || "";
          return `<div class="admin-row">
          <div><strong>${esc(a.name)}</strong> · Kelas ${esc(a.class_code || "?")}<br>
          <small>${esc(ang)}</small></div>
          <div style="display:flex;gap:6px">
            <button type="button" data-edit-al="${a.id}">Ubah</button>
            <button type="button" data-del-al="${a.id}">Hapus</button>
          </div>
        </div>`;
        })
        .join("") || "<p class='muted'>Belum ada alumni.</p>";
    $$("#alumniList [data-del-al]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Hapus alumni + website terkait?")) return;
        try {
          await GalleryDB.adminDeleteAlumni(b.dataset.delAl);
          await refreshAlumni();
          await refreshWebs();
        } catch (e) {
          alert(e.message || e);
        }
      })
    );
    $$("#alumniList [data-edit-al]").forEach((b) =>
      b.addEventListener("click", () => {
        const a = alumniCache.find((x) => String(x.id) === String(b.dataset.editAl));
        if (!a) return;
        const f = $("#alumniForm");
        f.querySelector('[name=id]').value = a.id;
        f.querySelector('[name=name]').value = a.name || "";
        f.querySelector('[name=classCode]').value = a.class_code || "";
        f.querySelector('[name=role]').value = a.role || "Santriwati";
        if (a.angkatan_id) f.querySelector('[name=angkatanId]').value = a.angkatan_id;
        $("#alumniStatus").textContent = "Mode edit: " + a.name;
        f.scrollIntoView({ behavior: "smooth", block: "nearest" });
      })
    );
    await fillAlumniSelects();
  }

  async function refreshAngkatan() {
    const rows = await GalleryDB.adminListAngkatanAll();
    angkatanCache = rows || [];
    $("#angList").innerHTML = angkatanCache
      .map(
        (a) => `<div class="admin-row">
        <div><strong>${esc(a.label)}</strong><br><small>${esc(a.label_norm)}</small></div>
        <div style="display:flex;gap:6px">
          <button type="button" data-edit-ang="${a.id}">Ubah</button>
          <button type="button" data-del-ang="${a.id}">Hapus</button>
        </div>
      </div>`
      )
      .join("") || "<p class='muted'>Belum ada angkatan.</p>";
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
    $$("#angList [data-edit-ang]").forEach((b) =>
      b.addEventListener("click", () => {
        const a = angkatanCache.find((x) => String(x.id) === String(b.dataset.editAng));
        if (!a) return;
        const f = $("#angForm");
        f.querySelector('[name=id]').value = a.id;
        f.querySelector('[name=label]').value = a.label || "";
        $("#angStatus").textContent = "Mode edit: " + a.label;
        f.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
          return `<div class="admin-row" style="cursor:pointer" data-user='${esc(
            JSON.stringify({ id: u.id, email: u.email, is_admin: u.is_admin, permissions: u.permissions || {} })
          )}'>
          <div style="display:flex;gap:10px;align-items:center">
            ${u.avatar_url ? `<img src="${esc(u.avatar_url)}" style="width:36px;height:36px;border-radius:50%">` : "👤"}
            <div><strong>${esc(u.display_name || u.email)}</strong>
              ${u.is_admin ? " · <em>Admin</em>" : ""}
              <br><small>${esc(u.email)} · ${esc(st)}</small>
              ${
                u.linked_student_name
                  ? `<br><small>Taut: ${esc(u.linked_student_name)} · ${esc(u.linked_angkatan_year)} · K${esc(
                      u.linked_class_code
                    )}</small>`
                  : ""
              }
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
