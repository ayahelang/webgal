(() => {
  const $ = (s) => document.querySelector(s);
  let roster = { "2024": { "51": [], "52": [] }, "2025": { "51": [], "52": [] } };

  function returnTarget() {
    try {
      const q = new URLSearchParams(location.search).get("return");
      if (q) return q;
      const s = sessionStorage.getItem("sh_return");
      if (s) return s;
    } catch (e) {}
    return "index.html";
  }

  function paintReturnCta() {
    const box = $("#returnBox");
    if (!box) return;
    const dest = returnTarget();
    let label = "Kembali ke Gallery";
    try {
      const u = new URL(dest, location.origin);
      if (u.pathname.indexOf("videos") >= 0) label = "Kembali ke Galeri Video";
      else if (u.pathname.indexOf("chat") >= 0) label = "Kembali ke Chat";
      else if (u.pathname.indexOf("my-works") >= 0) label = "Kembali ke Karya Saya";
      else if (u.pathname.indexOf("admin") >= 0) label = "Kembali ke Admin";
      else if (u.pathname.indexOf("index") >= 0 || u.pathname.endsWith("/")) label = "Kembali ke Gallery";
      else label = "Lanjutkan aktivitas sebelumnya";
    } catch (e) {}
    box.innerHTML = `
      <p class="muted" style="margin:0 0 8px">Login berhasil. Lanjutkan urusan sebelumnya?</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <a class="btn btn-primary" href="${dest}" id="btnReturn">${label}</a>
        <a class="btn btn-ghost" href="index.html">Gallery</a>
        <a class="btn btn-ghost" href="my-works.html">Karya Saya</a>
      </div>`;
    const btn = $("#btnReturn");
    if (btn) {
      btn.addEventListener("click", () => {
        try {
          sessionStorage.removeItem("sh_return");
        } catch (e) {}
      });
    }
  }

  function fillClasses(year) {
    const sel = $("#classCode");
    sel.innerHTML = '<option value="">— pilih kelas —</option>';
    if (!year) {
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    ["51", "52"].forEach((c) => {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = "Kelas " + c;
      sel.appendChild(o);
    });
  }

  function fillNames(year, kelas) {
    const sel = $("#studentNameSelect");
    const custom = $("#studentNameCustom");
    const hint = $("#nameHint");
    sel.innerHTML = '<option value="">— pilih nama —</option>';
    custom.value = "";
    custom.style.display = "none";
    if (!year || !kelas) {
      sel.disabled = true;
      hint.textContent = "";
      return;
    }
    sel.disabled = false;
    const list = (roster[year] && roster[year][kelas]) || [];
    list.forEach((n) => {
      const o = document.createElement("option");
      o.value = n;
      o.textContent = n;
      sel.appendChild(o);
    });
    if (String(year) === "2024") {
      custom.style.display = "block";
      hint.textContent = "Angkatan 2024: pilih dari daftar, atau ketik nama custom di bawah.";
    } else {
      custom.style.display = "none";
      hint.textContent = "Angkatan " + year + ": nama wajib dipilih dari daftar.";
    }
  }

  async function loadRoster() {
    try {
      const r = await fetch("data/student-roster.json", { cache: "no-store" });
      if (r.ok) roster = await r.json();
    } catch (e) {}
    // merge 2025 from gallery DB names if available
    try {
      if (window.GalleryDB && GalleryDB.fetchGalleryFromDb) {
        const db = await GalleryDB.fetchGalleryFromDb();
        (db && db.students ? db.students : []).forEach((s) => {
          const y = String(s.angkatan || "2025");
          const c = String(s.class || "");
          if (!roster[y]) roster[y] = {};
          if (!roster[y][c]) roster[y][c] = [];
          if (s.name && !roster[y][c].includes(s.name)) roster[y][c].push(s.name);
        });
        Object.keys(roster).forEach((y) => {
          Object.keys(roster[y]).forEach((c) => {
            roster[y][c].sort((a, b) => a.localeCompare(b, "id"));
          });
        });
      }
    } catch (e) {}
  }

  async function boot() {
    await loadRoster();

    $("#angkatanYear").addEventListener("change", (e) => {
      fillClasses(e.target.value);
      fillNames("", "");
      $("#classCode").value = "";
    });
    $("#classCode").addEventListener("change", (e) => {
      fillNames($("#angkatanYear").value, e.target.value);
    });

    $("#btnLogin").onclick = () => {
      GalleryDB.signInWithGoogle({
        redirectTo: location.origin + location.pathname.replace(/[^/]+$/, "") + "profile.html",
        returnTo: returnTarget() !== "index.html" ? returnTarget() : sessionStorage.getItem("sh_return") || location.href,
      }).catch((e) => alert(e.message || e));
    };
    $("#btnOut").onclick = async () => {
      await GalleryDB.signOut();
      location.href = "profile.html";
    };

    const session = await GalleryDB.getSession();
    if (!session || !session.user) {
      $("#out").hidden = false;
      $("#out").style.display = "grid";
      $("#in").hidden = true;
      $("#in").style.display = "none";
      if (new URLSearchParams(location.search).get("login") === "1") {
        const hint = $("#outHint");
        if (hint) hint.textContent = "Silakan login Google untuk melanjutkan aktivitas sebelumnya.";
      }
      return;
    }

    // sudah login: sembunyikan form login
    $("#out").hidden = true;
    $("#out").style.display = "none";
    $("#in").hidden = false;
    $("#in").style.display = "grid";

    const u = session.user;
    const meta = u.user_metadata || {};
    $("#nm").textContent = meta.full_name || meta.name || "User";
    $("#em").textContent = u.email || "";
    if (meta.avatar_url || meta.picture) {
      $("#av").src = meta.avatar_url || meta.picture;
      $("#av").hidden = false;
    }
    await GalleryDB.upsertMyProfileFromSession();
    const prof = await GalleryDB.getMyProfile();
    if (prof) {
      if (prof.linked_angkatan_year) {
        $("#angkatanYear").value = String(prof.linked_angkatan_year);
        fillClasses(String(prof.linked_angkatan_year));
      }
      if (prof.linked_class_code) {
        $("#classCode").value = String(prof.linked_class_code);
        fillNames(String(prof.linked_angkatan_year || ""), String(prof.linked_class_code));
      }
      if (prof.linked_student_name) {
        const sel = $("#studentNameSelect");
        const found = [...sel.options].some((o) => o.value === prof.linked_student_name);
        if (found) sel.value = prof.linked_student_name;
        else if (String(prof.linked_angkatan_year) === "2024") {
          $("#studentNameCustom").style.display = "block";
          $("#studentNameCustom").value = prof.linked_student_name;
        }
      }
      if (prof.linked_angkatan_year && window.SHStatus) {
        $("#st").textContent = "Status: " + SHStatus.compute(prof.linked_angkatan_year).label;
      }
      // kontak
      if ($("#contactWa")) {
        $("#contactWa").value = prof.contact_wa || "";
        $("#contactIg").value = prof.contact_ig || "";
        $("#contactFb").value = prof.contact_fb || "";
        $("#contactTwitter").value = prof.contact_twitter || "";
        $("#contactTiktok").value = prof.contact_tiktok || "";
        if ($("#contactQris")) $("#contactQris").value = prof.qris_image_url || "";
        if ($("#contactPhoto")) $("#contactPhoto").value = prof.profile_photo_url || "";
        await buildWaPrivacyTree(prof);
      }
    }

    paintReturnCta();
    if (window.SHAuthUI) SHAuthUI.refresh();

    $("#linkForm").onsubmit = async (ev) => {
      ev.preventDefault();
      const year = $("#angkatanYear").value;
      const kelas = $("#classCode").value;
      let name = $("#studentNameSelect").value;
      const custom = ($("#studentNameCustom").value || "").trim();
      if (String(year) === "2024" && custom) name = custom;
      if (!year || !kelas || !name) {
        $("#msg").textContent = "Lengkapi angkatan, kelas, dan nama.";
        return;
      }
      if (String(year) === "2025" && custom && !name) {
        $("#msg").textContent = "Angkatan 2025: nama harus dari daftar.";
        return;
      }
      try {
        const p = await GalleryDB.updateMyLink({
          studentName: name,
          angkatanYear: year,
          classCode: kelas,
        });
        if (window.SHStatus) $("#st").textContent = "Status: " + SHStatus.compute(p.linked_angkatan_year).label;
        $("#msg").textContent = "Tautan tersimpan.";
        if (window.SHAuthUI) SHAuthUI.refresh();
      } catch (e) {
        $("#msg").textContent = e.message || String(e);
      }
    };

    const unlinkBtn = $("#btnUnlinkSelf");
    if (unlinkBtn) {
      unlinkBtn.onclick = async () => {
        if (!confirm("Lepas tautan nama siswa dari akun Google ini?")) return;
        try {
          await GalleryDB.unlinkMyProfile();
          $("#linkMsg").textContent = "Tautan dilepas. Silakan tautkan ulang jika perlu.";
          location.reload();
        } catch (e) {
          $("#linkMsg").textContent = e.message || String(e);
        }
      };
    }
    const revBtn = $("#btnRevokeOthers");
    if (revBtn) {
      revBtn.onclick = async () => {
        if (!confirm("Cabut tautan akun Google lain yang memakai nama siswa yang sama dengan Anda?")) return;
        try {
          const r = await GalleryDB.revokeOtherLinksOnMyStudent();
          $("#linkMsg").textContent = "Dilepas: " + (r.removed || 0) + " akun lain.";
        } catch (e) {
          $("#linkMsg").textContent = e.message || String(e);
        }
      };
    }

    if ($("#contactForm")) {
      $("#contactForm").onsubmit = async (ev) => {
        ev.preventDefault();
        const privacy = collectWaPrivacy();
        try {
          await GalleryDB.updateMyContact({
            wa: $("#contactWa").value,
            ig: $("#contactIg").value,
            fb: $("#contactFb").value,
            twitter: $("#contactTwitter").value,
            tiktok: $("#contactTiktok").value,
            qrisImageUrl: ($("#contactQris") && $("#contactQris").value) || "",
            profilePhotoUrl: ($("#contactPhoto") && $("#contactPhoto").value) || "",
            privacy,
          });
          $("#contactMsg").textContent = "Kontak, foto & privasi tersimpan.";
        } catch (e) {
          $("#contactMsg").textContent = e.message || String(e);
        }
      };
    }
  }

  function collectWaPrivacy() {
    const tree = $("#waPrivacyTree");
    const year = ($("#angkatanYear") && $("#angkatanYear").value) || "";
    const kelas = ($("#classCode") && $("#classCode").value) || "";
    const wa = {
      public: !!(tree && tree.querySelector('[data-key="public"]') && tree.querySelector('[data-key="public"]').checked),
      allStudents: !!(tree && tree.querySelector('[data-key="allStudents"]') && tree.querySelector('[data-key="allStudents"]').checked),
      classmatesOnly: !!(tree && tree.querySelector('[data-key="classmates"]') && tree.querySelector('[data-key="classmates"]').checked),
      classCode: kelas,
      year: year,
      angkatan: {},
      classes: {},
      names: {},
    };
    if (!tree) return { wa, social: { public: true } };
    tree.querySelectorAll('[data-key^="ang:"]').forEach((el) => {
      if (el.checked) wa.angkatan[el.dataset.key.slice(4)] = true;
    });
    tree.querySelectorAll('[data-key^="cls:"]').forEach((el) => {
      if (el.checked) wa.classes[el.dataset.key.slice(4)] = true;
    });
    tree.querySelectorAll('[data-key^="name:"]').forEach((el) => {
      if (el.checked) wa.names[el.dataset.key.slice(5)] = true;
    });
    // if any specific selection, classmatesOnly becomes false unless only classmates checked
    if (wa.public || wa.allStudents || Object.keys(wa.angkatan).length || Object.keys(wa.classes).length || Object.keys(wa.names).length) {
      if (!wa.classmatesOnly) {
        /* ok */
      }
    }
    return { wa, social: { public: true } };
  }

  async function buildWaPrivacyTree(prof) {
    const host = $("#waPrivacyTree");
    if (!host) return;
    const year = String((prof && prof.linked_angkatan_year) || ($("#angkatanYear") && $("#angkatanYear").value) || "");
    const kelas = String((prof && prof.linked_class_code) || ($("#classCode") && $("#classCode").value) || "");
    let roster = {};
    try {
      const r = await fetch("data/student-roster.json", { cache: "no-store" });
      if (r.ok) roster = await r.json();
    } catch (e) {}
    try {
      if (GalleryDB.fetchGalleryFromDb) {
        const db = await GalleryDB.fetchGalleryFromDb();
        (db.students || []).forEach((s) => {
          const y = String(s.angkatan || "2025");
          const c = String(s.class || "");
          if (!roster[y]) roster[y] = {};
          if (!roster[y][c]) roster[y][c] = [];
          if (s.name && !roster[y][c].includes(s.name)) roster[y][c].push(s.name);
        });
      }
    } catch (e) {}

    const saved = (prof && prof.contact_privacy && prof.contact_privacy.wa) || {};
    // default classmates
    const defClassmates = saved.classmatesOnly !== false && !saved.public && !saved.allStudents;

    function node(id, label, opts) {
      const hasKids = opts.children && opts.children.length;
      const checked = opts.checked ? "checked" : "";
      const collapsed = opts.open ? "" : "is-collapsed";
      const kids = hasKids
        ? `<div class="pt-children ${collapsed}" data-parent="${id}">${opts.children.join("")}</div>`
        : "";
      return `<div class="pt-node" data-id="${id}">
        <div class="pt-row">
          <button type="button" class="pt-toggle ${hasKids ? "" : "leaf"}" data-toggle="${id}" aria-label="lipat">${hasKids ? "▾" : "•"}</button>
          <label><input type="checkbox" data-key="${opts.key}" ${checked}> ${label}</label>
        </div>${kids}</div>`;
    }

    const years = Object.keys(roster).sort().reverse();
    const angNodes = years.map((y) => {
      const classes = Object.keys(roster[y] || {}).sort();
      const classNodes = classes.map((c) => {
        const names = (roster[y][c] || []).slice().sort((a, b) => a.localeCompare(b, "id"));
        const nameNodes = names.map((n) => {
          const nk = n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          const on = !!(saved.names && (saved.names[nk] || saved.names[n]));
          return node("n-" + nk, n, { key: "name:" + nk, checked: on, children: [] });
        });
        const ck = y + "-" + c;
        const on = !!(saved.classes && saved.classes[ck]);
        return node("c-" + ck, "Kelas " + c + " · " + y, {
          key: "cls:" + ck,
          checked: on,
          children: nameNodes,
          open: false,
        });
      });
      const on = !!(saved.angkatan && saved.angkatan[y]);
      return node("a-" + y, "Angkatan " + y, {
        key: "ang:" + y,
        checked: on,
        children: classNodes,
        open: y === year,
      });
    });

    host.innerHTML =
      node("public", "Semua pengunjung (termasuk belum login)", {
        key: "public",
        checked: !!saved.public,
        children: [],
      }) +
      node("classmates", "Hanya sekelas saya (default)", {
        key: "classmates",
        checked: defClassmates || (!saved.public && !Object.keys(saved.angkatan || {}).length && !Object.keys(saved.classes || {}).length && !Object.keys(saved.names || {}).length),
        children: [],
      }) +
      node("allStudents", "Semua siswa yang sudah login", {
        key: "allStudents",
        checked: !!saved.allStudents,
        children: [],
      }) +
      node("tree", "Pilih angkatan / kelas / nama", {
        key: "tree-root",
        checked: false,
        children: angNodes,
        open: true,
      });

    host.querySelectorAll(".pt-toggle").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = btn.dataset.toggle;
        const kids = host.querySelector('.pt-children[data-parent="' + id + '"]');
        if (!kids) return;
        kids.classList.toggle("is-collapsed");
        btn.textContent = kids.classList.contains("is-collapsed") ? "▸" : "▾";
      });
    });
  }

  boot();
})();
