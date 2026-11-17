/** Topbar: Google login / avatar di KANAN; klik avatar → menu Profil / status */
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
    bar.classList.add("sh-userbar");
    bar.id = bar.id || "shUserbar";
    if (bar.parentNode === topbar) return;
    const slot = $("#shUserbar");
    if (slot && slot !== bar && slot.parentNode === topbar) {
      slot.replaceWith(bar);
      return;
    }
    topbar.appendChild(bar);
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

  function clearChatRoomSessions() {
    try {
      var keys = [];
      for (var i = 0; i < sessionStorage.length; i++) {
        var k = sessionStorage.key(i);
        if (k && k.indexOf("sh_chat_room_ok_") === 0) keys.push(k);
      }
      keys.forEach(function (k) {
        sessionStorage.removeItem(k);
      });
    } catch (e) {}
    try {
      window.__shChatUid = "anon";
    } catch (e2) {}
  }

  function closeUserMenu() {
    document.querySelectorAll(".sh-userbar.is-open").forEach(function (b) {
      b.classList.remove("is-open");
    });
  }

  function bindUserMenu(bar) {
    if (!bar || bar.dataset.menuBound === "1") return;
    bar.dataset.menuBound = "1";
    bar.addEventListener("click", function (e) {
      var chip = e.target.closest("[data-sh-chip]");
      if (chip && bar.contains(chip)) {
        e.preventDefault();
        e.stopPropagation();
        bar.classList.toggle("is-open");
        return;
      }
    });
    document.addEventListener(
      "click",
      function (e) {
        if (!bar.contains(e.target)) closeUserMenu();
      },
      true
    );
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeUserMenu();
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
      placeUserbar(bar);
    }

    try {
      const session = await GalleryDB.getSession();
      if (!session || !session.user) {
        document.body.classList.remove("sh-user-logged");
        hideAdminNavLinks(false);
        try {
          window.__shChatUid = "anon";
        } catch (e0) {}
        bar.classList.remove("is-open");
        bar.innerHTML =
          `<a class="btn-google-sm" href="profile.html?login=1" title="Login Google" id="shTopLogin">` +
          `<span class="g-icon" aria-hidden="true"></span> Login</a>`;
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
      document.body.classList.add("sh-user-logged");
      const u = session.user;
      try {
        window.__shChatUid = String(u.id || u.email || "user");
      } catch (eUid) {}
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

      hideAdminNavLinks(!!isAdm);

      const sub = isAdm ? "Admin" : statusLabel;
      const avHtml = avatar
        ? `<img src="${escapeHtml(avatar)}" alt="">`
        : `<span class="sh-av-fallback" aria-hidden="true">👤</span>`;

      bar.innerHTML =
        `<button type="button" class="sh-profile-chip${isAdm ? " is-admin" : ""}" data-sh-chip="1" aria-haspopup="true" aria-expanded="false" title="${escapeHtml(name)}">` +
        avHtml +
        `</button>` +
        `<div class="sh-user-menu" role="menu">` +
        `<div class="sh-um-name">${escapeHtml(name)}</div>` +
        `<div class="sh-um-role">${escapeHtml(sub)}</div>` +
        `<a href="profile.html" role="menuitem">Profil</a>` +
        (isAdm ? `<a href="admin.html" role="menuitem">Panel Admin</a>` : "") +
        `<button type="button" class="sh-um-btn" data-sh-logout="1" role="menuitem">Keluar</button>` +
        `</div>`;

      bindUserMenu(bar);
      const chip = bar.querySelector("[data-sh-chip]");
      if (chip) {
        bar.addEventListener("click", function () {
          chip.setAttribute("aria-expanded", bar.classList.contains("is-open") ? "true" : "false");
        });
      }
      const lo = bar.querySelector("[data-sh-logout]");
      if (lo) {
        lo.addEventListener("click", async function (e) {
          e.preventDefault();
          e.stopPropagation();
          clearChatRoomSessions();
          try {
            await GalleryDB.signOut();
          } catch (err) {}
          closeUserMenu();
          location.reload();
        });
      }
    } catch (e) {
      console.warn(e);
      document.body.classList.remove("sh-user-logged");
      if (window.SHQuotaMode && SHQuotaMode.isQuotaError(e)) {
        bar.innerHTML =
          '<span class="sh-profile-meta" title="Database terbatas">' +
          "<b>DB terbatas</b><small>coba lagi nanti</small></span>";
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureProfileBar);
  } else {
    ensureProfileBar();
  }
  window.SHAuthUI = { refresh: ensureProfileBar, clearChatRoomSessions: clearChatRoomSessions };
})();
