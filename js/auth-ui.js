/** Topbar: avatar Google + nama + status login */
(function () {
  function $(s, r) {
    return (r || document).querySelector(s);
  }
  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
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
        bar.innerHTML = `<a class="btn-google-sm" href="profile.html?login=1" title="Login Google" id="shTopLogin">
          <span class="g-icon" aria-hidden="true"></span> Login
        </a>`;
        const btn = bar.querySelector("#shTopLogin");
        if (btn) {
          btn.addEventListener("click", (e) => {
            try {
              sessionStorage.setItem("sh_return", location.href);
            } catch (err) {}
          });
        }
        return;
      }
      const u = session.user;
      const meta = u.user_metadata || {};
      const avatar = meta.avatar_url || meta.picture || "";
      const name = meta.full_name || meta.name || (u.email || "User").split("@")[0];
      try {
        await GalleryDB.upsertMyProfileFromSession();
      } catch (e) {}
      let statusLabel = "Login Google";
      try {
        const prof = await GalleryDB.getMyProfile();
        if (prof && prof.linked_angkatan_year && window.SHStatus) {
          statusLabel = SHStatus.compute(prof.linked_angkatan_year).label;
        }
      } catch (e) {}
      let isAdm = false;
      try {
        isAdm = await GalleryDB.isCurrentUserAdmin();
      } catch (e) {}
      bar.innerHTML = `
        <a class="sh-profile-chip" href="profile.html" title="${escapeHtml(name)} · ${escapeHtml(u.email || "")}">
          ${avatar ? `<img src="${escapeHtml(avatar)}" alt="">` : `<span class="sh-av-fallback">👤</span>`}
          <span class="sh-profile-meta">
            <b>${escapeHtml(name)}</b>
            <small>${escapeHtml(statusLabel)}</small>
          </span>
        </a>
        <a class="btn btn-ghost" href="my-works.html" style="padding:6px 10px;font-size:12px">Karya</a>
        ${isAdm ? `<a class="btn btn-ghost" href="admin.html" style="padding:6px 10px;font-size:12px">Admin</a>` : ""}
      `;
    } catch (e) {
      console.warn(e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureProfileBar);
  } else {
    ensureProfileBar();
  }
  window.SHAuthUI = { refresh: ensureProfileBar };
})();
