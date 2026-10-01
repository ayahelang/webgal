(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  let selectedUser = null;
  let alumniCache = [];
  let angkatanCache = [];
  let videoCache = [];
  let webCache = [];

  function scrollToForm(sel) {
    const f = $(sel);
    if (f) f.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function treeToggleBind(root) {
    root.querySelectorAll(".pt-toggle").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = b.dataset.t;
        const kids = root.querySelector('[data-parent="' + id + '"]');
        if (!kids) return;
        kids.classList.toggle("is-collapsed");
        b.textContent = kids.classList.contains("is-collapsed") ? "▸" : "▾";
      });
    });
  }
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
        if (btn.dataset.tab === "links") refreshLinks();
        if (btn.dataset.tab === "users") refreshUsers();
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
    const byCat = {};
    videoCache.forEach((v) => {
      const cat = (v.gallery_video_categories && v.gallery_video_categories.name) || "Lainnya";
      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(v);
    });
    const cats = Object.keys(byCat).sort();
    $("#vidList").innerHTML =
      cats
        .map((cat) => {
          const list = byCat[cat]
            .map(
              (v) => `<div class="admin-row">
              <div><strong>${esc(v.title)}</strong><br><small>${esc(v.platform)} · ${esc(v.url)}</small></div>
              <div style="display:flex;gap:6px">
                <button type="button" data-edit-vid="${v.id}">Ubah</button>
                <button type="button" data-del-vid="${v.id}">Hapus</button>
              </div>
            </div>`
            )
            .join("");
          return `<div class="pt-node" style="margin-bottom:10px">
            <div class="pt-row"><button type="button" class="pt-toggle" data-t="vid-${esc(cat)}">▾</button><strong>${esc(cat)}</strong> <small class="muted">(${byCat[cat].length})</small></div>
            <div class="pt-children" data-parent="vid-${esc(cat)}">${list}</div>
          </div>`;
        })
        .join("") || "<p class='muted'>Belum ada video.</p>";
    treeToggleBind($("#vidList"));
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
        f.querySelector("[name=id]").value = v.id;
        f.querySelector("[name=title]").value = v.title || "";
        f.querySelector("[name=url]").value = v.url || "";
        f.querySelector("[name=description]").value = v.description || "";
        if (v.category_id) f.querySelector("[name=categoryId]").value = v.category_id;
        $("#vidStatus").textContent = "Mode edit: " + (v.title || "");
        scrollToForm("#videoForm");
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
    // tree: angkatan → kelas → student → sites (from alumni join)
    const tree = {};
    webCache.forEach((w) => {
      const al = w.gallery_alumni || {};
      const name = al.name || "Tanpa nama";
      const kelas = al.class_code || "?";
      let year = "?";
      // may need angkatan from nested
      const ang = al.gallery_angkatan || al.angkatan || {};
      if (ang.label) {
        const m = String(ang.label).match(/20\d{2}/);
        if (m) year = m[0];
      }
      if (!tree[year]) tree[year] = {};
      if (!tree[year][kelas]) tree[year][kelas] = {};
      if (!tree[year][kelas][name]) tree[year][kelas][name] = [];
      tree[year][kelas][name].push(w);
    });
    const years = Object.keys(tree).sort().reverse();
    $("#webList").innerHTML =
      years
        .map((y) => {
          const classes = Object.keys(tree[y]).sort();
          const cHtml = classes
            .map((c) => {
              const names = Object.keys(tree[y][c]).sort((a, b) => a.localeCompare(b, "id"));
              const nHtml = names
                .map((nm) => {
                  const sites = tree[y][c][nm]
                    .map(
                      (w) => `<div class="admin-row">
                      <div><strong>${esc((w.title || "").replace(/\s*[·•\-]\s*Domain\s*$/i, "").replace(/\bDomain\b/gi, "").trim() || nm)}</strong><br><small>${esc(w.url)}</small></div>
                      <div style="display:flex;gap:6px">
                        <button type="button" data-edit-web="${w.id}">Ubah</button>
                        <button type="button" data-del-web="${w.id}">Hapus</button>
                      </div>
                    </div>`
                    )
                    .join("");
                  return `<div class="pt-node">
                    <div class="pt-row"><button type="button" class="pt-toggle" data-t="w-${esc(y)}-${esc(c)}-${esc(nm)}">▸</button><strong>${esc(nm)}</strong> <small class="muted">(${tree[y][c][nm].length})</small></div>
                    <div class="pt-children is-collapsed" data-parent="w-${esc(y)}-${esc(c)}-${esc(nm)}">${sites}</div>
                  </div>`;
                })
                .join("");
              return `<div class="pt-node">
                <div class="pt-row"><button type="button" class="pt-toggle" data-t="w-${esc(y)}-${esc(c)}">▾</button><strong>Kelas ${esc(c)}</strong></div>
                <div class="pt-children" data-parent="w-${esc(y)}-${esc(c)}">${nHtml}</div>
              </div>`;
            })
            .join("");
          return `<div class="pt-node" style="margin-bottom:10px">
            <div class="pt-row"><button type="button" class="pt-toggle" data-t="w-y-${esc(y)}">▾</button><strong>Angkatan ${esc(y)}</strong></div>
            <div class="pt-children" data-parent="w-y-${esc(y)}">${cHtml}</div>
          </div>`;
        })
        .join("") || "<p class='muted'>Belum ada website.</p>";
    treeToggleBind($("#webList"));
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
        f.querySelector("[name=id]").value = w.id;
        f.querySelector("[name=title]").value = (w.title || "").replace(/\s*[·•\-]\s*Domain\s*$/i, "").replace(/\bDomain\b/gi, "").trim();
        f.querySelector("[name=url]").value = w.url || "";
        f.querySelector("[name=category]").value = w.category || "";
        if (w.alumni_id) f.querySelector("[name=alumniId]").value = w.alumni_id;
        $("#webStatus").textContent = "Mode edit";
        scrollToForm("#webForm");
      })
    );
  }


  async function refreshAlumni() {
    const rows = await GalleryDB.adminListAlumni();
    alumniCache = rows || [];
    await fillAlumniSelects();
    const tree = {};
    alumniCache.forEach((a) => {
      let year = "?";
      const ang = a.gallery_angkatan || {};
      const m = String(ang.label || "").match(/20\d{2}/);
      if (m) year = m[0];
      const c = a.class_code || "?";
      if (!tree[year]) tree[year] = {};
      if (!tree[year][c]) tree[year][c] = [];
      tree[year][c].push(a);
    });
    const years = Object.keys(tree).sort().reverse();
    $("#alumniList").innerHTML =
      years
        .map((y) => {
          const classes = Object.keys(tree[y]).sort();
          const cHtml = classes
            .map((c) => {
              const list = tree[y][c]
                .slice()
                .sort((a, b) => (a.name || "").localeCompare(b.name || "", "id"))
                .map(
                  (a) => `<div class="admin-row">
                  <div><strong>${esc(a.name)}</strong><br><small>Kelas ${esc(a.class_code || "?")} · ${esc((a.gallery_angkatan && a.gallery_angkatan.label) || "")}</small></div>
                  <div style="display:flex;gap:6px">
                    <button type="button" data-edit-al="${a.id}">Ubah</button>
                    <button type="button" data-del-al="${a.id}">Hapus</button>
                  </div>
                </div>`
                )
                .join("");
              return `<div class="pt-node">
                <div class="pt-row"><button type="button" class="pt-toggle" data-t="al-${esc(y)}-${esc(c)}">▾</button><strong>Kelas ${esc(c)}</strong> <small class="muted">(${tree[y][c].length})</small></div>
                <div class="pt-children" data-parent="al-${esc(y)}-${esc(c)}">${list}</div>
              </div>`;
            })
            .join("");
          return `<div class="pt-node" style="margin-bottom:10px">
            <div class="pt-row"><button type="button" class="pt-toggle" data-t="al-y-${esc(y)}">▾</button><strong>Angkatan ${esc(y)}</strong></div>
            <div class="pt-children" data-parent="al-y-${esc(y)}">${cHtml}</div>
          </div>`;
        })
        .join("") || "<p class='muted'>Belum ada alumni.</p>";
    treeToggleBind($("#alumniList"));
    $$("#alumniList [data-del-al]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Hapus alumni beserta website-nya?")) return;
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
        f.querySelector("[name=id]").value = a.id;
        f.querySelector("[name=name]").value = a.name || "";
        f.querySelector("[name=class_code]").value = a.class_code || "51";
        if (a.angkatan_id) f.querySelector("[name=angkatan_id]").value = a.angkatan_id;
        $("#alumniStatus").textContent = "Mode edit: " + (a.name || "");
        scrollToForm("#alumniForm");
      })
    );
  }


  async function refreshAngkatan() {
    const rows = await GalleryDB.adminListAngkatanAll();
    angkatanCache = rows || [];
    const tree = {};
    angkatanCache.forEach((a) => {
      const m = String(a.label || "").match(/20\d{2}/);
      const y = m ? m[0] : "Lainnya";
      if (!tree[y]) tree[y] = [];
      tree[y].push(a);
    });
    const years = Object.keys(tree).sort().reverse();
    $("#angList").innerHTML =
      years
        .map((y) => {
          const list = tree[y]
            .map(
              (a) => `<div class="admin-row">
              <div><strong>${esc(a.label)}</strong><br><small>${esc(a.label_norm)}</small></div>
              <div style="display:flex;gap:6px">
                <button type="button" data-edit-ang="${a.id}">Ubah</button>
                <button type="button" data-del-ang="${a.id}">Hapus</button>
              </div>
            </div>`
            )
            .join("");
          return `<div class="pt-node" style="margin-bottom:10px">
            <div class="pt-row"><button type="button" class="pt-toggle" data-t="ang-${esc(y)}">▾</button><strong>Tahun ${esc(y)}</strong> <small class="muted">(${tree[y].length})</small></div>
            <div class="pt-children" data-parent="ang-${esc(y)}">${list}</div>
          </div>`;
        })
        .join("") || "<p class='muted'>Belum ada angkatan.</p>";
    treeToggleBind($("#angList"));
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
        f.querySelector("[name=id]").value = a.id;
        f.querySelector("[name=label]").value = a.label || "";
        $("#angStatus").textContent = "Mode edit: " + a.label;
        scrollToForm("#angForm");
      })
    );
  }

  async function refreshLinks() {
    const host = $("#linkTree");
    const msg = $("#linkAdminMsg");
    if (!host) return;
    host.innerHTML = "Memuat…";
    try {
      const rows = await GalleryDB.adminListLinks();
      // group year -> class -> list
      const tree = {};
      rows.forEach((r) => {
        const y = String(r.linked_angkatan_year || "?");
        const c = String(r.linked_class_code || "?");
        if (!tree[y]) tree[y] = {};
        if (!tree[y][c]) tree[y][c] = [];
        tree[y][c].push(r);
      });
      const years = Object.keys(tree).sort().reverse();
      if (!years.length) {
        host.innerHTML = "<p class='muted'>Belum ada tautan.</p>";
        return;
      }
      host.innerHTML = years
        .map((y) => {
          const classes = Object.keys(tree[y]).sort();
          const classHtml = classes
            .map((c) => {
              const list = tree[y][c]
                .map((r) => {
                  const who = esc(r.email || r.display_name || r.id);
                  const sn = esc(r.linked_student_name);
                  return `<div class="admin-row" style="margin:4px 0">
                    <div><strong>${sn}</strong><br><small>${who}</small></div>
                    <button type="button" class="btn btn-ghost" data-unlink="${r.id}" style="padding:6px 10px;font-size:12px">Lepas</button>
                  </div>`;
                })
                .join("");
              return `<div class="pt-node">
                <div class="pt-row"><button type="button" class="pt-toggle" data-t="c-${y}-${c}">▾</button><strong>Kelas ${esc(c)}</strong></div>
                <div class="pt-children" data-parent="c-${y}-${c}">${list}</div>
              </div>`;
            })
            .join("");
          return `<div class="pt-node" style="margin-bottom:10px">
            <div class="pt-row"><button type="button" class="pt-toggle" data-t="y-${y}">▾</button><strong>Angkatan ${esc(y)}</strong> <small class="muted">(${Object.values(tree[y]).reduce((n,a)=>n+a.length,0)} tautan)</small></div>
            <div class="pt-children" data-parent="y-${y}">${classHtml}</div>
          </div>`;
        })
        .join("");
      host.querySelectorAll(".pt-toggle").forEach((b) =>
        b.addEventListener("click", () => {
          const kids = host.querySelector('[data-parent="' + b.dataset.t + '"]');
          if (!kids) return;
          kids.classList.toggle("is-collapsed");
          b.textContent = kids.classList.contains("is-collapsed") ? "▸" : "▾";
        })
      );
      host.querySelectorAll("[data-unlink]").forEach((b) =>
        b.addEventListener("click", async () => {
          if (!confirm("Lepas tautan akun ini?")) return;
          try {
            await GalleryDB.adminUnlinkProfile(b.dataset.unlink);
            if (msg) msg.textContent = "Tautan dilepas.";
            await refreshLinks();
          } catch (e) {
            if (msg) msg.textContent = e.message || String(e);
          }
        })
      );
    } catch (e) {
      host.innerHTML = "<p class='muted'>" + esc(e.message || e) + "</p>";
    }
  }

  async function refreshUsers() {
    const rows = await GalleryDB.listRegisteredUsers();
    const keys = (window.GALLERY_SUPABASE && GALLERY_SUPABASE.adminPermissionKeys) || (window.SUPABASE_CONFIG && SUPABASE_CONFIG.adminPermissionKeys) || [];
    const linked = rows.filter((u) => u.linked_student_name && String(u.linked_student_name).trim());
    const unlinked = rows.length - linked.length;
    const sum = $("#userLinkSummary");
    if (sum) {
      sum.innerHTML = `<strong>${rows.length}</strong> akun · <strong>${linked.length}</strong> sudah tautkan siswa · <strong>${unlinked}</strong> belum`;
    }
    // tree: linked by year/class, then unlinked
    const tree = {};
    linked.forEach((u) => {
      const y = String(u.linked_angkatan_year || "?");
      const c = String(u.linked_class_code || "?");
      if (!tree[y]) tree[y] = {};
      if (!tree[y][c]) tree[y][c] = [];
      tree[y][c].push(u);
    });
    function userRow(u) {
      const st = u.linked_angkatan_year ? (window.SHStatus ? SHStatus.compute(u.linked_angkatan_year).label : "Taut") : "Belum tautkan";
      const permKeys = keys.length ? keys : ["videos", "websites", "alumni", "users", "angkatan"];
      const permHtml = permKeys
        .map(
          (k) =>
            `<label style="display:flex;gap:6px;align-items:center;font-size:12px"><input type="checkbox" data-perm="${esc(k)}" ${
              u.permissions && u.permissions[k] ? "checked" : ""
            }> ${esc(k)}</label>`
        )
        .join("");
      return `<div class="pt-node user-node" data-uid="${u.id}">
        <div class="admin-row" style="cursor:pointer" data-toggle-user="${u.id}">
          <div style="display:flex;gap:10px;align-items:center">
            ${u.avatar_url ? `<img src="${esc(u.avatar_url)}" style="width:36px;height:36px;border-radius:50%">` : "👤"}
            <div><strong>${esc(u.display_name || u.email)}</strong>
              ${u.is_admin ? " · <em>Admin</em>" : ""}
              <br><small>${esc(u.email)} · ${esc(st)}</small>
              ${
                u.linked_student_name
                  ? `<br><small>Taut: ${esc(u.linked_student_name)} · ${esc(u.linked_angkatan_year)} · K${esc(u.linked_class_code)}</small>`
                  : ""
              }
            </div>
          </div>
          <span class="muted">Atur ▾</span>
        </div>
        <div class="user-perm-panel is-collapsed" data-parent-user="${u.id}" style="padding:8px 12px 12px;border-left:2px solid rgba(125,227,255,.2);margin:0 0 8px 12px">
          <label style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><input type="checkbox" data-is-admin ${u.is_admin ? "checked" : ""}> Jadikan admin</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px 14px;margin-bottom:8px">${permHtml}</div>
          <button type="button" class="btn btn-primary" data-save-user="${u.id}" style="padding:6px 12px;font-size:12px">Simpan hak akses</button>
        </div>
      </div>`;
    }
    const years = Object.keys(tree).sort().reverse();
    let html = years
      .map((y) => {
        const classes = Object.keys(tree[y]).sort();
        const cHtml = classes
          .map((c) => {
            const list = tree[y][c].map(userRow).join("");
            return `<div class="pt-node">
              <div class="pt-row"><button type="button" class="pt-toggle" data-t="u-${esc(y)}-${esc(c)}">▾</button><strong>Kelas ${esc(c)}</strong> <small class="muted">(${tree[y][c].length})</small></div>
              <div class="pt-children" data-parent="u-${esc(y)}-${esc(c)}">${list}</div>
            </div>`;
          })
          .join("");
        return `<div class="pt-node" style="margin-bottom:10px">
          <div class="pt-row"><button type="button" class="pt-toggle" data-t="u-y-${esc(y)}">▾</button><strong>Angkatan ${esc(y)}</strong> <small class="muted">(sudah taut)</small></div>
          <div class="pt-children" data-parent="u-y-${esc(y)}">${cHtml}</div>
        </div>`;
      })
      .join("");
    if (unlinked) {
      html += `<div class="pt-node" style="margin-top:12px">
        <div class="pt-row"><button type="button" class="pt-toggle" data-t="u-nolink">▾</button><strong>Belum menautkan siswa</strong> <small class="muted">(${unlinked})</small></div>
        <div class="pt-children" data-parent="u-nolink">${rows.filter((u) => !(u.linked_student_name && String(u.linked_student_name).trim())).map(userRow).join("")}</div>
      </div>`;
    }
    $("#userList").innerHTML = html || "<p class='muted'>Belum ada user login Google.</p>";
    // hide global perm box
    const pb = $("#permBox");
    if (pb) pb.hidden = true;
    treeToggleBind($("#userList"));
    $$("#userList [data-toggle-user]").forEach((row) =>
      row.addEventListener("click", () => {
        const id = row.getAttribute("data-toggle-user");
        const panel = $("#userList").querySelector('[data-parent-user="' + id + '"]');
        if (panel) panel.classList.toggle("is-collapsed");
      })
    );
    $$("#userList [data-save-user]").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-save-user");
        const panel = btn.closest(".user-perm-panel");
        const isAdmin = panel.querySelector("[data-is-admin]").checked;
        const permissions = {};
        panel.querySelectorAll("[data-perm]").forEach((cb) => {
          permissions[cb.getAttribute("data-perm")] = cb.checked;
        });
        try {
          await GalleryDB.setUserAdmin(id, { isAdmin, permissions });
          alert("Hak akses disimpan.");
          await refreshUsers();
        } catch (err) {
          alert(err.message || err);
        }
      })
    );
  }


  boot();
})();
