(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
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
      const leafSel = ".admin-row, .user-node, .sh-stu-leaf, .user-leaf, [data-search-row]";
      const rows = host.querySelectorAll(leafSel);
      if (!q) {
        rows.forEach((r) => {
          r.style.display = "";
          r.hidden = false;
        });
        host.querySelectorAll(".pt-node").forEach((n) => {
          n.style.display = "";
          n.hidden = false;
        });
        return;
      }
      rows.forEach((r) => {
        const text = ((r.getAttribute("data-search") || "") + " " + (r.textContent || "")).toLowerCase();
        const ok = text.indexOf(q) >= 0;
        r.style.display = ok ? "" : "none";
        r.hidden = !ok;
        if (ok) {
          let p = r.parentElement;
          while (p && p !== host) {
            if (p.classList && p.classList.contains("pt-children")) {
              p.classList.remove("is-collapsed");
              p.style.display = "";
            }
            if (p.classList && p.classList.contains("pt-node")) {
              p.style.display = "";
              p.hidden = false;
            }
            p = p.parentElement;
          }
        }
      });
      host.querySelectorAll(".pt-node").forEach((node) => {
        const kids = node.querySelector(":scope > .pt-children");
        if (!kids) {
          // leaf-only node
          return;
        }
        const any = [...kids.querySelectorAll(leafSel)].some((r) => r.style.display !== "none" && !r.hidden);
        node.style.display = any ? "" : "none";
        node.hidden = !any;
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
  async function loadRoster(force) {
    if (rosterCache && !force) return rosterCache;
    if (!rosterCache) rosterCache = {};
    try {
      const r = await fetch("data/student-roster.json", { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        Object.keys(j || {}).forEach((y) => {
          Object.keys(j[y] || {}).forEach((c) => {
            if (!rosterCache[y]) rosterCache[y] = {};
            if (!rosterCache[y][c]) rosterCache[y][c] = [];
            (j[y][c] || []).forEach((n) => {
              if (n && !rosterCache[y][c].includes(n)) rosterCache[y][c].push(n);
            });
          });
        });
      }
    } catch (e) {}
    try {
      if (GalleryDB.fetchGalleryFromDb) {
        const g = await GalleryDB.fetchGalleryFromDb();
        (g.students || []).forEach((s) => {
          const y = String(s.angkatan || s.angkatan_year || "");
          const c = String(s.class || s.class_code || "");
          if (!y || !c) return;
          if (!rosterCache[y]) rosterCache[y] = {};
          if (!rosterCache[y][c]) rosterCache[y][c] = [];
          if (s.name && !rosterCache[y][c].includes(s.name)) rosterCache[y][c].push(s.name);
        });
      }
    } catch (e) {}
    try {
      const rows = await GalleryDB.adminListAlumni();
      (rows || []).forEach((al) => {
        const ang = al.gallery_angkatan || {};
        const m = String(ang.label || "").match(/20\d{2}/);
        const y = m ? m[0] : "";
        const c = String(al.class_code || "");
        if (!y || !c) return;
        if (!rosterCache[y]) rosterCache[y] = {};
        if (!rosterCache[y][c]) rosterCache[y][c] = [];
        if (al.name && !rosterCache[y][c].includes(al.name)) rosterCache[y][c].push(al.name);
      });
    } catch (e) {}
    Object.keys(rosterCache).forEach((y) => {
      Object.keys(rosterCache[y]).forEach((c) => {
        rosterCache[y][c].sort((a, b) => a.localeCompare(b, "id"));
      });
    });
    return rosterCache;
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


  function nameOptionsHtml(year, classCode, selected) {
    const y = String(year || "");
    const c = String(classCode || "");
    const roster = rosterCache || {};
    let names = ((roster[y] || {})[c] || []).slice();
    // merge alumniAllCache if present
    try {
      const extra = typeof alumniAllCache !== "undefined" ? alumniAllCache : alumniCache || [];
      (extra || []).forEach((al) => {
        const ang = al.gallery_angkatan || {};
        const m = String(ang.label || "").match(/20\d{2}/);
        const yy = m ? m[0] : "";
        if (yy === y && String(al.class_code || "") === c && al.name && !names.includes(al.name)) {
          names.push(al.name);
        }
      });
    } catch (e) {}
    names = names.slice().sort((a, b) => a.localeCompare(b, "id"));
    const sel = String(selected || "");
    let html = '<option value="">— pilih nama —</option>';
    names.forEach((n) => {
      const s = n === sel ? " selected" : "";
      html += `<option value="${esc(n)}"${s}>${esc(n)}</option>`;
    });
    if (sel && !names.includes(sel)) {
      html += `<option value="${esc(sel)}" selected>${esc(sel)} (lama)</option>`;
    }
    return html;
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

  /** Tree checkbox tri-state (standar: full / partial / empty) */
  function bindTriStateTree(root) {
    if (!root) return;
    root.querySelectorAll(".sh-cb-toggle, .pt-toggle").forEach((b) => {
      b.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Cari anak di sibling dalam .pt-node yang sama (lebih andal daripada query global)
        const row = b.closest(".pt-row") || b.parentElement;
        let kids = row && row.nextElementSibling;
        if (!kids || !kids.classList.contains("pt-children")) {
          const id = b.dataset.t;
          kids = id ? root.querySelector('[data-parent="' + CSS.escape(id) + '"]') : null;
        }
        if (!kids) return;
        kids.classList.toggle("is-collapsed");
        b.textContent = kids.classList.contains("is-collapsed") ? "▸" : "▾";
      };
    });
    function childBoxes(node) {
      return [...node.querySelectorAll('input[type=checkbox][data-sh-cb]')];
    }
    function syncParent(cb) {
      let p = cb.closest("[data-sh-children]");
      while (p) {
        const parentRow = p.previousElementSibling;
        const parentCb = parentRow && parentRow.querySelector('input[type=checkbox][data-sh-cb="group"]');
        if (parentCb) {
          const boxes = childBoxes(p).filter((x) => x.getAttribute("data-sh-cb") === "leaf" || x.getAttribute("data-sh-cb") === "group");
          // only direct? use all descendant leaves
          const leaves = [...p.querySelectorAll('input[type=checkbox][data-sh-cb="leaf"]')];
          const n = leaves.length;
          const c = leaves.filter((x) => x.checked).length;
          parentCb.checked = n > 0 && c === n;
          parentCb.indeterminate = c > 0 && c < n;
        }
        const wrap = p.parentElement && p.parentElement.closest("[data-sh-children]");
        p = wrap;
      }
    }
    root.querySelectorAll('input[type=checkbox][data-sh-cb]').forEach((cb) => {
      cb.addEventListener("change", () => {
        if (cb.getAttribute("data-sh-cb") === "group") {
          const row = cb.closest(".pt-row") || cb.closest(".sh-cb-row");
          const kids = row && row.nextElementSibling && row.nextElementSibling.matches("[data-sh-children]")
            ? row.nextElementSibling
            : null;
          if (kids) {
            kids.querySelectorAll('input[type=checkbox][data-sh-cb]').forEach((x) => {
              x.checked = cb.checked;
              x.indeterminate = false;
            });
          }
          cb.indeterminate = false;
        }
        syncParent(cb);
      });
    });
  }

  function readTreeStudentTargets(root) {
    if (!root) return [];
    return [...root.querySelectorAll('input[type=checkbox][data-sh-cb="leaf"]:checked')].map((cb) => {
      const parts = (cb.getAttribute("data-stu") || "").split("|");
      return { year: parts[0] || "", class: parts[1] || "", name: parts.slice(2).join("|") };
    });
  }

  function setTreeStudentTargets(root, list) {
    if (!root) return;
    const set = new Set((list || []).map((t) => (t.year || "") + "|" + (t.class || t.class_code || "") + "|" + (t.name || "")));
    root.querySelectorAll('input[type=checkbox][data-sh-cb="leaf"]').forEach((cb) => {
      cb.checked = set.has(cb.getAttribute("data-stu") || "");
      cb.indeterminate = false;
    });
    // bubble parents
    root.querySelectorAll('input[type=checkbox][data-sh-cb="group"]').forEach((g) => {
      const row = g.closest(".pt-row") || g.closest(".sh-cb-row");
      const kids = row && row.nextElementSibling;
      if (!kids) return;
      const leaves = [...kids.querySelectorAll('input[type=checkbox][data-sh-cb="leaf"]')];
      const c = leaves.filter((x) => x.checked).length;
      g.checked = leaves.length > 0 && c === leaves.length;
      g.indeterminate = c > 0 && c < leaves.length;
    });
  }

  async function buildStudentCheckTree(hostId, opts) {
    opts = opts || {};
    const host = typeof hostId === "string" ? $(hostId) : hostId;
    if (!host) return;
    host.innerHTML = "<p class='muted'>Memuat daftar siswa…</p>";
    await loadRoster(true);
    const cov = rosterCache || {};
    const years = Object.keys(cov).sort().reverse();
    if (!years.length) {
      host.innerHTML = "<p class='muted'>Roster kosong.</p>";
      return;
    }
    host.innerHTML = years
      .map((y) => {
        const classes = Object.keys(cov[y] || {}).sort();
        const totalY = classes.reduce((n, c) => n + (cov[y][c] || []).length, 0);
        const cHtml = classes
          .map((c) => {
            const names = (cov[y][c] || []).slice();
            const nHtml = names
              .map(
                (n) =>
                  `<label class="sh-cb-row leaf"><input type="checkbox" data-sh-cb="leaf" data-stu="${esc(y)}|${esc(c)}|${esc(n)}"> <span>${esc(n)}</span></label>`
              )
              .join("");
            return `<div class="pt-node">
              <div class="pt-row sh-cb-row">
                <button type="button" class="pt-toggle sh-cb-toggle" data-t="stu-${esc(y)}-${esc(c)}">▸</button>
                <label class="sh-cb-label"><input type="checkbox" data-sh-cb="group"> <strong>Kelas ${esc(c)}</strong> <small class="muted">(${names.length})</small></label>
              </div>
              <div class="pt-children is-collapsed" data-sh-children data-parent="stu-${esc(y)}-${esc(c)}">${nHtml}</div>
            </div>`;
          })
          .join("");
        return `<div class="pt-node">
          <div class="pt-row sh-cb-row">
            <button type="button" class="pt-toggle sh-cb-toggle" data-t="stu-y-${esc(y)}">▾</button>
            <label class="sh-cb-label"><input type="checkbox" data-sh-cb="group"> <strong>Angkatan ${esc(y)}</strong> <small class="muted">(${totalY})</small></label>
          </div>
          <div class="pt-children" data-sh-children data-parent="stu-y-${esc(y)}">${cHtml}</div>
        </div>`;
      })
      .join("");
    bindTriStateTree(host);
    if (opts.selected) setTreeStudentTargets(host, opts.selected);
  }


  function esc(t) {
    return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  }

  /** Tampilkan nama pembuat; hindari email mentah */
  function creatorDisplayName(v) {
    const s = String(v || "").trim();
    if (!s) return "—";
    if (s.includes("@")) {
      const local = s.split("@")[0].replace(/[._]+/g, " ").trim();
      return local || "Pengajar";
    }
    // uuid-like
    if (/^[0-9a-f-]{32,}$/i.test(s)) return "Pengajar";
    return s;
  }


  async function buildAnnStudentTree() {
    // Tree div hierarki sama seperti Absensi: Angkatan → Kelas → Nama + checkbox parent (tri-state)
    const host = $("#annStudentTree");
    if (!host) return;
    host.classList.add("sh-cb-tree");
    host.innerHTML = "<p class='muted'>Memuat daftar siswa…</p>";
    await loadRoster(true);
    const cov = rosterCache || {};
    const years = Object.keys(cov).sort().reverse();
    if (!years.length) {
      host.innerHTML = "<p class='muted'>Daftar siswa kosong. Pastikan roster/alumni di database terisi.</p>";
      return;
    }
    host.innerHTML = years
      .map((y) => {
        const classes = Object.keys(cov[y] || {}).sort();
        const totalY = classes.reduce((n, c) => n + (cov[y][c] || []).length, 0);
        const cHtml = classes
          .map((c) => {
            const names = (cov[y][c] || []).slice();
            const nHtml = names
              .map(
                (n) =>
                  `<label class="sh-cb-row leaf"><input type="checkbox" data-sh-cb="leaf" data-ann-stu="${esc(y)}|${esc(c)}|${esc(n)}" data-stu="${esc(y)}|${esc(c)}|${esc(n)}"> <span>${esc(n)}</span></label>`
              )
              .join("");
            return `<div class="pt-node">
              <div class="pt-row sh-cb-row">
                <button type="button" class="pt-toggle sh-cb-toggle" data-t="ann-${esc(y)}-${esc(c)}">▸</button>
                <label class="sh-cb-label"><input type="checkbox" data-sh-cb="group"> <strong>Kelas ${esc(c)}</strong> <small class="muted">(${names.length})</small></label>
              </div>
              <div class="pt-children is-collapsed" data-sh-children data-parent="ann-${esc(y)}-${esc(c)}">${nHtml || "<p class='muted'>Kosong</p>"}</div>
            </div>`;
          })
          .join("");
        return `<div class="pt-node">
          <div class="pt-row sh-cb-row">
            <button type="button" class="pt-toggle sh-cb-toggle" data-t="ann-y-${esc(y)}">▾</button>
            <label class="sh-cb-label"><input type="checkbox" data-sh-cb="group"> <strong>Angkatan ${esc(y)}</strong> <small class="muted">(${totalY})</small></label>
          </div>
          <div class="pt-children" data-sh-children data-parent="ann-y-${esc(y)}">${cHtml}</div>
        </div>`;
      })
      .join("");
    // Jangan panggil treeToggleBind di sini — bindTriStateTree sudah handle ▸/▾.
    // Dobel handler membuat panah tampak tidak berfungsi (toggle dua kali).
    bindTriStateTree(host);
    host.dataset.built = "1";
  }


  function readAnnTargets() {
    const host = $("#annStudentTree");
    if (!host) return [];
    return [...host.querySelectorAll('input[type=checkbox][data-sh-cb="leaf"][data-ann-stu]:checked')].map((cb) => {
      const parts = (cb.getAttribute("data-ann-stu") || "").split("|");
      return { year: parts[0] || "", class: parts[1] || "", name: parts.slice(2).join("|") };
    });
  }

  function setAnnTargets(list) {
    const host = $("#annStudentTree");
    if (!host) return;
    const set = new Set(
      (list || []).map((t) => (t.year || t.angkatan_year || "") + "|" + (t.class || t.class_code || "") + "|" + (t.name || ""))
    );
    host.querySelectorAll('input[type=checkbox][data-sh-cb="leaf"][data-ann-stu]').forEach((cb) => {
      cb.checked = set.has(cb.getAttribute("data-ann-stu") || "");
      cb.indeterminate = false;
    });
    // sinkron parent (tri-state)
    host.querySelectorAll('input[type=checkbox][data-sh-cb="group"]').forEach((g) => {
      const row = g.closest(".pt-row") || g.closest(".sh-cb-row");
      const kids = row && row.nextElementSibling;
      if (!kids) return;
      const leaves = [...kids.querySelectorAll('input[type=checkbox][data-sh-cb="leaf"]')];
      const c = leaves.filter((x) => x.checked).length;
      g.checked = leaves.length > 0 && c === leaves.length;
      g.indeterminate = c > 0 && c < leaves.length;
    });
  }

  function toLocalInput(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  async function refreshAnnouncements() {
    const host = $("#annList");
    if (!host) return;
    try {
      await buildAnnStudentTree();
      const rows = await GalleryDB.listAnnouncementsAdmin();
      host.innerHTML =
        rows
          .map((r) => {
            const aud =
              r.audience === "students"
                ? "Siswa tertentu (" + ((r.target_students || []).length) + ")"
                : r.audience === "logged_in"
                  ? "User login"
                  : "Publik / depan";
            const creator = creatorDisplayName(r.created_by_name || r.created_by_email || r.created_by);
            return `<div class="admin-row ann-sess-row" data-ann-id="${r.id}">
              <div class="ann-sess-top">
                <div class="ann-sess-title">
                  <strong>${esc(r.title)}</strong>
                  <small class="muted"> · ${esc(aud)} · ${r.active ? "aktif" : "nonaktif"}</small>
                  <span class="att-sess-creator">Dibuat oleh: ${esc(creator)}</span>
                  <br><small class="muted">${esc((r.body_html || "").replace(/<[^>]+>/g, " ").slice(0, 80))}</small>
                </div>
                <div class="ann-sess-actions">
                  <button type="button" class="btn btn-ghost btn-xs" data-ann-stats="${r.id}">Statistik ▾</button>
                  <button type="button" data-edit-ann="${r.id}">Ubah</button>
                  <button type="button" data-del-ann="${r.id}">Hapus</button>
                </div>
              </div>
              <div class="ann-sess-detail" id="annDetail-${r.id}" hidden></div>
            </div>`;
          })
          .join("") || "<p class='muted'>Belum ada pengumuman.</p>";
      bindListSearch("#annSearch", "#annList");
      $$("#annList [data-del-ann]").forEach((b) =>
        b.addEventListener("click", async () => {
          if (!confirm("Hapus pengumuman?")) return;
          await GalleryDB.deleteAnnouncement(b.dataset.delAnn);
          await refreshAnnouncements();
        })
      );
      $$("#annList [data-ann-stats]").forEach((b) =>
        b.addEventListener("click", async () => {
          const id = b.dataset.annStats;
          const panel = $("#annDetail-" + id);
          if (!panel) return;
          if (!panel.hidden) {
            panel.hidden = true;
            b.textContent = "Statistik ▾";
            return;
          }
          panel.hidden = false;
          b.textContent = "Statistik ▴";
          panel.innerHTML = "<p class='muted'>Memuat statistik baca…</p>";
          try {
            const reads = await GalleryDB.listAnnouncementReads(id);
            if (!reads.length) {
              panel.innerHTML = "<p class='muted'>Belum ada catatan baca (siswa login saat tampil / klik pengumuman).</p>";
              return;
            }
            const byClass = {};
            reads.forEach((x) => {
              const k = (x.angkatan_year || "?") + " · K" + (x.class_code || "?");
              if (!byClass[k]) byClass[k] = [];
              byClass[k].push(x);
            });
            let h = "<p class='muted' style='margin:0 0 8px'>Pembaca tercatat: <b>" + reads.length + "</b></p>";
            Object.keys(byClass).sort().forEach((k) => {
              h += "<div class='att-stat-class'><span class='muted'>" + esc(k) + "</span><ul>";
              byClass[k].forEach((x) => {
                h +=
                  "<li>" +
                  esc(x.student_name || x.email || "—") +
                  " <small class='muted'>· " +
                  esc(x.via || "view") +
                  " · " +
                  esc(String(x.read_at || "").replace("T", " ").slice(0, 16)) +
                  "</small></li>";
              });
              h += "</ul></div>";
            });
            panel.innerHTML = h;
          } catch (e) {
            panel.innerHTML = "<p class='muted'>" + esc(e.message || e) + "</p>";
          }
        })
      );
      $$("#annList [data-edit-ann]").forEach((b) =>
        b.addEventListener("click", () => {
          const r = rows.find((x) => String(x.id) === String(b.dataset.editAnn));
          if (!r) return;
          const f = $("#annForm");
          f.querySelector("[name=id]").value = r.id;
          f.querySelector("[name=title]").value = r.title || "";
          $("#annEditor").innerHTML = r.body_html || "";
          f.querySelector("[name=show_home]").checked =
            (r.show_on || "").indexOf("home") >= 0 || r.audience === "public" || r.show_on === "both";
          f.querySelector("[name=show_logged]").checked =
            (r.show_on || "").indexOf("user") >= 0 || r.audience === "logged_in" || r.show_on === "both";
          f.querySelector("[name=show_students]").checked = r.audience === "students";
          $("#annStudentTree").classList.toggle("is-collapsed", r.audience !== "students");
          setAnnTargets(r.target_students || []);
          f.querySelector("[name=starts_at]").value = toLocalInput(r.starts_at);
          f.querySelector("[name=ends_at]").value = toLocalInput(r.ends_at);
          f.querySelector("[name=duration_days]").value = r.duration_days || "";
          f.querySelector("[name=duration_hours]").value = r.duration_hours || "";
          f.querySelector("[name=times_per_day]").value = r.times_per_day || 1;
          f.querySelector("[name=schedule_hours]").value = (r.schedule_hours || []).join(",");
          f.querySelector("[name=splash_seconds]").value = r.splash_seconds || 15;
          f.querySelector("[name=active]").checked = r.active !== false;
          $("#annStatus").textContent = "Mode edit: " + (r.title || "");
          scrollToForm("#annForm");
        })
      );
    } catch (e) {
      host.innerHTML = "<p class='muted'>" + esc(e.message || e) + "</p>";
    }
  }

  function bindAnnouncementForm() {
    const f = $("#annForm");
    if (!f) return;
    // cegah submit native / navigasi
    f.setAttribute("method", "post");
    f.setAttribute("action", "javascript:void(0)");
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
    const studCb = f.querySelector("[name=show_students]");
    if (studCb) {
      studCb.addEventListener("change", async () => {
        const on = studCb.checked;
        const tree = $("#annStudentTree");
        if (!tree) return;
        if (on) {
          tree.classList.remove("is-collapsed");
          tree.style.display = "block";
          await buildAnnStudentTree();
        } else {
          tree.classList.add("is-collapsed");
          tree.style.display = "none";
        }
      });
    }
    const ed = $("#annEditor");
    if (ed) {
      ed.setAttribute("contenteditable", "true");
      ed.tabIndex = 0;
      // cegah handler global mengganggu ketikan
      ["keydown", "keyup", "keypress", "mousedown", "mouseup", "click"].forEach((evName) => {
        ed.addEventListener(evName, (e) => e.stopPropagation(), true);
      });
      ed.addEventListener("paste", (ev) => {
        const items = ev.clipboardData && ev.clipboardData.items;
        if (!items) return;
        for (const it of items) {
          if (it.type && it.type.indexOf("image") === 0) {
            ev.preventDefault();
            const file = it.getAsFile();
            const reader = new FileReader();
            reader.onload = () => {
              document.execCommand("insertHTML", false, '<p><img src="' + reader.result + '" alt="gambar"></p>');
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      });
    }
    const btnImg = $("#annInsertImg");
    if (btnImg)
      btnImg.onclick = () => {
        const url = prompt("URL gambar (https://...)");
        if (!url) return;
        document.execCommand("insertHTML", false, '<p><img src="' + url.replace(/"/g, "") + '" alt=""></p>');
      };
    const btnLink = $("#annInsertLink");
    if (btnLink)
      btnLink.onclick = () => {
        const url = prompt("URL link");
        if (!url) return;
        const label = prompt("Teks link", url) || url;
        document.execCommand(
          "insertHTML",
          false,
          '<a href="' + url.replace(/"/g, "") + '" target="_blank" rel="noopener">' + label + "</a>"
        );
      };
    const btnReset = $("#annReset");
    if (btnReset)
      btnReset.onclick = () => {
        f.reset();
        f.querySelector("[name=id]").value = "";
        $("#annEditor").innerHTML = "";
        $("#annStatus").textContent = "";
        $("#annStudentTree").classList.add("is-collapsed");
      };
    const btnPrev = $("#annPreview");
    if (btnPrev)
      btnPrev.onclick = () => {
        if (window.SHAnnounce) {
          SHAnnounce.showSplash({
            title: f.querySelector("[name=title]").value || "Preview",
            body_html: $("#annEditor").innerHTML,
            splash_seconds: Number(f.querySelector("[name=splash_seconds]").value) || 15,
            id: "preview-" + Date.now(),
            times_per_day: 99,
            active: true,
          });
        }
      };
    async function saveAnnouncement(ev) {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      const fd = new FormData(f);
      const showHome = f.querySelector("[name=show_home]").checked;
      const showLogged = f.querySelector("[name=show_logged]").checked;
      const showStudents = f.querySelector("[name=show_students]").checked;
      let audience = "public";
      let show_on = "home";
      if (showStudents) {
        audience = "students";
        show_on = "user_panel";
      } else if (showLogged && showHome) {
        audience = "public";
        show_on = "both";
      } else if (showLogged) {
        audience = "logged_in";
        show_on = "user_panel";
      } else {
        audience = "public";
        show_on = "home";
      }
      const hoursRaw = String(fd.get("schedule_hours") || "")
        .split(/[,\s]+/)
        .map((x) => parseInt(x, 10))
        .filter((n) => !isNaN(n) && n >= 0 && n <= 23);
      let starts = fd.get("starts_at");
      starts = starts ? new Date(starts).toISOString() : new Date().toISOString();
      let ends = fd.get("ends_at");
      ends = ends ? new Date(ends).toISOString() : null;
      const payload = {
        id: fd.get("id") || null,
        title: fd.get("title"),
        body_html: $("#annEditor").innerHTML,
        audience,
        show_on,
        target_students: showStudents ? readAnnTargets() : [],
        starts_at: starts,
        ends_at: ends,
        duration_days: fd.get("duration_days") ? Number(fd.get("duration_days")) : null,
        duration_hours: fd.get("duration_hours") ? Number(fd.get("duration_hours")) : null,
        times_per_day: Number(fd.get("times_per_day")) || 1,
        schedule_hours: hoursRaw,
        splash_seconds: Number(fd.get("splash_seconds")) || 15,
        active: f.querySelector("[name=active]").checked,
      };
      try {
        await GalleryDB.upsertAnnouncement(payload);
        $("#annStatus").textContent = "Pengumuman disimpan.";
        f.reset();
        f.querySelector("[name=id]").value = "";
        $("#annEditor").innerHTML = "";
        await refreshAnnouncements();
      } catch (e) {
        $("#annStatus").textContent = e.message || String(e);
      }
    }
    f.onsubmit = saveAnnouncement;
    const annSave = $("#annSave");
    if (annSave) annSave.onclick = (e) => { e.preventDefault(); saveAnnouncement(e); };
  }


  let attRecCache = [];

  function attVisibilityInfo(s) {
    const reasons = [];
    if (s.active === false) reasons.push("Sesi nonaktif — siswa tidak melihat sesi ini.");
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
    const wdMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
    const weekday = wdMap[parts.weekday] || 1;
    const date = parts.year + "-" + parts.month + "-" + parts.day;
    const minutes = parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10);
    const toMin = (t) => {
      const p = String(t || "0:0").slice(0, 5).split(":");
      return parseInt(p[0], 10) * 60 + parseInt(p[1] || 0, 10);
    };
    if (s.session_date) {
      if (String(s.session_date).slice(0, 10) !== date) {
        reasons.push("Hari ini bukan tanggal khusus sesi (" + String(s.session_date).slice(0, 10) + ").");
      }
    } else if (s.weekdays && s.weekdays.length) {
      if (s.weekdays.map(Number).indexOf(weekday) < 0) {
        reasons.push("Hari ini tidak termasuk hari berulang yang dipilih.");
      }
    }
    const ci0 = toMin(s.checkin_start);
    const ci1 = toMin(s.checkin_end);
    const co0 = toMin(s.checkout_start);
    const co1 = toMin(s.checkout_end);
    if (minutes < ci0) reasons.push("Belum masuk jam check-in (" + String(s.checkin_start).slice(0, 5) + ").");
    else if (minutes > ci1 && minutes < co0) {
      if (s.allow_late) reasons.push("Lewat batas check-in, tapi izin terlambat aktif — siswa masih bisa check-in (status terlambat).");
      else reasons.push("Lewat batas check-in (" + String(s.checkin_end).slice(0, 5) + ") dan izin terlambat nonaktif.");
    } else if (minutes >= co0 && minutes <= co1) {
      reasons.push("Sekarang jendela check-out (" + String(s.checkout_start).slice(0, 5) + "–" + String(s.checkout_end).slice(0, 5) + ").");
    } else if (minutes > co1) {
      reasons.push("Sudah lewat seluruh jendela absensi hari ini.");
    }
    if (!reasons.length) reasons.push("Dalam jendela waktu yang sesuai — siswa yang ditarget & sudah taut nama seharusnya melihat sesi ini di halaman Absensi.");
    reasons.push("Siswa harus login Google dan menautkan nama di Profil.");
    return reasons;
  }

  function downloadAttCsv(filename, rows) {
    const header = ["sesi", "nama", "angkatan", "kelas", "email", "checkin_at", "checkin_status", "checkin_note", "checkout_at", "checkout_note"];
    const lines = [header.join(",")];
    (rows || []).forEach((r) => {
      const sess = r.gallery_attendance_sessions || {};
      const cell = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
      lines.push(
        [
          cell(sess.title || r.session_id),
          cell(r.student_name),
          cell(r.angkatan_year),
          cell(r.class_code),
          cell(r.email),
          cell(r.checkin_at),
          cell(r.checkin_status),
          cell(r.checkin_note),
          cell(r.checkout_at),
          cell(r.checkout_note),
        ].join(",")
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename || "rekap-absensi.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }


  function attFmtTime(iso) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return String(iso).replace("T", " ").slice(0, 16);
    }
  }

  function attStatusLabel(kind, status, hasAt) {
    if (!hasAt) return "belum";
    if (status === "late") return "terlambat";
    if (status === "on_time" || status === "done" || !status) return "tepat waktu";
    return status;
  }

  async function buildSessionStatsHtml(session) {
    const targets = session.target_students || [];
    let records = [];
    try {
      records = await GalleryDB.listAttendanceRecords({ session_id: session.id });
    } catch (e) {
      return "<p class='muted'>Gagal muat rekap: " + esc(e.message || e) + "</p>";
    }
    const byKey = {};
    records.forEach((r) => {
      const k = (r.angkatan_year || "") + "|" + (r.class_code || "") + "|" + String(r.student_name || "").toLowerCase().trim();
      byKey[k] = r;
    });
    let expected = targets.slice();
    if (!expected.length) {
      expected = records.map((r) => ({ year: r.angkatan_year, class: r.class_code, name: r.student_name }));
    }
    const present = [];
    const missing = [];
    const seen = new Set();
    expected.forEach((t) => {
      const k = (t.year || "") + "|" + (t.class || t.class_code || "") + "|" + String(t.name || "").toLowerCase().trim();
      if (seen.has(k)) return;
      seen.add(k);
      const r = byKey[k];
      if (r && r.checkin_at) present.push({ t, r });
      else missing.push(t);
    });
    records.forEach((r) => {
      const k = (r.angkatan_year || "") + "|" + (r.class_code || "") + "|" + String(r.student_name || "").toLowerCase().trim();
      if (!seen.has(k)) {
        seen.add(k);
        present.push({ t: { year: r.angkatan_year, class: r.class_code, name: r.student_name }, r });
      }
    });

    let nInOk = 0, nInLate = 0, nOutOk = 0, nOutLate = 0, nOutMiss = 0;
    present.forEach(({ r }) => {
      if (r.checkin_status === "late") nInLate++;
      else nInOk++;
      if (r.checkout_at) {
        if (r.checkout_status === "late") nOutLate++;
        else nOutOk++;
      } else if (session.require_checkout !== false) {
        nOutMiss++;
      }
    });

    const group = (arr) => {
      const g = {};
      arr.forEach((item) => {
        const t0 = item.t || item;
        const key = (t0.year || "?") + " · K" + (t0.class || t0.class_code || "?");
        if (!g[key]) g[key] = [];
        g[key].push(item);
      });
      return g;
    };

    function renderPresent(arr) {
      if (!arr.length) return "<p class='muted' style='margin:4px 0'>Sudah absen: —</p>";
      const g = group(arr);
      let h = "<div class='att-stat-block'><strong>Sudah absen (" + arr.length + ")</strong>";
      h += "<p class='muted' style='font-size:12px;margin:4px 0 8px'>Klik nama untuk melihat pesan check-in / check-out</p>";
      Object.keys(g).sort().forEach((k) => {
        h += "<div class='att-stat-class'><span class='muted'>" + esc(k) + "</span><ul class='att-name-list'>";
        g[k].forEach((item, idx) => {
          const t0 = item.t || item;
          const r = item.r;
          const uid = "attn-" + String(session.id).slice(0, 8) + "-" + idx + "-" + Math.random().toString(36).slice(2, 7);
          const inLab = attStatusLabel("in", r.checkin_status, r.checkin_at);
          const outLab = r.checkout_at ? attStatusLabel("out", r.checkout_status, r.checkout_at) : (session.require_checkout === false ? "tidak wajib" : "belum check-out");
          h +=
            "<li class='att-name-item'>" +
            "<button type='button' class='att-name-btn' data-att-note='" + uid + "'>" +
            esc(t0.name || "") +
            " <small class='muted'>(" + esc(inLab) + " / " + esc(outLab) + ")</small>" +
            "</button>" +
            "<div class='att-note-pop' id='" + uid + "' hidden>" +
            "<div><b>Check-in</b> · " + esc(inLab) + " · " + esc(attFmtTime(r.checkin_at)) +
            "<br><span class='att-note-text'>" + esc(r.checkin_note || "(tidak ada pesan)") + "</span></div>" +
            "<div style='margin-top:6px'><b>Check-out</b> · " + esc(outLab) + (r.checkout_at ? " · " + esc(attFmtTime(r.checkout_at)) : "") +
            "<br><span class='att-note-text'>" + esc(r.checkout_note || (r.checkout_at ? "(tidak ada pesan)" : "—")) + "</span></div>" +
            "</div></li>";
        });
        h += "</ul></div>";
      });
      h += "</div>";
      return h;
    }

    function renderMissing(arr) {
      if (!arr.length) return "<p class='muted' style='margin:4px 0'>Belum absen: —</p>";
      const g = group(arr.map((t) => ({ t })));
      let h = "<div class='att-stat-block'><strong>Belum absen (" + arr.length + ")</strong>";
      Object.keys(g).sort().forEach((k) => {
        h += "<div class='att-stat-class'><span class='muted'>" + esc(k) + "</span><ul>";
        g[k].forEach((item) => {
          h += "<li>" + esc((item.t || item).name || "") + "</li>";
        });
        h += "</ul></div>";
      });
      h += "</div>";
      return h;
    }

    return (
      "<div class='att-stats-panel'>" +
      "<p class='att-stat-summary'>" +
      "Check-in tepat <b>" + nInOk + "</b> · terlambat <b>" + nInLate + "</b>" +
      " · Check-out tepat <b>" + nOutOk + "</b> · terlambat <b>" + nOutLate + "</b>" +
      (session.require_checkout !== false ? " · belum out <b>" + nOutMiss + "</b>" : "") +
      " · belum absen <b>" + missing.length + "</b></p>" +
      renderPresent(present) +
      renderMissing(missing) +
      "</div>"
    );
  }


  async function fillAttRecNameOptions() {
    const nameSel = $("#attRecName");
    if (!nameSel || nameSel.tagName !== "SELECT") return;
    await loadRoster(false);
    const kelas = (($("#attRecClass") && $("#attRecClass").value) || "").trim();
    const names = new Set();
    Object.keys(rosterCache || {}).forEach((y) => {
      Object.keys(rosterCache[y] || {}).forEach((c) => {
        if (kelas && String(c) !== kelas) return;
        (rosterCache[y][c] || []).forEach((n) => names.add(n));
      });
    });
    // juga dari cache rekap jika ada
    (window.__attRecCache || []).forEach((r) => {
      if (kelas && String(r.class_code || r.kelas || "") !== kelas) return;
      if (r.student_name || r.name) names.add(r.student_name || r.name);
    });
    const cur = nameSel.value;
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "id"));
    nameSel.innerHTML =
      '<option value="">Semua nama</option>' +
      sorted.map((n) => '<option value="' + esc(n) + '">' + esc(n) + "</option>").join("");
    if (cur) nameSel.value = cur;
  }

  async function refreshAttendance() {
    const host = $("#attSessList");
    if (!host) return;
    try {
      const rows = await GalleryDB.listAttendanceSessionsAdmin();
      // isi dropdown rekap
      const sel = $("#attRecSession");
      if (sel && sel.tagName === "SELECT") {
        const cur = sel.value;
        sel.innerHTML =
          '<option value="">Semua sesi</option>' +
          rows.map((r) => '<option value="' + esc(r.id) + '">' + esc(r.title || r.id) + "</option>").join("");
        if (cur) sel.value = cur;
      }
      host.innerHTML =
        rows
          .map(
            (r) => {
              const creator = creatorDisplayName(r.created_by_name || r.created_by_email || r.created_by);
              const ci = esc(String(r.checkin_start || "").slice(0, 5)) + "–" + esc(String(r.checkin_end || "").slice(0, 5));
              const co = esc(String(r.checkout_start || "").slice(0, 5)) + "–" + esc(String(r.checkout_end || "").slice(0, 5));
              return `<div class="admin-row ann-sess-row att-sess-row" data-att-id="${r.id}">
              <div class="ann-sess-top att-sess-top">
                <div class="ann-sess-title">
                  <strong>${esc(r.title || "Sesi absensi")}</strong>
                  <small class="muted"> · ${r.active === false ? "nonaktif" : "aktif"}${r.allow_late ? " · izin terlambat" : ""}</small>
                  <span class="att-sess-creator">Dibuat oleh: ${esc(creator)}</span>
                </div>
                <div class="att-sess-times" title="Jendela absensi">
                  <div class="att-time-line"><span class="att-time-lab">Check-in</span> <span>${ci}</span></div>
                  <div class="att-time-line"><span class="att-time-lab">Check-out</span> <span>${co}</span></div>
                </div>
                <div class="ann-sess-actions att-sess-actions">
                  <button type="button" class="btn btn-ghost btn-xs" data-att-stats="${r.id}">Statistik ▾</button>
                  <button type="button" class="btn btn-ghost btn-xs" data-att-info="${r.id}">Info</button>
                  <button type="button" class="btn btn-ghost btn-xs" data-att-dl="${r.id}">Unduh CSV</button>
                  <button type="button" data-edit-att="${r.id}">Ubah</button>
                  <button type="button" data-del-att="${r.id}">Hapus</button>
                </div>
              </div>
              <div class="ann-sess-detail" id="attDetail-${r.id}" hidden></div>
            </div>`;
            }
          )
          .join("") || "<p class='muted'>Belum ada sesi absensi.</p>";

      $$("#attSessList [data-del-att]").forEach((b) =>
        b.addEventListener("click", async () => {
          if (!confirm("Hapus sesi absensi?")) return;
          await GalleryDB.deleteAttendanceSession(b.dataset.delAtt);
          await refreshAttendance();
        })
      );
      $$("#attSessList [data-edit-att]").forEach((b) =>
        b.addEventListener("click", () => {
          const r = rows.find((x) => String(x.id) === String(b.dataset.editAtt));
          if (!r) return;
          const f = $("#attSessForm");
          f.querySelector("[name=id]").value = r.id;
          f.querySelector("[name=title]").value = r.title || "";
          f.querySelector("[name=subject_code]").value = r.subject_code || "SMM";
          f.querySelector("[name=subject_label]").value = r.subject_label || "";
          f.querySelector("[name=session_date]").value = r.session_date ? String(r.session_date).slice(0, 10) : "";
          f.querySelector("[name=checkin_start]").value = String(r.checkin_start || "").slice(0, 5);
          f.querySelector("[name=checkin_end]").value = String(r.checkin_end || "").slice(0, 5);
          f.querySelector("[name=checkout_start]").value = String(r.checkout_start || "").slice(0, 5);
          f.querySelector("[name=checkout_end]").value = String(r.checkout_end || "").slice(0, 5);
          f.querySelector("[name=require_checkout]").checked = r.require_checkout !== false;
          const al = f.querySelector("[name=allow_late]");
          if (al) al.checked = !!r.allow_late;
          f.querySelector("[name=active]").checked = r.active !== false;
          $$("#attSessForm [name=wd]").forEach((cb) => {
            cb.checked = (r.weekdays || []).map(Number).indexOf(Number(cb.value)) >= 0;
          });
          buildStudentCheckTree("#attStudentTree", { selected: r.target_students || [] }).then(() => {
            $("#attSessMsg").textContent = "Mode edit: " + (r.title || "");
            scrollToForm("#attSessForm");
          });
        })
      );
      $$("#attSessList [data-att-stats]").forEach((b) =>
        b.addEventListener("click", async () => {
          const id = b.dataset.attStats;
          const panel = $("#attDetail-" + id);
          if (!panel) return;
          // tutup info sibling label
          const infoBtn = panel.parentElement && panel.parentElement.querySelector("[data-att-info]");
          if (!panel.hidden && panel.dataset.mode === "stats") {
            panel.hidden = true;
            b.textContent = "Statistik ▾";
            return;
          }
          panel.hidden = false;
          panel.dataset.mode = "stats";
          b.textContent = "Statistik ▴";
          if (infoBtn) infoBtn.textContent = "Info";
          panel.innerHTML = "<p class='muted'>Memuat statistik…</p>";
          const r = rows.find((x) => String(x.id) === String(id));
          panel.innerHTML = await buildSessionStatsHtml(r || { id });
          panel.querySelectorAll("[data-att-note]").forEach((nb) => {
            nb.addEventListener("click", () => {
              const pop = document.getElementById(nb.getAttribute("data-att-note"));
              if (!pop) return;
              const open = pop.hidden;
              panel.querySelectorAll(".att-note-pop").forEach((x) => { x.hidden = true; });
              pop.hidden = !open;
            });
          });
        })
      );
      $$("#attSessList [data-att-info]").forEach((b) =>
        b.addEventListener("click", () => {
          const id = b.dataset.attInfo;
          const panel = $("#attDetail-" + id);
          const r = rows.find((x) => String(x.id) === String(id));
          if (!panel || !r) return;
          const statsBtn = panel.parentElement && panel.parentElement.querySelector("[data-att-stats]");
          if (!panel.hidden && panel.dataset.mode === "info") {
            panel.hidden = true;
            b.textContent = "Info";
            return;
          }
          panel.hidden = false;
          panel.dataset.mode = "info";
          b.textContent = "Info ▴";
          if (statsBtn) statsBtn.textContent = "Statistik ▾";
          const reasons = attVisibilityInfo(r);
          panel.innerHTML =
            "<div class='att-info-panel'><strong>Kenapa sesi ini mungkin tidak tampil di layar siswa?</strong><ul>" +
            reasons.map((x) => "<li>" + esc(x) + "</li>").join("") +
            "</ul></div>";
        })
      );
      $$("#attSessList [data-att-dl]").forEach((b) =>
        b.addEventListener("click", async () => {
          const id = b.dataset.attDl;
          const r = rows.find((x) => String(x.id) === String(id));
          b.textContent = "…";
          try {
            const recs = await GalleryDB.listAttendanceRecords({ session_id: id });
            const safe = String((r && r.title) || "sesi").replace(/[^\w\-]+/g, "_").slice(0, 40);
            downloadAttCsv("absensi-" + safe + ".csv", recs);
          } catch (e) {
            alert(e.message || String(e));
          }
          b.textContent = "Unduh CSV";
        })
      );
    } catch (e) {
      host.innerHTML = "<p class='muted'>" + esc(e.message || e) + "</p>";
    }
  }

  function normTime(v, fallback) {
    const s = String(v || "").trim();
    if (!s) return fallback;
    // HTML time → HH:MM or HH:MM:SS
    const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return fallback;
    const hh = String(Math.min(23, parseInt(m[1], 10))).padStart(2, "0");
    const mm = String(Math.min(59, parseInt(m[2], 10))).padStart(2, "0");
    const ss = m[3] ? String(Math.min(59, parseInt(m[3], 10))).padStart(2, "0") : "00";
    return hh + ":" + mm + ":" + ss;
  }

  function bindAttendanceAdmin() {
    buildStudentCheckTree("#attStudentTree");
    // Checkbox master: tampilkan / sembunyikan tree (posisi kiri, rapi)
    const master = $("#attShowStudentTree");
    const treeHost = $("#attStudentTree");
    if (master && treeHost) {
      const syncTreeVis = () => {
        if (master.checked) {
          treeHost.style.display = "block";
          treeHost.classList.remove("is-collapsed");
        } else {
          treeHost.style.display = "none";
          treeHost.classList.add("is-collapsed");
        }
      };
      master.addEventListener("change", syncTreeVis);
      syncTreeVis();
    }
    const save = $("#attSessSave");
    if (!save) return;
    if (save.dataset.boundAttSave === "1") return;
    save.dataset.boundAttSave = "1";
    save.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const f = $("#attSessForm");
      const msg = $("#attSessMsg");
      if (msg) { msg.style.color = "#9db5c0"; msg.textContent = "Memproses…"; }
      if (!f) {
        if (msg) { msg.style.color = "#ff8a8a"; msg.textContent = "Form absensi tidak ditemukan."; }
        return;
      }
      const titleEl = f.querySelector("[name=title]");
      const title = (titleEl && titleEl.value || "").trim();
      if (!title) {
        if (msg) {
          msg.style.color = "#ff8a8a";
          msg.textContent = "Judul sesi wajib diisi.";
        }
        if (titleEl) titleEl.focus();
        return;
      }
      const weekdays = $$("#attSessForm [name=wd]:checked").map((c) => Number(c.value));
      const sessionDate = (f.querySelector("[name=session_date]") && f.querySelector("[name=session_date]").value) || "";
      if (!sessionDate && !weekdays.length) {
        if (msg) {
          msg.style.color = "#ff8a8a";
          msg.textContent = "Pilih minimal satu hari berulang, atau isi tanggal khusus.";
        }
        return;
      }
      // Pastikan leaf tercentang mengikuti parent yang dicentang (jaga-jaga)
      const tree = $("#attStudentTree");
      if (tree) {
        tree.querySelectorAll('input[type=checkbox][data-sh-cb="group"]:checked').forEach((g) => {
          const row = g.closest(".pt-row");
          const kids = row && row.nextElementSibling;
          if (kids) kids.querySelectorAll('input[type=checkbox][data-sh-cb]').forEach((x) => { x.checked = true; x.indeterminate = false; });
        });
      }
      const useTree = !master || master.checked;
      let targets = useTree ? readTreeStudentTargets(tree) : [];
      const years = [...new Set(targets.map((t) => String(t.year || "")).filter(Boolean))];
      const classes = [...new Set(targets.map((t) => String(t.class || "")).filter(Boolean))];
      const idVal = (f.querySelector("[name=id]") && f.querySelector("[name=id]").value) || "";
      const payload = {
        id: idVal || null,
        title,
        subject_code: (f.querySelector("[name=subject_code]") && f.querySelector("[name=subject_code]").value) || "SMM",
        subject_label: (f.querySelector("[name=subject_label]") && f.querySelector("[name=subject_label]").value) || "Social Media Marketing",
        session_date: sessionDate || null,
        weekdays,
        checkin_start: normTime(f.querySelector("[name=checkin_start]") && f.querySelector("[name=checkin_start]").value, "07:00:00"),
        checkin_end: normTime(f.querySelector("[name=checkin_end]") && f.querySelector("[name=checkin_end]").value, "07:15:00"),
        checkout_start: normTime(f.querySelector("[name=checkout_start]") && f.querySelector("[name=checkout_start]").value, "08:20:00"),
        checkout_end: normTime(f.querySelector("[name=checkout_end]") && f.querySelector("[name=checkout_end]").value, "08:40:00"),
        target_years: years,
        target_classes: classes,
        target_students: targets,
        audience: targets.length ? "students" : "all_linked",
        require_checkout: !!(f.querySelector("[name=require_checkout]") && f.querySelector("[name=require_checkout]").checked),
        allow_late: !!(f.querySelector("[name=allow_late]") && f.querySelector("[name=allow_late]").checked),
        active: !!(f.querySelector("[name=active]") && f.querySelector("[name=active]").checked),
      };
      save.disabled = true;
      const prevLabel = save.textContent;
      save.textContent = "Menyimpan…";
      if (msg) {
        msg.style.color = "";
        msg.textContent = "Menyimpan sesi… (" + (targets.length ? targets.length + " siswa" : "semua yang sudah taut nama") + ")";
      }
      try {
        const saved = await GalleryDB.upsertAttendanceSession(payload);
        if (msg) {
          msg.style.color = "#7dffb3";
          msg.textContent = "Sesi disimpan: " + (saved && saved.title ? saved.title : title);
        }
        f.querySelector("[name=id]").value = "";
        if (titleEl) titleEl.value = "";
        await refreshAttendance();
      } catch (e) {
        console.error("upsertAttendanceSession", e);
        const detail = (e && (e.message || e.details || e.hint || e.code)) || String(e);
        if (msg) {
          msg.style.color = "#ff8a8a";
          msg.textContent = "Gagal simpan: " + detail;
        }
        try { alert("Gagal simpan sesi absensi:\n" + detail); } catch (_) {}
      } finally {
        save.disabled = false;
        save.textContent = prevLabel;
      }
    });
    $("#attSessReset") &&
      ($("#attSessReset").onclick = () => {
        $("#attSessForm").reset();
        $("#attSessForm [name=id]").value = "";
        const msg = $("#attSessMsg");
        if (msg) { msg.style.color = ""; msg.textContent = ""; }
      });
    $("#attRecLoad") &&
      ($("#attRecLoad").onclick = async () => {
        const host = $("#attRecList");
        host.innerHTML = "Memuat…";
        try {
          await fillAttRecNameOptions();
          attRecCache = await GalleryDB.listAttendanceRecords({
            session_id: ($("#attRecSession") || {}).value || null,
            class_code: ($("#attRecClass") || {}).value || null,
            student_name: ($("#attRecName") || {}).value || null,
          });
          host.innerHTML =
            attRecCache
              .map((r) => {
                const sess = r.gallery_attendance_sessions || {};
                return `<div class="admin-row"><div><strong>${esc(r.student_name)}</strong> · K${esc(r.class_code)} · ${esc(r.angkatan_year)}
                  <br><small class="muted">${esc(sess.title || r.session_id)} · in ${esc(r.checkin_at || "—")} · out ${esc(r.checkout_at || "—")}
                  <br>In: ${esc(r.checkin_note || "")} · Out: ${esc(r.checkout_note || "")}</small></div></div>`;
              })
              .join("") || "<p class='muted'>Tidak ada data.</p>";
        } catch (e) {
          host.innerHTML = "<p class='muted'>" + esc(e.message || e) + "</p>";
        }
      });
    $("#attRecCsv") &&
      ($("#attRecCsv").onclick = () => {
        if (!attRecCache.length) return alert("Muat rekap dulu");
        const lines = [
          ["student_name", "class", "year", "email", "session", "checkin_at", "checkin_note", "checkout_at", "checkout_note"].join(","),
        ];
        attRecCache.forEach((r) => {
          const sess = r.gallery_attendance_sessions || {};
          const cell = (x) => '"' + String(x || "").replace(/"/g, '""') + '"';
          lines.push(
            [r.student_name, r.class_code, r.angkatan_year, r.email, sess.title || r.session_id, r.checkin_at, r.checkin_note, r.checkout_at, r.checkout_note]
              .map(cell)
              .join(",")
          );
        });
        const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "absensi-" + new Date().toISOString().slice(0, 10) + ".csv";
        a.click();
      });
  }


  function bindBulkStudentImport() {
    const msg = () => $("#bulkStuMsg");
    const tpl = $("#btnStuTplCsv");
    if (tpl) {
      tpl.onclick = () => {
        const csv = "angkatan,kelas,nama\n2025,51,Contoh Nama Satu\n2025,52,Contoh Nama Dua\n";
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "template-data-siswa.csv";
        a.click();
      };
    }
    const btn = $("#btnBulkStuImport");
    if (!btn) return;
    btn.onclick = async () => {
      if (msg()) msg().textContent = "Mengimpor…";
      try {
        let result;
        const fileInput = $("#bulkStuFile");
        const file = fileInput && fileInput.files && fileInput.files[0];
        if (file) {
          const text = await file.text();
          result = await GalleryDB.importStudentsBulkFromCsvText(text);
        } else {
          const sheet = (($("#bulkStuSheet") && $("#bulkStuSheet").value) || "").trim();
          if (!sheet) throw new Error("Isi URL/ID Sheet atau pilih file CSV");
          const gid = (($("#bulkStuGid") && $("#bulkStuGid").value) || "").trim();
          result = await GalleryDB.importStudentsBulkFromSheet(sheet, gid || "0");
        }
        const errN = (result.errors || []).length;
        if (msg())
          msg().textContent =
            "Selesai: +" + result.added + " baru, " + result.skipped + " dilewati (sudah ada/kosong)" +
            (errN ? ", " + errN + " error" : "") +
            " · total baris " + result.total;
        if (errN && result.errors[0]) console.warn(result.errors);
        window.__adminTabLoaded && (window.__adminTabLoaded.alumni = false);
        if (typeof refreshAlumni === "function") await refreshAlumni();
        window.__adminAlumniLite = null;
        if (typeof loadRoster === "function") await loadRoster(true);
      } catch (e) {
        if (msg()) msg().textContent = e.message || String(e);
      }
    };
  }

  async function boot() {
    const gate = $("#gate");
    const panel = $("#panel");
    if (!GalleryDB.enabled()) {
      $("#gateMsg").textContent = "Database belum dikonfigurasi.";
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
        const tab = btn.dataset.tab;
        if (tab === "videos") refreshVideos().catch(console.warn);
        if (tab === "websites") refreshWebs().catch(console.warn);
        if (tab === "alumni") refreshAlumni().catch(console.warn);
        if (tab === "angkatan") refreshAngkatan().catch(console.warn);
        if (tab === "links") refreshLinks().catch(console.warn);
        if (tab === "users") refreshUsers().catch(console.warn);
        if (tab === "designs") { bindDesignsAdmin(); refreshDesigns().catch(console.warn); }
        if (tab === "announce") refreshAnnouncements().catch(console.warn);
        if (tab === "attendance") { refreshAttendance().catch(console.warn); buildStudentCheckTree("#attStudentTree"); }
      })
    );

    bindForms(session);
    bindAnnouncementForm();
    bindAttendanceAdmin();
    bindBulkStudentImport();
    const attCls = $("#attRecClass");
    if (attCls) attCls.addEventListener("change", () => fillAttRecNameOptions());
    fillAttRecNameOptions();
    bindDesignsAdmin();
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
        if (msg()) msg().textContent = "Menjalankan AI (fungsi server)…";
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

    // Muat ringan dulu; list berat (video/web) lazy saat tab dibuka
    try {
      await Promise.all([refreshCats(), refreshAngkatan()]);
    } catch (e) {
      console.warn(e);
    }
    // preload tab aktif (video) di background
    refreshVideos().catch((e) => console.warn("videos", e));
    // sisanya on-demand
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
        angkatanId: fd.get("angkatanId") || null,
        classCode: fd.get("classCode") || "",
        role: fd.get("role") || "Santriwati",
      };
      try {
        await GalleryDB.adminUpsertAlumni(payload);
        $("#alumniStatus").textContent = payload.id ? "User diperbarui." : "User ditambah.";
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
    ($("#btnSaveAdmin")||{}).onclick = async () => {
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
    ($("#btnRevokeAdmin")||{}).onclick = async () => {
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
    const host = $("#vidList");
    if (host) host.innerHTML = "<p class='muted'>Memuat video…</p>";
    let rows = [];
    try {
      rows = await GalleryDB.listVideos();
    } catch (e) {
      if (host) host.innerHTML = "<p class='muted'>Gagal muat video: " + esc(e.message || e) + "</p>";
      return;
    }
    videoCache = rows || [];
    function countDeep(obj) {
      if (Array.isArray(obj)) return obj.length;
      if (!obj || typeof obj !== "object") return 0;
      return Object.keys(obj).reduce((n, k) => n + countDeep(obj[k]), 0);
    }
    // meta siswa ringan (alumni + cache)
    let students = [];
    try {
      if (!window.__adminAlumniLite) {
        const al = await GalleryDB.adminListAlumni();
        window.__adminAlumniLite = (al || []).map((x) => {
          const ang = x.gallery_angkatan || {};
          const m = String(ang.label || "").match(/20\d{2}/);
          return { name: x.name, class: x.class_code, angkatan: m ? m[0] : "" };
        });
      }
      students = window.__adminAlumniLite || [];
    } catch (e) {
      console.warn("alumni lite", e);
    }
    const nameIndex = {};
    students.forEach((s) => {
      if (s.name) nameIndex[String(s.name).toLowerCase()] = s;
    });
    function metaFor(v) {
      const on = v.owner_name || "";
      const hit = nameIndex[on.toLowerCase()];
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
        <div>
          <a href="#" class="admin-link-preview" data-preview-vid="${v.id}"><strong>${esc(v.title)}</strong></a>
          <br><small class="muted">${esc(v.platform || "")}</small>
        </div>
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
                    <div class="pt-row"><button type="button" class="pt-toggle" data-t="v-${esc(cat)}-${esc(y)}-${esc(c)}">▸</button><strong>Kelas ${esc(c)}</strong> <small class="muted pt-count">(${countDeep(root[cat][y][c])})</small></div>
                    <div class="pt-children is-collapsed" data-parent="v-${esc(cat)}-${esc(y)}-${esc(c)}">${nHtml}</div>
                  </div>`;
                })
                .join("");
              return `<div class="pt-node">
                <div class="pt-row"><button type="button" class="pt-toggle" data-t="v-${esc(cat)}-${esc(y)}">▸</button><strong>Angkatan ${esc(y)}</strong> <small class="muted pt-count">(${countDeep(root[cat][y])})</small></div>
                <div class="pt-children is-collapsed" data-parent="v-${esc(cat)}-${esc(y)}">${cHtml}</div>
              </div>`;
            })
            .join("");
          return `<div class="pt-node" style="margin-bottom:12px">
            <div class="pt-row"><button type="button" class="pt-toggle" data-t="v-cat-${esc(cat)}">▸</button><strong>${esc(cat)}</strong> <small class="muted pt-count">(${countDeep(root[cat])})</small></div>
            <div class="pt-children is-collapsed" data-parent="v-cat-${esc(cat)}">${yHtml}</div>
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
    $$("#vidList [data-preview-vid]").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.preventDefault();
        const v = videoCache.find((x) => String(x.id) === String(b.dataset.previewVid));
        if (!v || !window.SHPreview) return;
        SHPreview.previewVideo({
          title: v.title,
          url: v.url,
          description: v.description || "",
          owner: v.owner_name || "",
        });
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
    const host = $("#webList");
    if (host) host.innerHTML = "<p class='muted'>Memuat website…</p>";
    let rows = [];
    try {
      rows = await GalleryDB.adminListWebsites();
    } catch (e) {
      if (host) host.innerHTML = "<p class='muted'>Gagal muat website: " + esc(e.message || e) + "</p>";
      return;
    }
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
                      <div><a href="${esc(w.url || '#')}" target="_blank" rel="noopener noreferrer" class="admin-link-open"><strong>${esc((w.title || "").replace(/\s*[·•\-]\s*Domain\s*$/i, "").replace(/\bDomain\b/gi, "").trim() || nm)}</strong></a><br><small>${esc(w.url)}</small></div>
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
              const siteCount = names.reduce((n, nm) => n + tree[y][c][nm].length, 0);
              return `<div class="pt-node">
                <div class="pt-row"><button type="button" class="pt-toggle" data-t="w-${esc(y)}-${esc(c)}">▸</button><strong>Kelas ${esc(c)}</strong> <small class="muted">(${siteCount})</small></div>
                <div class="pt-children is-collapsed" data-parent="w-${esc(y)}-${esc(c)}">${nHtml}</div>
              </div>`;
            })
            .join("");
          const yearCount = classes.reduce((n, c) => {
            return n + Object.keys(tree[y][c] || {}).reduce((m, nm) => m + (tree[y][c][nm] || []).length, 0);
          }, 0);
          return `<div class="pt-node" style="margin-bottom:10px">
            <div class="pt-row"><button type="button" class="pt-toggle" data-t="w-y-${esc(y)}">▸</button><strong>Angkatan ${esc(y)}</strong> <small class="muted">(${yearCount})</small></div>
            <div class="pt-children is-collapsed" data-parent="w-y-${esc(y)}">${cHtml}</div>
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
    const host = $("#alumniList");
    if (host) host.innerHTML = "<p class='muted'>Memuat semua pengguna…</p>";
    let rows = [];
    try {
      rows = await GalleryDB.adminListAlumni();
    } catch (e) {
      if (host) host.innerHTML = "<p class='muted'>Gagal muat: " + esc(e.message || e) + "</p>";
      return;
    }
    alumniAllCache = rows || [];
    // Tab Users: SEMUA entri (siswa semua angkatan + alumni + pengajar), bukan filter Juli+3
    alumniCache = alumniAllCache.slice();
    await fillAlumniSelects();

    function roleKey(a) {
      const r = String(a.role || "").toLowerCase();
      if (r.includes("ajar") || r === "teacher" || r === "pengajar") return "pengajar";
      if (r.includes("admin")) return "admin";
      if (r === "alumni" || r.includes("alumni")) return "alumni";
      return "siswa";
    }
    function yearOf(a) {
      const ang = a.gallery_angkatan || {};
      const m = String(ang.label || "").match(/20\d{2}/);
      return m ? m[0] : "";
    }
    function statusLabel(a) {
      const y = yearOf(a);
      const rk = roleKey(a);
      if (rk === "pengajar") return "Pengajar";
      if (rk === "admin") return "Admin";
      if (rk === "alumni" || (y && isAlumniCohort(y))) return "Alumni";
      if (y) {
        const nowY = new Date().getFullYear();
        if (parseInt(y, 10) === nowY - 1) return "Kakak kelas";
        if (parseInt(y, 10) >= nowY) return "Siswa aktif";
        return "Alumni cohort";
      }
      return a.role || "User";
    }

    // tree: group -> year|special -> class -> people
    // Groups: Pengajar (no year), then years descending, then tanpa angkatan
    const pengajar = [];
    const byYear = {};
    const noYear = [];
    alumniCache.forEach((a) => {
      const rk = roleKey(a);
      if (rk === "pengajar") {
        pengajar.push(a);
        return;
      }
      const y = yearOf(a);
      if (!y) {
        noYear.push(a);
        return;
      }
      const c = a.class_code || "—";
      if (!byYear[y]) byYear[y] = {};
      if (!byYear[y][c]) byYear[y][c] = [];
      byYear[y][c].push(a);
    });

    function leafRow(a) {
      const y = yearOf(a);
      const st = statusLabel(a);
      const school = a.school ? " · " + esc(a.school) : "";
      const search = [a.name, a.class_code, y, a.role, a.school, st].filter(Boolean).join(" ");
      return `<label class="admin-row user-leaf" data-search-row data-search="${esc(search)}" style="cursor:default">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
          <input type="checkbox" data-sh-cb="leaf" data-user-id="${a.id}">
          <div style="min-width:0">
            <strong>${esc(a.name)}</strong>
            <br><small class="muted">${esc(st)}${a.class_code ? " · Kelas " + esc(a.class_code) : ""}${y ? " · " + esc(y) : ""}${school}</small>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button type="button" data-edit-al="${a.id}">Ubah</button>
          <button type="button" data-del-al="${a.id}">Hapus</button>
        </div>
      </label>`;
    }

    function classBranch(y, c, list) {
      const id = "al-" + y + "-" + c;
      const rows = list
        .slice()
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", "id"))
        .map(leafRow)
        .join("");
      return `<div class="pt-node">
        <div class="pt-row sh-stu-row">
          <button type="button" class="pt-toggle sh-cb-toggle" data-t="${esc(id)}">▸</button>
          <label class="sh-stu-group"><input type="checkbox" data-sh-cb="group"> <strong>Kelas ${esc(c)}</strong> <small class="muted">(${list.length})</small></label>
        </div>
        <div class="pt-children is-collapsed" data-sh-children data-parent="${esc(id)}">${rows}</div>
      </div>`;
    }

    function yearBranch(y, classesObj) {
      const classes = Object.keys(classesObj).sort();
      const total = classes.reduce((n, c) => n + classesObj[c].length, 0);
      const id = "al-y-" + y;
      const cHtml = classes.map((c) => classBranch(y, c, classesObj[c])).join("");
      return `<div class="pt-node" style="margin-bottom:10px">
        <div class="pt-row sh-stu-row">
          <button type="button" class="pt-toggle sh-cb-toggle" data-t="${esc(id)}">▾</button>
          <label class="sh-stu-group"><input type="checkbox" data-sh-cb="group"> <strong>Angkatan ${esc(y)}</strong> <small class="muted">(${total})</small></label>
        </div>
        <div class="pt-children" data-sh-children data-parent="${esc(id)}">${cHtml}</div>
      </div>`;
    }

    let html = "";
    const totalAll = alumniCache.length;
    html += `<p class="muted admin-one-line" style="font-size:13px;margin:0 0 10px">Total di list: <b>${totalAll}</b> · Angkatan: <b>${Object.keys(byYear).length}</b> · Pengajar: <b>${pengajar.length}</b></p>`;

    if (pengajar.length) {
      const id = "al-pengajar";
      const rows = pengajar
        .slice()
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", "id"))
        .map(leafRow)
        .join("");
      html += `<div class="pt-node" style="margin-bottom:10px">
        <div class="pt-row sh-stu-row">
          <button type="button" class="pt-toggle sh-cb-toggle" data-t="${esc(id)}">▾</button>
          <label class="sh-stu-group"><input type="checkbox" data-sh-cb="group"> <strong>Pengajar</strong> <small class="muted">(${pengajar.length})</small></label>
        </div>
        <div class="pt-children" data-sh-children data-parent="${esc(id)}">${rows}</div>
      </div>`;
    }

    Object.keys(byYear)
      .sort()
      .reverse()
      .forEach((y) => {
        html += yearBranch(y, byYear[y]);
      });

    if (noYear.length) {
      const id = "al-noyear";
      const rows = noYear
        .slice()
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", "id"))
        .map(leafRow)
        .join("");
      html += `<div class="pt-node" style="margin-bottom:10px">
        <div class="pt-row sh-stu-row">
          <button type="button" class="pt-toggle sh-cb-toggle" data-t="${esc(id)}">▾</button>
          <label class="sh-stu-group"><input type="checkbox" data-sh-cb="group"> <strong>Tanpa angkatan</strong> <small class="muted">(${noYear.length})</small></label>
        </div>
        <div class="pt-children" data-sh-children data-parent="${esc(id)}">${rows}</div>
      </div>`;
    }

    if (!totalAll) html = "<p class='muted'>Belum ada data pengguna. Tambah lewat form di atas atau bulk upload.</p>";

    $("#alumniList").innerHTML = html;
    treeToggleBind($("#alumniList"));
    if (typeof bindTriStateTree === "function") bindTriStateTree($("#alumniList"));
    bindListSearch("#alumniSearch", "#alumniList");
    $$("#alumniList [data-del-al]").forEach((b) =>
      b.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Hapus user ini beserta website terkait?")) return;
        try {
          await GalleryDB.adminDeleteAlumni(b.dataset.delAl);
          await refreshAlumni();
          await refreshWebs();
        } catch (err) {
          alert(err.message || err);
        }
      })
    );
    $$("#alumniList [data-edit-al]").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const a = alumniCache.find((x) => String(x.id) === String(b.dataset.editAl));
        if (!a) return;
        const f = $("#alumniForm");
        f.querySelector("[name=id]").value = a.id;
        f.querySelector("[name=name]").value = a.name || "";
        const cls = f.querySelector("[name=classCode]");
        if (cls) cls.value = a.class_code || "";
        const ang = f.querySelector("[name=angkatanId]");
        if (ang && a.angkatan_id) ang.value = a.angkatan_id;
        const role = f.querySelector("[name=role]");
        if (role) {
          const r = a.role || "Santriwati";
          if ([...role.options].some((o) => o.value === r)) role.value = r;
          else role.value = "Santriwati";
        }
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
                  return `<div class="admin-row link-row" style="margin:4px 0;flex-direction:column;align-items:stretch">
                    <div class="link-row-top" style="display:flex;justify-content:space-between;gap:8px;align-items:center;width:100%">
                      <div class="link-row-info"><strong>${sn}</strong><br><small>${who}</small></div>
                      <div class="link-row-actions" style="display:flex;gap:6px;flex-shrink:0">
                        <button type="button" class="btn btn-ghost" data-edit-link="${r.id}" style="padding:6px 10px;font-size:12px">Ubah</button>
                        <button type="button" class="btn btn-ghost" data-unlink="${r.id}" style="padding:6px 10px;font-size:12px">Lepas</button>
                      </div>
                    </div>
                    <div class="link-edit-panel is-collapsed" data-edit-panel="${r.id}" style="margin-top:8px;margin-right:auto;max-width:100%;padding:10px;border:1px dashed rgba(125,227,255,.25);border-radius:10px">
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
                <div class="pt-row"><button type="button" class="pt-toggle" data-t="c-${y}-${c}">▸</button><strong>Kelas ${esc(c)}</strong> <small class="muted">(${tree[y][c].length} tautan)</small></div>
                <div class="pt-children is-collapsed" data-parent="c-${y}-${c}">${list}</div>
              </div>`;
            })
            .join("");
          return `<div class="pt-node" style="margin-bottom:10px">
            <div class="pt-row"><button type="button" class="pt-toggle" data-t="y-${y}">▸</button><strong>Angkatan ${esc(y)}</strong> <small class="muted">(${Object.values(tree[y]).reduce((n,a)=>n+a.length,0)} tautan)</small></div>
            <div class="pt-children is-collapsed" data-parent="y-${y}">${classHtml}</div>
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
          if (!panel) return;
          panel.classList.toggle("is-collapsed");
          const open = !panel.classList.contains("is-collapsed");
          b.textContent = open ? "Tutup" : "Ubah";
          if (open) {
            panel.querySelectorAll("select").forEach((sel) => {
              if (sel.onchange) sel.onchange();
            });
          }
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
      await loadRoster(true);
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
            `<div class="pt-node"><div class="pt-row"><button type="button" class="pt-toggle" data-t="link-siswa-belum">▸</button><strong>Siswa belum tertaut akun Google</strong> <small class="muted">(${cov.unlinkedStudents.length})</small></div><div class="pt-children" data-parent="link-siswa-belum">` +
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


  function bindUserCleanup() {
    const selAll = $("#userCleanupSelectAll");
    if (selAll && !selAll.dataset.bound) {
      selAll.dataset.bound = "1";
      selAll.addEventListener("change", () => {
        $$(".user-cleanup-cb").forEach((cb) => { cb.checked = selAll.checked; });
      });
    }
    const del = $("#userCleanupDelete");
    if (del && !del.dataset.bound) {
      del.dataset.bound = "1";
      del.addEventListener("click", async () => {
        const ids = $$(".user-cleanup-cb:checked").map((c) => c.getAttribute("data-cleanup-id")).filter(Boolean);
        const msg = $("#userCleanupMsg");
        if (!ids.length) {
          if (msg) msg.textContent = "Centang dulu akun yang akan dihapus.";
          return;
        }
        if (!confirm("Hapus " + ids.length + " akun belum disetujui dari database profil?")) return;
        try {
          const r = await GalleryDB.deleteUserProfiles(ids);
          if (msg) msg.textContent = "Dihapus: " + (r.removed || 0) + " akun.";
          await refreshUsers();
        } catch (e) {
          if (msg) msg.textContent = e.message || String(e);
        }
      });
    }
    const auto = $("#userAutoCleanup");
    if (auto && !auto.dataset.bound) {
      auto.dataset.bound = "1";
      GalleryDB.getAppSetting("auto_cleanup_unapproved").then((s) => {
        if (s && s.value && s.value.enabled) auto.checked = true;
      }).catch(() => {});
      auto.addEventListener("change", async () => {
        try {
          await GalleryDB.setAppSetting("auto_cleanup_unapproved", {
            enabled: auto.checked,
            schedule: "Thu 23:00 & Sun 23:00 Asia/Jakarta",
          });
          const msg = $("#userCleanupMsg");
          if (msg) msg.textContent = auto.checked ? "Auto-hapus diaktifkan (perlu cron/edge function di server)." : "Auto-hapus dimatikan.";
        } catch (e) {
          const msg = $("#userCleanupMsg");
          if (msg) msg.textContent = e.message || String(e);
        }
      });
    }
  }

  async function refreshDesigns() {
    const host = $("#designList");
    if (!host) return;
    try {
      const rows = await GalleryDB.adminListDesigns();
      host.innerHTML =
        rows
          .map(
            (r) => `<div class="admin-row">
              <div style="display:flex;gap:10px;align-items:center">
                <img src="${esc(r.image_url)}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:8px;background:#111">
                <div><strong>${esc(r.title)}</strong><br><small class="muted">${esc(r.category)} · ${esc(r.author_name || "—")}</small></div>
              </div>
              <div style="display:flex;gap:6px">
                <button type="button" data-edit-design="${r.id}">Ubah</button>
                <button type="button" data-del-design="${r.id}">Hapus</button>
              </div>
            </div>`
          )
          .join("") || "<p class='muted'>Belum ada karya desain.</p>";
      const all = rows;
      $$("#designList [data-del-design]").forEach((b) =>
        b.addEventListener("click", async () => {
          if (!confirm("Hapus karya ini?")) return;
          await GalleryDB.deleteDesign(b.dataset.delDesign);
          await refreshDesigns();
        })
      );
      $$("#designList [data-edit-design]").forEach((b) =>
        b.addEventListener("click", () => {
          const r = all.find((x) => String(x.id) === String(b.dataset.editDesign));
          if (!r) return;
          const f = $("#designForm");
          f.querySelector("[name=id]").value = r.id;
          f.querySelector("[name=title]").value = r.title || "";
          f.querySelector("[name=image_url]").value = r.image_url || "";
          f.querySelector("[name=category]").value = r.category || "Umum";
          f.querySelector("[name=author_name]").value = r.author_name || "";
          f.querySelector("[name=description]").value = r.description || "";
          $("#designMsg").textContent = "Mode edit: " + (r.title || "");
        })
      );
    } catch (e) {
      host.innerHTML = "<p class='muted'>" + esc(e.message || e) + "</p>";
    }
  }

  function bindDesignsAdmin() {
    const save = $("#designSave");
    if (!save || save.dataset.bound) return;
    save.dataset.bound = "1";
    save.addEventListener("click", async () => {
      const f = $("#designForm");
      const msg = $("#designMsg");
      try {
        await GalleryDB.upsertDesign({
          id: f.querySelector("[name=id]").value || null,
          title: f.querySelector("[name=title]").value,
          image_url: f.querySelector("[name=image_url]").value,
          category: f.querySelector("[name=category]").value,
          author_name: f.querySelector("[name=author_name]").value,
          description: f.querySelector("[name=description]").value,
        });
        if (msg) msg.textContent = "Karya disimpan.";
        f.reset();
        f.querySelector("[name=id]").value = "";
        await refreshDesigns();
      } catch (e) {
        if (msg) msg.textContent = e.message || String(e);
      }
    });
    $("#designReset") &&
      ($("#designReset").onclick = () => {
        $("#designForm").reset();
        $("#designForm [name=id]").value = "";
        $("#designMsg").textContent = "";
      });
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
        `<div class="cov-accounts muted admin-one-line">Akun Google: <b>${rows.length}</b> · sudah pilih nama: <b>${linked.length}</b> · belum pilih nama: <b>${unlinked}</b></div>`
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
      const st = u.linked_angkatan_year
        ? (window.SHStatus ? SHStatus.compute(u.linked_angkatan_year).label : "Taut")
        : "Belum tautkan";
      const keys = Object.keys((u.permissions && typeof u.permissions === "object" ? u.permissions : {}) || {});
      const ALL_PERMS = ["videos", "websites", "designs", "alumni", "users", "angkatan", "manage_attendance", "announce", "sync"];
      const permKeys = ALL_PERMS;
      const permHtml = permKeys
        .map(
          (k) =>
            `<label class="user-perm-item"><input type="checkbox" data-perm="${esc(k)}" ${
              u.permissions && u.permissions[k] ? "checked" : ""
            }> ${esc(k)}</label>`
        )
        .join("");
      const taut = u.linked_student_name
        ? ` · ${esc(u.linked_student_name)} · ${esc(u.linked_angkatan_year || "")} K${esc(u.linked_class_code || "")}`
        : "";
      const unapproved = !u.is_admin && !(u.linked_student_name && String(u.linked_student_name).trim()) && u.role !== "teacher" && u.role !== "student" && u.role !== "alumni";
      const roleLab = u.is_admin
        ? "admin"
        : u.role === "teacher"
          ? "pengajar"
          : u.role === "alumni"
            ? "alumni"
            : u.role === "student" || u.linked_student_name
              ? "siswa"
              : "belum disetujui";
      return `<div class="pt-node user-node" data-uid="${u.id}">
        <div class="admin-row user-row-compact" data-toggle-user="${u.id}">
          <div class="user-row-main">
            ${unapproved ? `<label class="check" style="margin:0" onclick="event.stopPropagation()"><input type="checkbox" class="user-cleanup-cb" data-cleanup-id="${u.id}"></label>` : ""}
            ${u.avatar_url ? `<img class="user-row-av" src="${esc(u.avatar_url)}" alt="">` : `<span class="user-row-av user-row-av-ph">👤</span>`}
            <div class="user-row-text">
              <strong>${esc(u.display_name || u.email)}</strong>${u.is_admin ? ' <em class="user-admin-tag">Admin</em>' : ""} <em class="muted" style="font-size:11px">(${esc(roleLab)})</em>
              <span class="user-row-meta">${esc(u.email)} · ${esc(st)}${taut}</span>
            </div>
          </div>
          <button type="button" class="btn-atur" data-toggle-user-btn="${u.id}">Atur</button>
        </div>
        <div class="user-perm-panel is-collapsed" data-parent-user="${u.id}">
          <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px">
            <label class="user-perm-item"><input type="radio" name="role-${u.id}" data-role="student" ${u.role === "student" || (!u.role && u.linked_student_name) ? "checked" : ""}> Siswa</label>
            <label class="user-perm-item"><input type="radio" name="role-${u.id}" data-role="teacher" ${u.role === "teacher" ? "checked" : ""}> Pengajar</label>
            <label class="user-perm-item"><input type="radio" name="role-${u.id}" data-role="alumni" ${u.role === "alumni" ? "checked" : ""}> Alumni</label>
            <label class="user-perm-item"><input type="radio" name="role-${u.id}" data-role="" ${!u.role && !u.linked_student_name ? "checked" : ""}> Belum ditunjuk</label>
          </div>
          <label class="user-perm-item"><input type="checkbox" data-is-admin ${u.is_admin ? "checked" : ""}> Jadikan admin (penuh)</label>
          <p class="muted" style="font-size:11px;margin:6px 0">Privilege tab admin untuk pengajar:</p>
          <div class="user-perm-grid">${permHtml}</div>
          <button type="button" class="btn btn-primary" data-save-user="${u.id}" style="margin-top:8px;padding:6px 12px;font-size:12px">Simpan peran &amp; hak akses</button>
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
              <div class="pt-row"><button type="button" class="pt-toggle" data-t="u-${esc(y)}-${esc(c)}">▸</button><strong>Kelas ${esc(c)}</strong> <small class="muted">(${tree[y][c].length})</small></div>
              <div class="pt-children is-collapsed" data-parent="u-${esc(y)}-${esc(c)}">${list}</div>
            </div>`;
          })
          .join("");
        return `<div class="pt-node" style="margin-bottom:10px">
          <div class="pt-row"><button type="button" class="pt-toggle" data-t="u-y-${esc(y)}">▸</button><strong>Angkatan ${esc(y)}</strong> <small class="muted">(${Object.values(tree[y]).reduce((n,arr)=>n+arr.length,0)})</small></div>
          <div class="pt-children is-collapsed" data-parent="u-y-${esc(y)}">${cHtml}</div>
        </div>`;
      })
      .join("");
    if (unlinked) {
      const noLink = rows.filter((u) => !(u.linked_student_name && String(u.linked_student_name).trim()));
      html += `<div class="pt-node" style="margin-top:12px">
        <div class="pt-row"><button type="button" class="pt-toggle" data-t="u-nolink">▸</button><strong>Belum menautkan siswa</strong> <small class="muted">(${unlinked})</small></div>
        <div class="pt-children is-collapsed" data-parent="u-nolink">${noLink.map((u) => userRow(u) + adminLinkForm(u)).join("")}</div>
      </div>`;
    }
    $("#userList").innerHTML = html || "<p class='muted'>Belum ada user login Google.</p>";
    // hide global perm box
    const pb = $("#permBox");
    if (pb) pb.hidden = true;
    treeToggleBind($("#userList"));
    bindListSearch("#userSearch", "#userList");
    bindLinkNameSelects($("#userList"));
    function toggleUserPanel(id) {
      const panel = $("#userList").querySelector('[data-parent-user="' + id + '"]');
      if (!panel) return;
      panel.classList.toggle("is-collapsed");
      const open = !panel.classList.contains("is-collapsed");
      $$("#userList [data-toggle-user-btn]").forEach((b) => {
        if (b.getAttribute("data-toggle-user-btn") === id) b.textContent = open ? "Tutup" : "Atur";
      });
    }
    $$("#userList [data-toggle-user]").forEach((row) =>
      row.addEventListener("click", (e) => {
        if (e.target.closest("button") && !e.target.closest("[data-toggle-user-btn]")) return;
        const id = row.getAttribute("data-toggle-user");
        if (id) toggleUserPanel(id);
      })
    );
    $$("#userList [data-toggle-user-btn]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleUserPanel(btn.getAttribute("data-toggle-user-btn"));
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
          const roleEl = panel.querySelector("[data-role]:checked") || panel.querySelector("input[data-role]:checked");
          const role = roleEl ? roleEl.getAttribute("data-role") || "" : "";
          await GalleryDB.setUserAdmin(id, { isAdmin, permissions, role });
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
