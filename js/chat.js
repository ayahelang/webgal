(() => {
  const $ = (s) => document.querySelector(s);
  const log = $("#chatLog");
  const room = $("#chatRoom");
  const status = $("#chatStatus");
  const typingLine = $("#typingLine");
  const searchInput = $("#chatSearch");
  const avatarPicker = $("#chatAvatarPicker");
  const nameInput = $("#chatName");
  let unsub = null;
  let typingCtl = null;
  let typingTimer = null;
  let allMessages = [];
  let selectedAvatar = "💬";
  let loginDisplayName = "";

  const AVATARS = ["🎓", "💬", "🌟", "🦋", "🌸", "🚀", "💜", "🌙", "🔥", "✨", "🦊", "🍀"];
  const LS_NAME = "sh_chat_name";
  const LS_AV = "sh_chat_avatar";

  function esc(t) {
    return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /** Turn URLs / domains in already-escaped text into clickable links (new tab). */
  function linkify(escapedText) {
    const re =
      /(https?:\/\/[^\s<&]+|www\.[^\s<&]+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<&]*)?)/gi;
    return String(escapedText || "").replace(re, (match) => {
      let href = match;
      if (!/^https?:\/\//i.test(href)) href = "https://" + href;
      if (/^(javascript|data|vbscript):/i.test(href)) return match;
      return (
        '<a class="chat-link" href="' +
        href.replace(/"/g, "&quot;") +
        '" target="_blank" rel="noopener noreferrer">' +
        match +
        "</a>"
      );
    });
  }

  function highlight(escapedText, q) {
    if (!q) return escapedText;
    const needle = esc(q);
    if (!needle) return escapedText;
    try {
      const re = new RegExp("(" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      return escapedText.replace(re, '<mark class="chat-hit">$1</mark>');
    } catch (e) {
      return escapedText;
    }
  }

  function getSearchQ() {
    return (searchInput && searchInput.value ? searchInput.value : "").trim();
  }

  function msgMatches(m, q) {
    if (!q) return true;
    const hay = ((m.author_name || "") + " " + (m.body || "")).toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function renderMessages() {
    if (!log) return;
    const q = getSearchQ();
    log.innerHTML = "";
    const filtered = q ? allMessages.filter((m) => msgMatches(m, q)) : allMessages;
    filtered.forEach((m) => appendBubble(m, q));
    log.scrollTop = log.scrollHeight;
    if (status && GalleryDB.enabled()) {
      if (q) {
        status.textContent =
          filtered.length + " dari " + allMessages.length + " pesan cocok · \"" + q + "\"";
      }
    }
  }

  function appendBubble(m, q) {
    const div = document.createElement("div");
    div.className = "chat-bubble";
    const t = m.created_at ? new Date(m.created_at).toLocaleString("id-ID") : "";
    const av = m.avatar_emoji || "💬";
    const bodyEsc = esc(m.body);
    const bodyHtml = linkify(highlight(bodyEsc, q || ""));
    div.innerHTML =
      `<div class="chat-av">${esc(av)}</div>` +
      `<div class="chat-body"><strong>${esc(m.author_name)}</strong> <small>${esc(t)}</small>` +
      `<div>${bodyHtml}</div></div>`;
    log.appendChild(div);
  }

  function addMsg(m) {
    allMessages.push(m);
    const q = getSearchQ();
    if (msgMatches(m, q)) {
      appendBubble(m, q);
      log.scrollTop = log.scrollHeight;
    }
    if (q && status) {
      const n = allMessages.filter((x) => msgMatches(x, q)).length;
      status.textContent = n + " dari " + allMessages.length + " pesan cocok · \"" + q + "\"";
    }
  }

  function resolveAuthorName() {
    const typed = nameInput ? nameInput.value.trim() : "";
    if (typed) return typed;
    if (loginDisplayName) return loginDisplayName;
    return "Anonim";
  }

  function saveProfile() {
    if (nameInput) localStorage.setItem(LS_NAME, nameInput.value.trim());
    localStorage.setItem(LS_AV, selectedAvatar);
  }

  function setAvatar(emoji) {
    selectedAvatar = emoji || "💬";
    if (avatarPicker) {
      avatarPicker.querySelectorAll(".chat-av-btn").forEach((btn) => {
        btn.classList.toggle("is-selected", btn.dataset.emoji === selectedAvatar);
      });
    }
    saveProfile();
    if (typingCtl) bindTyping();
  }

  function buildAvatarPicker() {
    if (!avatarPicker) return;
    avatarPicker.innerHTML = "";
    AVATARS.forEach((em) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chat-av-btn" + (em === selectedAvatar ? " is-selected" : "");
      btn.dataset.emoji = em;
      btn.setAttribute("aria-label", "Avatar " + em);
      btn.textContent = em;
      btn.addEventListener("click", () => setAvatar(em));
      avatarPicker.appendChild(btn);
    });
  }

  async function resolveLoginName() {
    loginDisplayName = "";
    try {
      if (!window.GalleryDB || !GalleryDB.enabled()) return;
      const session = await GalleryDB.getSession();
      if (!session || !session.user) return;
      const u = session.user;
      const meta = u.user_metadata || {};
      let name = "";
      try {
        const prof = await GalleryDB.getMyProfile();
        if (prof) {
          name =
            (prof.linked_student_name && String(prof.linked_student_name).trim()) ||
            (prof.display_name && String(prof.display_name).trim()) ||
            "";
        }
      } catch (e) {}
      if (!name) name = meta.full_name || meta.name || "";
      if (!name && u.email) name = String(u.email).split("@")[0];
      loginDisplayName = String(name || "").trim().slice(0, 40);
      if (nameInput && !nameInput.value.trim() && loginDisplayName) {
        nameInput.placeholder = loginDisplayName + " (dari akun login)";
      }
    } catch (e) {}
  }

  async function loadRooms() {
    room.innerHTML = `<option value="">Lintas angkatan (global)</option>`;
    if (!GalleryDB.enabled()) {
      status.textContent = "Database belum dikonfigurasi.";
      return;
    }
    try {
      const list = await GalleryDB.listAngkatan();
      list.forEach((a) => {
        const opt = document.createElement("option");
        opt.value = a.id;
        opt.textContent = a.label;
        room.appendChild(opt);
      });
    } catch (e) {
      status.textContent = e.message || String(e);
    }
  }

  function bindTyping() {
    if (typingCtl) typingCtl.leave();
    const angkatanId = room.value || null;
    const roomKey = angkatanId || "global";
    typingCtl = GalleryDB.joinTypingChannel({
      roomKey,
      userName: resolveAuthorName(),
      avatarEmoji: selectedAvatar,
      onSync(people) {
        const me = resolveAuthorName().toLowerCase();
        const typing = people.filter((p) => p.typing && String(p.name || "").toLowerCase() !== me);
        if (!typing.length) {
          typingLine.textContent = "";
          return;
        }
        if (typing.length === 1) {
          typingLine.textContent = `${typing[0].avatar || ""} ${typing[0].name} sedang mengetik…`;
        } else {
          typingLine.textContent = `${typing.length} orang sedang mengetik…`;
        }
      },
    });
  }

  async function joinRoom() {
    if (unsub) unsub();
    allMessages = [];
    log.innerHTML = "";
    typingLine.textContent = "";
    if (searchInput) searchInput.value = "";
    if (!GalleryDB.enabled()) return;
    const angkatanId = room.value || null;
    status.textContent = "Memuat pesan...";
    try {
      const rows = await GalleryDB.listChat({ angkatanId, limit: 150 });
      allMessages = rows || [];
      renderMessages();
      status.textContent = angkatanId ? "Ruang angkatan" : "Ruang lintas angkatan · realtime aktif";
      unsub = GalleryDB.subscribeChat({ angkatanId, onInsert: addMsg });
      bindTyping();
    } catch (e) {
      status.textContent = "Gagal: " + (e.message || e);
    }
  }

  // Init name + avatar from localStorage
  if (nameInput) nameInput.value = localStorage.getItem(LS_NAME) || "";
  const savedAv = localStorage.getItem(LS_AV);
  if (savedAv && AVATARS.includes(savedAv)) selectedAvatar = savedAv;
  buildAvatarPicker();

  if (searchInput) {
    let searchTimer = null;
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(renderMessages, 120);
    });
  }

  if (nameInput) {
    nameInput.addEventListener("change", () => {
      saveProfile();
      bindTyping();
    });
    nameInput.addEventListener("input", () => {
      saveProfile();
    });
  }

  $("#chatInput").addEventListener("input", () => {
    saveProfile();
    if (!typingCtl) return;
    typingCtl.setTyping(true);
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => typingCtl && typingCtl.setTyping(false), 1200);
  });

  $("#chatForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    saveProfile();
    const body = $("#chatInput").value;
    if (!String(body || "").trim()) return;
    try {
      await GalleryDB.sendChat({
        angkatanId: room.value || null,
        authorName: resolveAuthorName(),
        body,
        avatarEmoji: selectedAvatar,
      });
      $("#chatInput").value = "";
      if (typingCtl) typingCtl.setTyping(false);
    } catch (e) {
      status.textContent = e.message || String(e);
    }
  });

  room.addEventListener("change", joinRoom);

  resolveLoginName().then(() => {
    loadRooms().then(joinRoom);
  });
})();
