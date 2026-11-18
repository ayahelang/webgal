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


  function loadScriptOnce(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        if (existing.dataset.loaded === "1" || existing.getAttribute("data-loaded") === "1") {
          resolve();
          return;
        }
        existing.addEventListener("load", function () {
          resolve();
        });
        existing.addEventListener("error", reject);
        // fallback bila sudah selesai
        setTimeout(resolve, 50);
        return;
      }
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () {
        s.dataset.loaded = "1";
        resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensureEmergencyLibs() {
    if (window.SHAdminEmergency && SHAdminEmergency.loginWithPassword) return true;
    try {
      await loadScriptOnce("data/admin-emergency-config.js");
    } catch (e1) {}
    try {
      await loadScriptOnce("js/admin-emergency.js");
    } catch (e2) {
      return false;
    }
    return !!(window.SHAdminEmergency && SHAdminEmergency.loginWithPassword);
  }

  function openPasswordLogin() {
    var existing = document.getElementById("shPassLoginModal");
    if (existing) {
      existing.hidden = false;
      var inp0 = existing.querySelector("#shPassLoginInput");
      if (inp0) inp0.focus();
      return;
    }
    var modal = document.createElement("div");
    modal.id = "shPassLoginModal";
    modal.className = "sh-pass-modal";
    modal.innerHTML =
      '<div class="sh-pass-backdrop" data-pass-close="1"></div>' +
      '<div class="sh-pass-card" role="dialog" aria-label="Login password admin">' +
      "<h3>Login dengan password</h3>" +
      '<p class="sh-pass-hint">Cadangan admin saat login Google / Supabase bermasalah.</p>' +
      '<form id="shPassLoginForm">' +
      '<label class="sh-pass-label">Password' +
      '<input type="password" id="shPassLoginInput" autocomplete="current-password" required></label>' +
      '<p class="sh-pass-msg" id="shPassLoginMsg"></p>' +
      '<div class="sh-pass-actions">' +
      '<button type="button" class="btn btn-ghost" data-pass-close="1">Batal</button>' +
      '<button type="submit" class="btn btn-primary" id="shPassLoginBtn">Masuk</button>' +
      "</div></form></div>";
    document.body.appendChild(modal);
    modal.addEventListener("click", function (ev) {
      if (ev.target && ev.target.getAttribute("data-pass-close")) {
        modal.hidden = true;
      }
    });
    var form = modal.querySelector("#shPassLoginForm");
    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var msg = modal.querySelector("#shPassLoginMsg");
      var btn = modal.querySelector("#shPassLoginBtn");
      var input = modal.querySelector("#shPassLoginInput");
      if (msg) {
        msg.style.color = "";
        msg.textContent = "Memverifikasi…";
      }
      if (btn) btn.disabled = true;
      try {
        var okLib = await ensureEmergencyLibs();
        if (!okLib) throw new Error("Modul login password belum tersedia.");
        await SHAdminEmergency.loginWithPassword(input && input.value);
        if (msg) {
          msg.style.color = "#8ff5bd";
          msg.textContent = "Berhasil. Membuka…";
        }
        try {
          sessionStorage.setItem("sh_return", location.href);
        } catch (e0) {}
        // ke admin bila bukan di admin
        if (!/admin\.html/i.test(location.pathname)) {
          location.href = "admin.html";
        } else {
          location.reload();
        }
      } catch (err) {
        if (msg) {
          msg.style.color = "#ff8a8a";
          msg.textContent = (err && err.message) || String(err);
        }
        if (btn) btn.disabled = false;
      }
    });
    var inp = modal.querySelector("#shPassLoginInput");
    if (inp) setTimeout(function () {
      inp.focus();
    }, 50);
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
      let session = await GalleryDB.getSession();
      // Sesi darurat password (Apps Script) — cadangan saat Supabase Auth down
      if ((!session || !session.user) && window.SHAdminEmergency && SHAdminEmergency.isActive()) {
        try {
          var em = SHAdminEmergency.asAuthResult();
          if (em && em.ok && em.session) session = em.session;
        } catch (eEm) {}
      }
      if ((!session || !session.user) && !window.SHAdminEmergency) {
        // coba muat lib darurat sekali (non-blocking untuk UI guest)
        ensureEmergencyLibs().then(function (ok) {
          if (ok && SHAdminEmergency.isActive()) ensureProfileBar();
        });
      }
      if (!session || !session.user) {
        document.body.classList.remove("sh-user-logged");
        document.body.classList.add("sh-user-guest");
        hideAdminNavLinks(true); // sembunyikan Admin+Profil topnav saat belum login
        try {
          window.__shChatUid = "anon";
        } catch (e0) {}
        bar.classList.remove("is-open");
        bar.innerHTML =
          `<div class="sh-login-wrap">` +
          `<button type="button" class="btn-google-sm sh-login-main" id="shTopLogin" aria-expanded="false" aria-haspopup="true">` +
          `<span class="g-icon" aria-hidden="true"></span> Login` +
          `<span class="sh-login-caret" aria-hidden="true">▾</span></button>` +
          `<div class="sh-login-menu" id="shLoginMenu" hidden role="menu">` +
          `<a class="sh-login-item" role="menuitem" id="shLoginGoogle" href="profile.html?login=1">` +
          `<span class="g-icon" aria-hidden="true"></span> Login dengan Google</a>` +
          `<button type="button" class="sh-login-item" role="menuitem" id="shLoginPassword">` +
          `Login dengan password</button>` +
          `</div></div>`;

        function closeLoginMenu() {
          var menu = bar.querySelector("#shLoginMenu");
          var main = bar.querySelector("#shTopLogin");
          if (menu) menu.hidden = true;
          if (main) main.setAttribute("aria-expanded", "false");
          bar.classList.remove("is-login-open");
        }

        var mainBtn = bar.querySelector("#shTopLogin");
        if (mainBtn) {
          mainBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            var menu = bar.querySelector("#shLoginMenu");
            if (!menu) return;
            var open = menu.hidden;
            // tutup menu user lain
            closeUserMenu();
            if (open) {
              menu.hidden = false;
              mainBtn.setAttribute("aria-expanded", "true");
              bar.classList.add("is-login-open");
            } else {
              closeLoginMenu();
            }
          });
        }

        var gBtn = bar.querySelector("#shLoginGoogle");
        if (gBtn) {
          gBtn.addEventListener("click", function () {
            try {
              sessionStorage.setItem("sh_return", location.href);
            } catch (err) {}
            closeLoginMenu();
          });
        }

        var pBtn = bar.querySelector("#shLoginPassword");
        if (pBtn) {
          pBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            closeLoginMenu();
            openPasswordLogin();
          });
        }

        // klik di luar menutup
        if (bar.dataset.loginOutside !== "1") {
          bar.dataset.loginOutside = "1";
          document.addEventListener(
            "click",
            function (ev) {
              if (!bar.contains(ev.target)) closeLoginMenu();
            },
            true
          );
          document.addEventListener("keydown", function (ev) {
            if (ev.key === "Escape") closeLoginMenu();
          });
        }
        return;
      }
      document.body.classList.add("sh-user-logged");
      document.body.classList.remove("sh-user-guest");
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
      try {
        if (!isAdm && window.SHAdminEmergency && SHAdminEmergency.isActive()) isAdm = true;
      } catch (e2) {}

      hideAdminNavLinks(true); // topnav Admin selalu off; admin pakai menu avatar

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
          try {
            if (window.SHAdminEmergency && SHAdminEmergency.clearSession) SHAdminEmergency.clearSession();
          } catch (err2) {}
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
