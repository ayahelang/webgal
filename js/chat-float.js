/**
 * Tombol floating "💬 Chat" lintas halaman saat chat di-minimize.
 * State: localStorage sh_chat_win_mode === "min"
 * Di chat.html: chat.js yang handle klik; script ini hanya sync tampilan di halaman lain.
 */
(function () {
  const LS_MODE = "sh_chat_win_mode";
  const BTN_ID = "chatWinRestore";

  function isChatPage() {
    const p = (location.pathname || "").toLowerCase();
    return /chat\.html$/.test(p) || /(^|\/)chat\/?$/.test(p);
  }

  function isMinimized() {
    try {
      return localStorage.getItem(LS_MODE) === "min";
    } catch (e) {
      return false;
    }
  }

  function ensureBtn() {
    let btn = document.getElementById(BTN_ID);
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = BTN_ID;
      btn.className = "chat-win-restore";
      btn.title = "Buka kembali chat";
      btn.textContent = "💬 Chat";
      document.body.appendChild(btn);
    } else if (btn.parentElement !== document.body) {
      document.body.appendChild(btn);
    }
    return btn;
  }

  function setVisible(btn, on) {
    if (!btn) return;
    if (on) {
      btn.classList.add("is-visible");
      btn.removeAttribute("hidden");
      btn.setAttribute("aria-hidden", "false");
      btn.style.display = "inline-flex";
      document.body.classList.add("chat-is-min");
    } else {
      btn.classList.remove("is-visible");
      btn.setAttribute("hidden", "");
      btn.setAttribute("aria-hidden", "true");
      btn.style.display = "none";
      document.body.classList.remove("chat-is-min");
    }
  }

  function goToChatRestore() {
    try {
      sessionStorage.setItem("sh_chat_restore", "1");
    } catch (e) {}
    location.href = "chat.html";
  }

  function boot() {
    const btn = ensureBtn();

    // Restore flag dari halaman lain
    if (isChatPage()) {
      try {
        if (sessionStorage.getItem("sh_chat_restore") === "1") {
          sessionStorage.removeItem("sh_chat_restore");
          const target = window.innerWidth < 720 ? "dock" : "float";
          localStorage.setItem(LS_MODE, target);
        }
      } catch (e) {}
      // Visibility dikelola chat.js; sync awal saja
      setVisible(btn, isMinimized());
      return;
    }

    // Halaman non-chat: tampilkan jika min, klik → chat.html
    setVisible(btn, isMinimized());
    if (!btn.dataset.chatFloatBound) {
      btn.dataset.chatFloatBound = "1";
      btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (isMinimized()) goToChatRestore();
      });
    }

    window.addEventListener("storage", function (ev) {
      if (ev.key === LS_MODE) setVisible(btn, ev.newValue === "min");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
