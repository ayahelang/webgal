(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  let selectedUser = null;
  let alumniCache = [];
  let alumniAllCache = [];
  let angkatanCache = [];
  let videoCache = [];
  let webCache = [];

  function bindListSearch(inputSel, listSel) {
    const input = $(inputSel);
    const host = $(listSel);
    if (!input || !host) return;
    const run = () => {
      const q = (input.value || "").trim().toLowerCase();
      const rows = host.querySelectorAll(".admin-row, .user-node");
      if (!q) {
        rows.forEach((r) => {
          r.style.display = "";
          r.hidden = false;
        });
        host.querySelectorAll(".pt-children").forEach((c) => {
          // restore: only those with is-collapsed stay collapsed — leave structure
        });
        host.querySelectorAll(".pt-node").forEach((n) => {
          n.style.display = "";
        });
        return;
      }
      // mark matching rows
      rows.forEach((r) => {
        const text = (r.textContent || "").toLowerCase();
        const ok = text.indexOf(q) >= 0;
        r.style.display = ok ? "" : "none";
        r.hidden = !ok;
        if (ok) {
          // expand all parent pt-children
          let p = r.parentElement;
          while (p && p !== host) {
            if (p.classList && p.classList.contains("pt-children")) {
              p.classList.remove("is-collapsed");
              p.style.display = "";
            }
            if (p.classList && p.classList.contains("pt-node")) {
              p.style.display = "";
            }
            p = p.parentElement;
          }
        }
      });
      // hide empty branches
      host.querySelectorAll(".pt-node").forEach((node) => {
        const kids = node.querySelector(".pt-children");
        if (!kids) return;
        const visible = kids.querySelector(".admin-row:not([hidden]), .user-node:not([hidden]), .admin-row[style*=''], .pt-node");
        // if any descendant row visible
        const any = [...kids.querySelectorAll(".admin-row, .user-node")].some((r) => r.style.display !== "none" && !r.hidden);
        node.style.display = any ? "" : "none";
        if (any) kids.classList.remove("is-collapsed");
      });
    };
    input.oninput = run;
    input.onsearch = run;
  }

  /** Alumni resmi: Juli (tahun angkatan + 3). Contoh 2024 → Juli 2027; 2025 → Juli 2028 */
  function isAlumniCohort(angkatanYear, now) {
    now = now || new Date();
    const y = parseInt(angkatanYear, 10);
    if (!y) return false;
    const start = new Date(y + 3, 6, 1); // 1 Juli
    return now >= start;
  }

  let rosterCache = null;
  async function loadRoster() {
    if (rosterCache) return rosterCache;
    rosterCache = {};
    try {
      const r = await fetch("data/student-roster.json", { cache: "no-store" });
      if (r.ok) rosterCache = await r.json();
    } catch (e) {}
    try {
      if (GalleryDB.fetchGalleryFromDb) {
        const g = await GalleryDB.fetchGalleryFromDb();
        (g.students || []).forEach((s) => {
          const y = String(s.angkatan || "");
          const c = String(s.class || "");
          if (!y || !c) return;
          if (!rosterCache[y]) rosterCache[y] = {};
          if (!rosterCache[y][c]) rosterCache[y][c] = [];
          if (s.name && !rosterCache[y][c].includes(s.name)) rosterCache[y][c].push(s.name);
        });
      }
    } catch (e) {}
    Object.keys(rosterCache).forEach((y) => {
      Object.keys(rosterCache[y]).forEach((c) => {
        rosterCache[y][c].sort((a, b) => a.localeCompare(b, "id"));
      });
    });
    return rosterCache;
  }

  function nameOptionsHtml(year, kelas, selected) {
    const roster = rosterCache || {};
    const names = ((roster[String(year)] || {})[String(kelas)] || []).slice();
    let html = '<option value="">— pilih nama —</option>';
    names.forEach((n) => {
      html += `<option value="${esc(n)}" ${selected === n ? "selected" : ""}>${esc(n)}</option>`;
    });
    if (selected && !names.includes(selected)) {
      html += `<option value="${esc(selected)}" selected>${esc(selected)} (custom)</option>`;
    }
    return html;
  }

  async function buildLinkCoverage() {
    await loadRoster();
    const profiles = await GalleryDB.listRegisteredUsers();
    let alumni = [];
    try {
      alumni = await GalleryDB.adminListAlumni();
    } catch (e) {}
    // universe: roster + alumni names per year/class
    const students = {}; // year -> class -> Set of names
    function addName(y, c, name) {
      y = String(y || "");
      c = String(c || "");
      name = String(name || "").trim();
      if (!y || !c || !name) return;
      if (!students[y]) students[y] = {};
      if (!students[y][c]) students[y][c] = new Map();
      const key = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!students[y][c].has(key)) students[y][c].set(key, name);
    }
    Object.keys(rosterCache || {}).forEach((y) => {
      Object.keys(rosterCache[y] || {}).forEach((c) => {
        (rosterCache[y][c] || []).forEach((n) => addName(y, c, n));
      });
    });
    (alumni || []).forEach((al) => {
      const ang = al.gallery_angkatan || {};
      const m = String(ang.label || "").match(/20\d{2}/);
      const y = m ? m[0] : "";
      addName(y, al.class_code, al.name);
    });
    // linked profiles
    const linkedByStudent = {}; // year|class|nameKey -> profile
    const linkedProfiles = [];
    const unlinkedAccounts = [];
    (profiles || []).forEach((p) => {
      const nm = String(p.linked_student_name || "").trim();
      if (!nm || !p.linked_angkatan_year) {
        unlinkedAccounts.push(p);
        return;
      }
      linkedProfiles.push(p);
      const y = String(p.linked_angkatan_year);
      const c = String(p.linked_class_code || "");
      const key = nm.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      linkedByStudent[y + "|" + c + "|" + key] = p;
      // also key without class for fuzzy
      linkedByStudent[y + "||" + key] = p;
    });
    // students not linked
    const unlinkedStudents = [];
    Object.keys(students).forEach((y) => {
      Object.keys(students[y]).forEach((c) => {
        students[y][c].forEach((displayName, key) => {
          const hit = linkedByStudent[y + "|" + c + "|" + key] || linkedByStudent[y + "||" + key];
          if (!hit) unlinkedStudents.push({ year: y, classCode: c, name: displayName });
        });
      });
    });
    const totals = {};
    Object.keys(students).forEach((y) => {
      let n = 0;
      Object.keys(students[y]).forEach((c) => (n += students[y][c].size));
      totals[y] = n;
    });
    const linkedCountByYear = {};
    linkedProfiles.forEach((p) => {
      const y = String(p.linked_angkatan_year);
      linkedCountByYear[y] = (linkedCountByYear[y] || 0) + 1;
    });
    return {
      students,
      totals,
      linkedProfiles,
      unlinkedAccounts,
      unlinkedStudents,
      linkedCountByYear,
      profiles,
    };
  }

  function coverageSummaryHtml(cov) {
    const years = Object.keys(cov.totals || {}).sort().reverse();
    if (!years.length) return "<p class='muted'>Belum ada daftar siswa (roster/alumni).</p>";
    const yearCards = years
      .map((y) => {
        const total = cov.totals[y] || 0;
        let linked = 0;
        const st = cov.students[y] || {};
        Object.keys(st).forEach((c) => {
          st[c].forEach((name, key) => {
            const hit = cov.linkedProfiles.some((p) => {
              if (String(p.linked_angkatan_year) !== y) return false;
              const nk = String(p.linked_student_name || "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, " ")
                .trim();
              return nk === key;
            });
            if (hit) linked++;
          });
        });
        const belum = total - linked;
        const ok = linked + belum === total;
        return (
          `<div class="cov-year"><strong>Angkatan ${esc(y)}</strong> · <b>${total}</b> siswa` +
          ` · <span style="color:#8ff5bd">${linked} taut</span>` +
          ` · <span style="color:#fde68a">${belum} belum</span>` +
          (ok ? " · ✓" : " · ⚠") +
          `</div>`
        );
      })
      .join("");
    return (
      `<div class="link-coverage-box">` +
      `<div class="cov-accounts muted">Akun Google: <b>${(cov.profiles || []).length}</b> · sudah pilih nama <b>${(cov.linkedProfiles || []).length}</b> · belum pilih nama <b>${(cov.unlinkedAccounts || []).length}</b></div>` +
      `<div class="cov-years">${yearCards}</div>` +
      `</div>`
    );
  }

  function bindLinkNameSelects(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-link-year]").forEach((yearSel) => {
      const id = yearSel.getAttribute("data-link-year");
      const classSel = scope.querySelector('[data-link-class="' + id + '"]');
      const nameSel = scope.querySelector('[data-link-name="' + id + '"]');
      if (!nameSel) return;
      const refresh = () => {
        const y = yearSel.value;
        const c = classSel ? classSel.value : "51";
        const cur = nameSel.value;
        if (nameSel.tagName === "SELECT") {
          nameSel.innerHTML = nameOptionsHtml(y, c, cur);
        }
      };
      yearSel.onchange = refresh;
      if (classSel) classSel.onchange = refresh;
      refresh();
    });
  }

  function scrollToForm(sel) {
    const f = $(sel);
    if (!f) return;
    // naik sedikit supaya judul form putih terlihat
    const y = f.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    try { f.querySelector("input,select,textarea") && f.querySelector("input,select,textarea").focus({ preventScroll: true }); } catch (e) {}
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
    const whoCard = $("#adminWhoCard");
    if (whoCard) whoCard.hidden = false;

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
        if (btn.dataset.tab === "sync") { /* noop */ }
      })
    );

    bindForms(session);
    const msg = () => $("#syncMsg");
    const log = () => $("#syncLog");
    const sheetId = () => (($("#syncSheetId") && $("#syncSheetId").value) || "").trim();
    const docsUrls = () => {
      const u = [];
      if ($("#syncDocsUrl51") && $("#syncDocsUrl51").value) u.push($("#syncDocsUrl51").value.trim());
      if ($("#syncDocsUrl52") && $("#syncDocsUrl52").value) u.push($("#syncDocsUrl52").value.trim());
      return u.filter(Boolean);
    };
    const imp = $("#btnImportSheet");
    if (imp) {
      imp.onclick = async () => {
        if (msg()) msg().textContent = "Mengimpor Sheet 51 & 52…";
        try {
          const r = await GalleryDB.importRosterFromSheet2025(sheetId());
          if (msg()) msg().textContent = "Sheet OK: alias " + r.aliasesUpserted + ", video intro +" + r.videosAdded + ", web +" + r.websitesHint;
          if (log()) log().textContent = JSON.stringify(r, null, 2);
        } catch (e) {
          if (msg()) msg().textContent = e.message || String(e);
        }
      };
    }
    const syncBtn = $("#btnSyncDocs");
    if (syncBtn) {
      syncBtn.onclick = async () => {
        if (msg()) msg().textContent = "Menjalankan AI (Edge Function)…";
        try {
          const r = await GalleryDB.runAiDocsSync({ docsUrls: docsUrls(), sheetId: sheetId() });
          if (msg()) msg().textContent = "AI selesai · domain " + (r.domains || 0) + " · siswa " + (r.students || 0);
          if (log()) log().textContent = JSON.stringify(r, null, 2);
        } catch (e) {
          if (msg()) msg().textContent = e.message || String(e);
        }
      };
    }
    const plain = $("#btnSyncDocsPlain");
    if (plain) {
      plain.onclick = async () => {
        if (msg()) msg().textContent = "Sync teks biasa…";
        try {
          const results = [];
          for (const u of docsUrls()) results.push(await GalleryDB.syncFromGoogleDocs(u));
          if (msg()) msg().textContent = "Sync teks selesai (tanpa AI).";
          if (log()) log().textContent = JSON.stringify(results, null, 2);
        } catch (e) {
          if (msg()) msg().textContent = e.message || String(e);
        }
      };
    }

    await refreshCats();
    await refreshAngkatan();
    await refreshAlumni();
    await refreshVideos();
    await refreshWebs();
    await refreshUsers();
  }

  function bindForms(session) {
    const vp = $("#vidPreview");
    if (vp) vp.onclick = () => {
      const f = $("#videoForm");
      SHPreview.previewVideo({
        title: f.querySelector("[name=title]").value,
        url: f.querySelector("[name=url]").value,
        description: f.querySelector("[name=description]").value,
        owner: "Preview admin",
      });
    };
    const wp = $("#webPreview");
    if (wp) wp.onclick = () => {
      const f = $("#webForm");
      const sel = f.querySelector("[name=alumniId]");
      const name = sel && sel.selectedOptions[0] ? sel.selectedOptions[0].textContent : "Siswa";
      SHPreview.previewWebsite({
        title: f.querySelector("[name=title]").value,
        url: f.querySelector("[name=url]").value,
        category: f.querySelector("[name=category]").value,
        name: name,
      });
    };

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
        if (!payload.alumniId) {
          payload.alumniId = await resolveOwnerAlumniId(
            fd.get("ownerYear"),
            fd.get("ownerClass"),
            fd.get("ownerName")
          );
        }
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
    function countDeep(obj) {
      if (Array.isArray(obj)) return obj.length;
      if (!obj || typeof obj !== "object") return 0;
      return Object.keys(obj).reduce((n, k) => n + countDeep(obj[k]), 0);
    }
    // siapkan meta siswa
    let students = [];
    try {
      const g = await GalleryDB.fetchGalleryFromDb();
      students = (g && g.students) || [];
    } catch (e) {}
    function metaFor(v) {
      const on = v.owner_name || "";
      const hit = students.find((s) => String(s.name || "").toLowerCase() === on.toLowerCase());
      let year = hit ? String(hit.angkatan || "") : "";
      let kelas = hit ? String(hit.class || "") : "";
      if (!year) {
        const m = String(v.description || "").match(/Angkatan\s+(\d{4})/i);
        if (m) year = m[1];
      }
      if (!kelas) {
        const m2 = String(v.description || "").match(/Kls?\s*(\d{2})/i);
        if (m2) kelas = m2[1];
      }
      return { year: year || "?", kelas: kelas || "?", name: on || "Tanpa nama" };
    }
    // tree: category -> year -> class -> name -> videos
    const root = {};
    videoCache.forEach((v) => {
      const cat = (v.gallery_video_categories && v.gallery_video_categories.name) || "Lainnya";
      const m = metaFor(v);
      if (!root[cat]) root[cat] = {};
      if (!root[cat][m.year]) root[cat][m.year] = {};
      if (!root[cat][m.year][m.kelas]) root[cat][m.year][m.kelas] = {};
      if (!root[cat][m.year][m.kelas][m.name]) root[cat][m.year][m.kelas][m.name] = [];
      root[cat][m.year][m.kelas][m.name].push(v);
    });
    function vidRow(v) {
      return `<div class="admin-row">
        <div><strong>${esc(v.title)}</strong><br><small>${esc(v.platform)} · ${esc(v.url)}</small></div>
        <div style="display:flex;gap:6px">
          <button type="button" data-edit-vid="${v.id}">Ubah</button>
          <button type="button" data-del-vid="${v.id}">Hapus</button>
        </div>
      </div>`;
    }
    const cats = Object.keys(root).sort();
    $("#vidList").innerHTML =
      cats
        .map((cat) => {
          const years = Object.keys(root[cat]).sort().reverse();
          const yHtml = years
            .map((y) => {
              const classes = Object.keys(root[cat][y]).sort();
              const cHtml = classes
                .map((c) => {
                  const names = Object.keys(root[cat][y][c]).sort((a, b) => a.localeCompare(b, "id"));
                  const nHtml = names
                    .map((nm) => {
                      const list = root[cat][y][c][nm].map(vidRow).join("");
                      return `<div class="pt-node">
                        <div class="pt-row"><button type="button" class="pt-toggle" data-t="v-${esc(cat)}-${esc(y)}-${esc(c)}-${esc(nm)}">▸</button><strong>${esc(nm)}</strong> <small class="muted">(${root[cat][y][c][nm].length})</small></div>
                        <div class="pt-children is-collapsed" data-parent="v-${esc(cat)}-${esc(y)}-${esc(c)}-${esc(nm)}">${list}</div>
                      </div>`;
                    })
                    .join("");
                  return `<div class="pt-node">
                    <div class="pt-row"><button type="button" class="pt-toggle" data-t="v-${esc(cat)}-${esc(y)}-${esc(c)}">▾</button><strong>Kelas ${esc(c)}</strong> <small class="muted pt-count">(${countDeep(root[cat][y][c])})</small></div>
                    <div class="pt-children" data-parent="v-${esc(cat)}-${esc(y)}-${esc(c)}">${nHtml}</div>
                  </div>`;
                })
                .join("");
              return `<div class="pt-node">
                <div class="pt-row"><button type="button" class="pt-toggle" data-t="v-${esc(cat)}-${esc(y)}">▾</button><strong>Angkatan ${esc(y)}</strong> <small class="muted pt-count">(${countDeep(root[cat][y])})</small></div>
                <div class="pt-children" data-parent="v-${esc(cat)}-${esc(y)}">${cHtml}</div>
              </div>`;
            })
            .join("");
          return `<div class="pt-node" style="margin-bottom:12px">
            <div class="pt-row"><button type="button" class="pt-toggle" data-t="v-cat-${esc(cat)}">▾</button><strong>${esc(cat)}</strong> <small class="muted pt-count">(${countDeep(root[cat])})</small></div>
            <div class="pt-children" data-parent="v-cat-${esc(cat)}">${yHtml}</div>
          </div>`;
        })
        .join("") || "<p class='muted'>Belum ada video.</p>";
    treeToggleBind($("#vidList"));
    bindListSearch("#vidSearch", "#vidList");
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
    const angSel = $("#alumniAngSelect");
    if (angSel) {
      const curA = angSel.value;
      const angs = angkatanCache.length ? angkatanCache : await GalleryDB.adminListAngkatanAll();
      angkatanCache = angs || angkatanCache;
      angSel.innerHTML =
        '<option value="">— pilih —</option>' +
        (angkatanCache || [])
          .map((x) => `<option value="${x.id}">${esc(x.label)}</option>`)
          .join("");
      if (curA) angSel.value = curA;
    }
    await loadRoster();
    bindWebOwnerPickers();
  }

  function bindWebOwnerPickers() {
    const ySel = $("#webOwnerYear");
    const cSel = $("#webOwnerClass");
    const nSel = $("#webOwnerName");
    const hid = $("#webAlumniSelect");
    if (!ySel || !cSel || !nSel) return;
    const syncAlumniId = () => {
      if (!hid) return;
      const name = nSel.value;
      const y = ySel.value;
      const c = cSel.value;
      const hit = (alumniAllCache || alumniCache || []).find((al) => {
        const ang = al.gallery_angkatan || {};
        const m = String(ang.label || "").match(/20\d{2}/);
        const yy = m ? m[0] : "";
        return (
          String(al.name || "").toLowerCase() === name.toLowerCase() &&
          yy === y &&
          String(al.class_code || "") === String(c)
        );
      });
      hid.value = hit ? hit.id : "";
    };
    const refreshNames = () => {
      const y = ySel.value;
      const c = cSel.value;
      const names = ((rosterCache[y] || {})[c] || []).slice();
      (alumniAllCache || alumniCache || []).forEach((al) => {
        const ang = al.gallery_angkatan || {};
        const m = String(ang.label || "").match(/20\d{2}/);
        const yy = m ? m[0] : "";
        if (yy === y && String(al.class_code) === String(c) && al.name && !names.includes(al.name)) {
          names.push(al.name);
        }
      });
      names.sort((a, b) => a.localeCompare(b, "id"));
      const cur = nSel.value;
      nSel.innerHTML =
        '<option value="">— pilih nama —</option>' +
        names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
      if (cur && names.includes(cur)) nSel.value = cur;
      syncAlumniId();
    };
    ySel.onchange = refreshNames;
    cSel.onchange = refreshNames;
    nSel.onchange = syncAlumniId;
    refreshNames();
  }

  async function resolveOwnerAlumniId(year, classCode, name) {
    name = String(name || "").trim();
    if (!name) throw new Error("Pilih nama siswa");
    await loadRoster();
    let angs = angkatanCache.length ? angkatanCache : await GalleryDB.adminListAngkatanAll();
    angkatanCache = angs || [];
    let ang = angkatanCache.find((x) => String(x.label || "").includes(String(year)));
    if (!ang) {
      ang = await GalleryDB.adminUpsertAngkatan({ label: "Angkatan " + year });
      await refreshAngkatan();
      ang = angkatanCache.find((x) => String(x.label || "").includes(String(year))) || ang;
    }
    const hit = (alumniAllCache || alumniCache || []).find((al) => {
      const ag = al.gallery_angkatan || {};
      const m = String(ag.label || "").match(/20\d{2}/);
      const yy = m ? m[0] : "";
      return (
        String(al.name || "").toLowerCase() === name.toLowerCase() &&
        yy === String(year) &&
        String(al.class_code || "") === String(classCode)
      );
    });
    if (hit) return hit.id;
    const created = await GalleryDB.adminUpsertAlumni({
      name,
      angkatanId: ang.id,
      classCode: String(classCode),
      role: "Santriwati",
    });
    await refreshAlumni();
    const again = (alumniCache || []).find((x) => String(x.name || "").toLowerCase() === name.toLowerCase());
    return (created && created.id) || (again && again.id);
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
    bindListSearch("#webSearch", "#webList");
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
        const al = (alumniAllCache || alumniCache || []).find((x) => String(x.id) === String(w.alumni_id));
        if (al) {
          const ang = al.gallery_angkatan || {};
          const m = String(ang.label || "").match(/20\d{2}/);
          const ySel = f.querySelector("[name=ownerYear]");
          const cSel = f.querySelector("[name=ownerClass]");
          const nSel = f.querySelector("[name=ownerName]");
          if (ySel && m) ySel.value = m[0];
          if (cSel) cSel.value = al.class_code || "51";
          bindWebOwnerPickers();
          if (nSel) nSel.value = al.name || "";
        } else {
          bindWebOwnerPickers();
        }
        $("#webStatus").textContent = "Mode edit";
        scrollToForm("#webForm");
      })
    );
  }


  async function refreshAlumni() {
    const rows = await GalleryDB.adminListAlumni();
    alumniAllCache = rows || [];
    // list tab: hanya alumni resmi (Juli tahun+3)
    alumniCache = alumniAllCache.filter((a) => {
      const ang = a.gallery_angkatan || {};
      const m = String(ang.label || "").match(/20\d{2}/);
      const year = m ? m[0] : "";
      return isAlumniCohort(year);
    });
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
        .join("") || "<p class='muted'>Belum ada data alumni resmi (Angkatan 2024 → Juli 2027; 2025 → Juli 2028).</p>";
    treeToggleBind($("#alumniList"));
    bindListSearch("#alumniSearch", "#alumniList");
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
    bindListSearch("#angSearch", "#angList");
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
      const cov = await buildLinkCoverage();
      const rows = await GalleryDB.adminListLinks();
      const summary = coverageSummaryHtml(cov);
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
        host.innerHTML = summary + "<p class='muted'>Belum ada tautan akun Google ↔ nama.</p>";
        // tetap tampilkan siswa belum taut
      } else {
      host.innerHTML = summary + years
        .map((y) => {
          const classes = Object.keys(tree[y]).sort();
          const classHtml = classes
            .map((c) => {
              const list = tree[y][c]
                .map((r) => {
                  const who = esc(r.email || r.display_name || r.id);
                  const sn = esc(r.linked_student_name);
                  const y = String(r.linked_angkatan_year || "2025");
                  const c = String(r.linked_class_code || "51");
                  return `<div class="admin-row" style="margin:4px 0">
                    <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center">
                      <div><strong>${sn}</strong><br><small>${who}</small></div>
                      <div style="display:flex;gap:6px">
                        <button type="button" class="btn btn-ghost" data-edit-link="${r.id}" style="padding:6px 10px;font-size:12px">Ubah</button>
                        <button type="button" class="btn btn-ghost" data-unlink="${r.id}" style="padding:6px 10px;font-size:12px">Lepas</button>
                      </div>
                    </div>
                    <div class="link-edit-panel is-collapsed" data-edit-panel="${r.id}" style="margin-top:8px;padding:10px;border:1px dashed rgba(125,227,255,.25);border-radius:10px">
                      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end">
                        <label class="field" style="margin:0"><span>Angkatan</span>
                          <select data-link-year="${r.id}"><option value="2025" ${y==="2025"?"selected":""}>2025</option><option value="2024" ${y==="2024"?"selected":""}>2024</option></select>
                        </label>
                        <label class="field" style="margin:0"><span>Kelas</span>
                          <select data-link-class="${r.id}"><option value="51" ${c==="51"?"selected":""}>51</option><option value="52" ${c==="52"?"selected":""}>52</option></select>
                        </label>
                        <label class="field" style="margin:0;min-width:160px"><span>Nama siswa</span>
                          <select data-link-name="${r.id}"></select>
                        </label>
                        <button type="button" class="btn btn-primary" data-save-link="${r.id}" style="padding:8px 12px;font-size:12px">Simpan tautan</button>
                      </div>
                    </div>
                  </div>`;
                })
                .join("");
              return `<div class="pt-node">
                <div class="pt-row"><button type="button" class="pt-toggle" data-t="c-${y}-${c}">▾</button><strong>Kelas ${esc(c)}</strong> <small class="muted">(${tree[y][c].length} tautan)</small></div>
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
      } // end else years.length
      if (!years.length && !host.innerHTML.includes("link-coverage")) {
        host.innerHTML = summary;
      }
      host.querySelectorAll(".pt-toggle").forEach((b) =>
        b.addEventListener("click", () => {
          const kids = host.querySelector('[data-parent="' + b.dataset.t + '"]');
          if (!kids) return;
          kids.classList.toggle("is-collapsed");
          b.textContent = kids.classList.contains("is-collapsed") ? "▸" : "▾";
        })
      );
      bindListSearch("#linkSearch", "#linkTree");
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
      host.querySelectorAll("[data-edit-link]").forEach((b) =>
        b.addEventListener("click", () => {
          const id = b.getAttribute("data-edit-link");
          const panel = host.querySelector('[data-edit-panel="' + id + '"]');
          if (panel) panel.classList.toggle("is-collapsed");
        })
      );
      host.querySelectorAll("[data-save-link]").forEach((b) =>
        b.addEventListener("click", async () => {
          const id = b.getAttribute("data-save-link");
          const year = (host.querySelector('[data-link-year="' + id + '"]') || {}).value;
          const kelas = (host.querySelector('[data-link-class="' + id + '"]') || {}).value;
          const name = ((host.querySelector('[data-link-name="' + id + '"]') || {}).value || "").trim();
          if (!name) return alert("Pilih nama siswa");
          try {
            await GalleryDB.adminForceLinkProfile(id, { studentName: name, angkatanYear: year, classCode: kelas });
            if (msg) msg.textContent = "Tautan diperbarui.";
            await refreshLinks();
            if (typeof refreshUsers === "function") await refreshUsers();
          } catch (e) {
            alert(e.message || e);
          }
        })
      );
      bindLinkNameSelects(host);
      // siswa/user belum taut
      try {
        // Tutup branch years jika dibuka
        try { /* no-op */ } catch (e) {}
        // 1) Siswa di roster yang belum punya akun Google tertaut
        if (cov.unlinkedStudents && cov.unlinkedStudents.length) {
          const byY = {};
          cov.unlinkedStudents.forEach((s) => {
            if (!byY[s.year]) byY[s.year] = {};
            if (!byY[s.year][s.classCode]) byY[s.year][s.classCode] = [];
            byY[s.year][s.classCode].push(s.name);
          });
          const boxS = document.createElement("div");
          boxS.style.marginTop = "16px";
          boxS.innerHTML =
            `<div class="pt-node"><div class="pt-row"><button type="button" class="pt-toggle" data-t="link-siswa-belum">▾</button><strong>Siswa belum tertaut akun Google</strong> <small class="muted">(${cov.unlinkedStudents.length})</small></div><div class="pt-children" data-parent="link-siswa-belum">` +
            Object.keys(byY)
              .sort()
              .reverse()
              .map((y) => {
                return Object.keys(byY[y])
                  .sort()
                  .map((c) => {
                    const names = byY[y][c].sort((a, b) => a.localeCompare(b, "id"));
                    return `<div class="pt-node"><div class="pt-row"><button type="button" class="pt-toggle" data-t="sb-${y}-${c}">▾</button><strong>Angkatan ${esc(y)} · Kelas ${esc(c)}</strong> <small class="muted">(${names.length})</small></div><div class="pt-children" data-parent="sb-${y}-${c}">${names
                      .map((n) => `<div class="admin-row"><div><strong>${esc(n)}</strong><br><small>Belum ada akun Google yang menautkan nama ini</small></div></div>`)
                      .join("")}</div></div>`;
                  })
                  .join("");
              })
              .join("") +
            `</div></div>`;
          host.appendChild(boxS);
          treeToggleBind(boxS);
        }
        // 2) Akun Google yang login tapi belum pilih nama siswa
        const noLink = cov.unlinkedAccounts || [];
        if (noLink.length) {
          const box = document.createElement("div");
          box.style.marginTop = "16px";
          box.innerHTML = `<div class="pt-node">
            <div class="pt-row"><button type="button" class="pt-toggle" data-t="link-nolink">▾</button><strong>Akun Google belum pilih nama siswa</strong> <small class="muted">(${noLink.length} akun · bukan daftar siswa)</small></div>
            <div class="pt-children" data-parent="link-nolink">${noLink
              .map(
                (u) => `<div class="admin-row">
                <div><strong>${esc(u.display_name || u.email)}</strong><br><small>${esc(u.email)}</small></div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;align-items:end">
                  <label class="field" style="margin:0"><span>Angkatan</span>
                    <select data-link-year="${u.id}"><option value="2025">2025</option><option value="2024">2024</option></select>
                  </label>
                  <label class="field" style="margin:0"><span>Kelas</span>
                    <select data-link-class="${u.id}"><option value="51">51</option><option value="52">52</option></select>
                  </label>
                  <label class="field" style="margin:0;min-width:160px"><span>Nama siswa</span>
                    <select data-link-name="${u.id}"></select>
                  </label>
                  <button type="button" class="btn btn-primary" data-admin-link="${u.id}" style="padding:8px 12px;font-size:12px">Tautkan</button>
                </div>
              </div>`
              )
              .join("")}</div>
          </div>`;
          host.appendChild(box);
          treeToggleBind(box);
          bindLinkNameSelects(box);
          box.querySelectorAll("[data-admin-link]").forEach((btn) =>
            btn.addEventListener("click", async () => {
              const id = btn.getAttribute("data-admin-link");
              const year = (box.querySelector('[data-link-year="' + id + '"]') || {}).value;
              const kelas = (box.querySelector('[data-link-class="' + id + '"]') || {}).value;
              const name = ((box.querySelector('[data-link-name="' + id + '"]') || {}).value || "").trim();
              if (!name) return alert("Pilih nama siswa");
              try {
                await GalleryDB.adminForceLinkProfile(id, { studentName: name, angkatanYear: year, classCode: kelas });
                if (msg) msg.textContent = "Tautan disimpan.";
                await refreshLinks();
                if (typeof refreshUsers === "function") await refreshUsers();
              } catch (e) {
                alert(e.message || e);
              }
            })
          );
        }
      } catch (e) {
        console.warn(e);
      }
    } catch (e) {
      host.innerHTML = "<p class='muted'>" + esc(e.message || e) + "</p>";
    }
  }

  async function refreshUsers() {
    await loadRoster();
    const rows = await GalleryDB.listRegisteredUsers();
    const keys = (window.GALLERY_SUPABASE && GALLERY_SUPABASE.adminPermissionKeys) || (window.SUPABASE_CONFIG && SUPABASE_CONFIG.adminPermissionKeys) || [];
    const linked = rows.filter((u) => u.linked_student_name && String(u.linked_student_name).trim());
    const unlinked = rows.length - linked.length;
    const sum = $("#userLinkSummary");
    let cov = null;
    try { cov = await buildLinkCoverage(); } catch (e) { console.warn(e); }
    if (sum) {
      let extra = "";
      if (cov) extra = coverageSummaryHtml(cov);
      sum.innerHTML = extra || (
        `<div class="cov-accounts muted">Akun Google: <b>${rows.length}</b> · sudah pilih nama <b>${linked.length}</b> · belum <b>${unlinked}</b></div>`
      );
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
    function adminLinkForm(u) {
      return `<div class="admin-link-box" style="margin:0 0 10px 12px;padding:10px;border:1px dashed rgba(125,227,255,.25);border-radius:10px">
        <div class="muted" style="font-size:12px;margin-bottom:6px">Admin tautkan ke nama siswa:</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end">
          <label class="field" style="margin:0"><span>Angkatan</span>
            <select data-link-year="${u.id}"><option value="2025">2025</option><option value="2024">2024</option></select>
          </label>
          <label class="field" style="margin:0"><span>Kelas</span>
            <select data-link-class="${u.id}"><option value="51">51</option><option value="52">52</option></select>
          </label>
          <label class="field" style="margin:0;min-width:160px"><span>Nama</span>
            <select data-link-name="${u.id}"></select>
          </label>
          <button type="button" class="btn btn-primary" data-admin-link="${u.id}" style="padding:8px 12px;font-size:12px">Tautkan</button>
        </div>
      </div>`;
    }
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
      const noLink = rows.filter((u) => !(u.linked_student_name && String(u.linked_student_name).trim()));
      html += `<div class="pt-node" style="margin-top:12px">
        <div class="pt-row"><button type="button" class="pt-toggle" data-t="u-nolink">▾</button><strong>Belum menautkan siswa</strong> <small class="muted">(${unlinked})</small></div>
        <div class="pt-children" data-parent="u-nolink">${noLink.map((u) => userRow(u) + adminLinkForm(u)).join("")}</div>
      </div>`;
    }
    $("#userList").innerHTML = html || "<p class='muted'>Belum ada user login Google.</p>";
    // hide global perm box
    const pb = $("#permBox");
    if (pb) pb.hidden = true;
    treeToggleBind($("#userList"));
    bindListSearch("#userSearch", "#userList");
    bindLinkNameSelects($("#userList"));
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
    $$("#userList [data-admin-link]").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-admin-link");
        const year = ($("#userList").querySelector('[data-link-year="' + id + '"]') || {}).value;
        const kelas = ($("#userList").querySelector('[data-link-class="' + id + '"]') || {}).value;
        const name = (($("#userList").querySelector('[data-link-name="' + id + '"]') || {}).value || "").trim();
        if (!name) {
          alert("Isi nama siswa.");
          return;
        }
        try {
          await GalleryDB.adminForceLinkProfile(id, { studentName: name, angkatanYear: year, classCode: kelas });
          alert("Tautan disimpan.");
          await refreshUsers();
          if (typeof refreshLinks === "function") await refreshLinks();
        } catch (err) {
          alert(err.message || err);
        }
      })
    );
  }


  boot();
})();
