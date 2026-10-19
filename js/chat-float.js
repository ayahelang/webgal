/**
 * Chat lintas halaman:
 * - mode "min"  → tombol FAB 💬 Chat
 * - mode "float" / "max" → panel chat mengambang (iframe chat.html?embed=1)
 * Di chat.html penuh: chat.js yang menguasai UI; script ini hanya sync di halaman lain.
 */
(function () {
  const LS_MODE = "sh_chat_win_mode";
  const LS_POS = "sh_chat_win_pos";
  const BTN_ID = "chatWinRestore";
  const FRAME_ID = "shChatFloatFrame";
  const WRAP_ID = "shChatFloatWrap";

  function isChatPage() {
    const p = (location.pathname || "").toLowerCase();
    return /chat\.html$/.test(p) || /(^|\/)chat\/?$/.test(p);
  }

  function getMode() {
    try {
      return localStorage.getItem(LS_MODE) || "dock";
    } catch (e) {
      return "dock";
    }
  }

  function setMode(m) {
    try {
      localStorage.setItem(LS_MODE, m);
    } catch (e) {}
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

  function setBtnVisible(btn, on) {
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

  function removeFloatFrame() {
    const wrap = document.getElementById(WRAP_ID);
    if (wrap) wrap.remove();
  }

  function ensureFloatFrame() {
    let wrap = document.getElementById(WRAP_ID);
    if (wrap) return wrap;

    wrap = document.createElement("div");
    wrap.id = WRAP_ID;
    wrap.className = "sh-chat-float-wrap";
    wrap.innerHTML =
      '<div class="sh-chat-float-bar" id="shChatFloatBar">' +
      '<span class="sh-chat-float-title">💬 Live Chat</span>' +
      '<div class="sh-chat-float-actions">' +
      '<button type="button" class="sh-chat-float-btn" data-act="open" title="Buka halaman chat">↗</button>' +
      '<button type="button" class="sh-chat-float-btn" data-act="min" title="Minimize">—</button>' +
      "</div></div>" +
      '<iframe id="' +
      FRAME_ID +
      '" class="sh-chat-float-iframe" title="Live Chat" src="chat.html?embed=1" allow="clipboard-read; clipboard-write"></iframe>';

    // posisi dari LS atau default
    let left = 24,
      top = 72,
      width = Math.min(420, window.innerWidth - 24);
    try {
      const pos = JSON.parse(localStorage.getItem(LS_POS) || "null");
      if (pos && typeof pos.left === "number") {
        left = pos.left;
        top = pos.top;
      }
    } catch (e) {}
    wrap.style.cssText = [
      "position:fixed",
      "left:" + left + "px",
      "top:" + top + "px",
      "width:" + width + "px",
      "height:min(560px, calc(100vh - 96px))",
      "z-index:2147482800",
      "display:flex",
      "flex-direction:column",
      "border-radius:12px",
      "overflow:hidden",
      "box-shadow:0 12px 40px rgba(0,0,0,.5)",
      "border:1px solid rgba(125,227,255,.28)",
      "background:#0a1520",
    ].join(";");

    document.body.appendChild(wrap);

    // drag bar
    const bar = wrap.querySelector("#shChatFloatBar");
    let dragging = false,
      ox = 0,
      oy = 0;
    bar.addEventListener("pointerdown", function (ev) {
      if (ev.target.closest("[data-act]")) return;
      dragging = true;
      const r = wrap.getBoundingClientRect();
      ox = ev.clientX - r.left;
      oy = ev.clientY - r.top;
      try {
        bar.setPointerCapture(ev.pointerId);
      } catch (e) {}
    });
    bar.addEventListener("pointermove", function (ev) {
      if (!dragging) return;
      const nl = Math.max(0, Math.min(window.innerWidth - 80, ev.clientX - ox));
      const nt = Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - oy));
      wrap.style.left = nl + "px";
      wrap.style.top = nt + "px";
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      try {
        localStorage.setItem(
          LS_POS,
          JSON.stringify({
            left: parseInt(wrap.style.left, 10) || 0,
            top: parseInt(wrap.style.top, 10) || 0,
          })
        );
      } catch (e) {}
    }
    bar.addEventListener("pointerup", endDrag);
    bar.addEventListener("pointercancel", endDrag);

    wrap.querySelector('[data-act="min"]').addEventListener("click", function () {
      setMode("min");
      removeFloatFrame();
      setBtnVisible(ensureBtn(), true);
    });
    wrap.querySelector('[data-act="open"]').addEventListener("click", function () {
      setMode("float");
      location.href = "chat.html";
    });

    return wrap;
  }

  function syncNonChatPage() {
    const mode = getMode();
    const btn = ensureBtn();
    if (mode === "min") {
      removeFloatFrame();
      setBtnVisible(btn, true);
    } else if (mode === "float" || mode === "max") {
      setBtnVisible(btn, false);
      ensureFloatFrame();
    } else {
      // dock: tidak tampil di halaman lain
      removeFloatFrame();
      setBtnVisible(btn, false);
    }
  }

  function boot() {
    if (isChatPage()) {
      // Tangani restore dari halaman lain
      try {
        if (sessionStorage.getItem("sh_chat_restore") === "1") {
          sessionStorage.removeItem("sh_chat_restore");
          const target = window.innerWidth < 720 ? "dock" : "float";
          setMode(target);
        }
      } catch (e) {}
      // embed mode: sembunyikan chrome halaman
      const params = new URLSearchParams(location.search);
      const inIframe = window.self !== window.top;
      if (params.get("embed") === "1" || inIframe) {
        document.documentElement.classList.add("chat-embed");
        document.body.classList.add("chat-embed");
        try {
          // pastikan mode float di dalam embed
          if (getMode() === "dock" || getMode() === "min") setMode("float");
        } catch (e) {}
      }
      setBtnVisible(ensureBtn(), getMode() === "min" && !inIframe);
      return;
    }

    // Halaman non-chat
    syncNonChatPage();

    const btn = ensureBtn();
    if (!btn.dataset.chatFloatBound) {
      btn.dataset.chatFloatBound = "1";
      btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        // buka float di halaman ini, atau ke chat.html di layar sempit
        if (window.innerWidth < 720) {
          try {
            sessionStorage.setItem("sh_chat_restore", "1");
          } catch (e) {}
          location.href = "chat.html";
          return;
        }
        setMode("float");
        setBtnVisible(btn, false);
        ensureFloatFrame();
      });
    }

    window.addEventListener("storage", function (ev) {
      if (ev.key === LS_MODE || ev.key === LS_POS) syncNonChatPage();
    });
    window.addEventListener("message", function (ev) {
      const d = ev && ev.data;
      if (!d || d.type !== "sh-chat-mode") return;
      if (d.mode === "min") {
        setMode("min");
        removeFloatFrame();
        setBtnVisible(ensureBtn(), true);
      } else if (d.mode === "float" || d.mode === "max") {
        setMode(d.mode);
        setBtnVisible(ensureBtn(), false);
        ensureFloatFrame();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
