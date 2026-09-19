(() => {
  const $ = (s) => document.querySelector(s);
  async function boot() {
    $("#btnLogin").onclick = () =>
      GalleryDB.signInWithGoogle().catch((e) => alert(e.message || e));
    $("#btnOut").onclick = async () => {
      await GalleryDB.signOut();
      location.reload();
    };

    const session = await GalleryDB.getSession();
    if (!session || !session.user) {
      $("#out").hidden = false;
      $("#in").hidden = true;
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
      if (prof.linked_angkatan_year) {
        $("#st").textContent = "Status: " + SHStatus.compute(prof.linked_angkatan_year).label;
      }
    }

    $("#linkForm").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      try {
        const p = await GalleryDB.updateMyLink({
          studentName: fd.get("studentName"),
          angkatanYear: fd.get("angkatanYear"),
          classCode: fd.get("classCode"),
        });
        $("#st").textContent = "Status: " + SHStatus.compute(p.linked_angkatan_year).label;
        $("#msg").textContent = "Tersimpan.";
        if (window.SHAuthUI) SHAuthUI.refresh();
      } catch (e) {
        $("#msg").textContent = e.message || String(e);
      }
    };
  }
  boot();
})();
