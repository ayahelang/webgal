/** Topbar: avatar Google + status login */
(function () {
  function $(s, r) {
    return (r || document).querySelector(s);
  }

  async function ensureProfileBar() {
    if (!window.GalleryDB || !GalleryDB.enabled()) return;
    let bar = $(".sh-userbar");
    if (!bar) {
      const nav = $(".topnav");
      if (!nav) return;
      bar = document.createElement("div");
      bar.className = "sh-userbar";
      nav.appendChild(bar);
    }
    try {
      const session = await GalleryDB.getSession();
      if (!session || !session.user) {
        bar.innerHTML = `<a class="btn-google-sm" href="profile.html" title="Login">
          <span class="g-icon" aria-hidden="true"></span> Login
        </a>`;
        return;
      }
      const u = session.user;
      const meta = u.user_metadata || {};
      const avatar = meta.avatar_url || meta.picture || "";
      const name = meta.full_name || meta.name || u.email || "User";
      await GalleryDB.upsertMyProfileFromSession();
      const prof = await GalleryDB.getMyProfile();
      let statusLabel = "";
      if (prof && prof.linked_angkatan_year) {
        statusLabel = SHStatus.compute(prof.linked_angkatan_year).label;
      }
      const isAdm = await GalleryDB.isCurrentUserAdmin();
      bar.innerHTML = `
        <a class="sh-profile-chip" href="profile.html" title="${name}">
          ${avatar ? `<img src="${avatar}" alt="">` : `<span class="sh-av-fallback">👤</span>`}
          <span class="sh-profile-meta">
            <b>${escapeHtml(name.split(" ")[0])}</b>
            ${statusLabel ? `<small>${escapeHtml(statusLabel)}</small>` : `<small>${escapeHtml(u.email || "")}</small>`}
          </span>
        </a>
        `<a class="btn btn-ghost" href="my-works.html" style="padding:6px 10px;font-size:12px">Karya</a>` +
        ${isAdm ? `<a class="btn btn-ghost" href="admin.html" style="padding:6px 10px;font-size:12px">Admin</a>` : ""}
      `;
    } catch (e) {
      console.warn(e);
    }
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureProfileBar);
  } else {
    ensureProfileBar();
  }
  window.SHAuthUI = { refresh: ensureProfileBar };
})();
