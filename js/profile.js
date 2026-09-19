(() => {
  const $ = (s) => document.querySelector(s);

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

  async function boot() {
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
      $("#in").hidden = true;
      // auto prompt login if ?login=1
      if (new URLSearchParams(location.search).get("login") === "1") {
        const hint = $("#outHint");
        if (hint) hint.textContent = "Silakan login Google untuk melanjutkan aktivitas sebelumnya.";
      }
      return;
    }
    $("#out").hidden = true;
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
      if (prof.linked_student_name) $("#linkForm [name=studentName]").value = prof.linked_student_name;
      if (prof.linked_angkatan_year) $("#linkForm [name=angkatanYear]").value = prof.linked_angkatan_year;
      if (prof.linked_class_code) $("#linkForm [name=classCode]").value = prof.linked_class_code;
      if (prof.linked_angkatan_year && window.SHStatus) {
        $("#st").textContent = "Status: " + SHStatus.compute(prof.linked_angkatan_year).label;
      }
    }

    paintReturnCta();
    if (window.SHAuthUI) SHAuthUI.refresh();

    $("#linkForm").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      try {
        const p = await GalleryDB.updateMyLink({
          studentName: fd.get("studentName"),
          angkatanYear: fd.get("angkatanYear"),
          classCode: fd.get("classCode"),
        });
        if (window.SHStatus) $("#st").textContent = "Status: " + SHStatus.compute(p.linked_angkatan_year).label;
        $("#msg").textContent = "Tersimpan.";
        if (window.SHAuthUI) SHAuthUI.refresh();
      } catch (e) {
        $("#msg").textContent = e.message || String(e);
      }
    };
  }
  boot();
})();
