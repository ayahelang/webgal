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
  }
  boot();
})();
