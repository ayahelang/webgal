/** Topbar: Google login / avatar di KANAN; admin pakai ikon Google → panel admin */
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

  function placeUserbar(bar) {
    const topbar = $(".topbar");
    if (!topbar) return;
    // Selalu paling kanan di topbar (setelah theme jika ada, atau append)
    bar.classList.add("sh-userbar");
    const themeBtn = document.getElementById("themeToggle");
    if (themeBtn && themeBtn.parentNode === topbar) {
      // urutan: … | theme | google  → google paling kanan
      topbar.appendChild(bar);
    } else {
      topbar.appendChild(bar);
    }
  }

  function hideAdminNavLinks(hide) {
    document.querySelectorAll("a.nav-admin").forEach(function (a) {
      if (hide) {
        a.setAttribute("hidden", "");
        a.style.display = "none";
      } else {
        a.removeAttribute("hidden");
        a.style.display = "";
      }
    });
  }

  async function ensureProfileBar() {
    if (!window.GalleryDB || !GalleryDB.enabled()) return;
    let bar = $(".sh-userbar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "sh-userbar";
      placeUserbar(bar);
    } else if (bar.parentNode) {
      // pastikan tetap di kanan
      placeUserbar(bar);
    }

    try {
      const session = await GalleryDB.getSession();
      if (!session || !session.user) {
        hideAdminNavLinks(false);
        bar.innerHTML = `<a class="btn-google-sm" href="profile.html?login=1" title="Login Google" id="shTopLogin">
          <span class="g-icon" aria-hidden="true"></span> Login
        </a>`;
        const btn = bar.querySelector("#shTopLogin");
        if (btn) {
          btn.addEventListener("click", function () {
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

      // Admin: sembunyikan link "Admin" di menu; ikon Google = masuk panel admin
      hideAdminNavLinks(!!isAdm);

      const href = isAdm ? "admin.html" : "profile.html";
      const title = isAdm
        ? "Panel Admin · " + name
        : name + " · " + (u.email || "");
      const sub = isAdm ? "Admin" : statusLabel;

      bar.innerHTML =
        `<a class="sh-profile-chip${isAdm ? " is-admin" : ""}" href="${href}" title="${escapeHtml(title)}">` +
        (avatar
          ? `<img src="${escapeHtml(avatar)}" alt="">`
          : `<span class="sh-av-fallback">👤</span>`) +
        `<span class="sh-profile-meta">` +
        `<b>${escapeHtml(name)}</b>` +
        `<small>${escapeHtml(sub)}</small>` +
        `</span></a>`;
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
