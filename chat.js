(() => {
  const $ = (s) => document.querySelector(s);
  const log = $("#chatLog");
  const room = $("#chatRoom");
  const status = $("#chatStatus");
  const typingLine = $("#typingLine");
  const searchInput = $("#chatSearch");
  const avatarPicker = $("#chatAvatarPicker");
  const nameInput = $("#chatName");
  const chatInput = $("#chatInput");
  const chatForm = $("#chatForm");
  const fileInput = $("#chatFile");
  let unsub = null;
  let typingCtl = null;
  let typingTimer = null;
  let allMessages = [];
  let selectedAvatar = "💬";
  let loginDisplayName = "";
  let myUserId = null;
  let iAmStaff = false;
  let uploading = false;

  const AVATARS = ["🎓", "💬", "🌟", "🦋", "🌸", "🚀", "💜", "🌙", "🔥", "✨", "🦊", "🍀"];
  const LS_NAME = "sh_chat_name";
  const LS_AV = "sh_chat_avatar";
  const staffByUser = Object.create(null);
  /** max long-edge px after compress */
  const IMG_MAX_EDGE = 960;
  const IMG_JPEG_Q = 0.72;

  function esc(t) {
    return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function isImageUrl(u) {
    const s = String(u || "");
    if (/\/chat-images\//i.test(s)) return true;
    if (/\/storage\/v1\/object\/public\/[^/]+\/.+\.(jpe?g|png|webp|gif)(\?|$)/i.test(s)) return true;
    if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(s)) return true;
    return false;
  }

  function isVideoPlatformUrl(u) {
    const s = String(u || "");
    return /(youtube\.com|youtu\.be|dailymotion\.com|dai\.ly|tiktok\.com|instagram\.com|facebook\.com|fb\.watch|twitter\.com|x\.com)\//i.test(s);
  }

  function linkifyAndMedia(escapedText, q) {
    // Work on escaped text: find URL-like tokens and replace with rich media or links
    const re =
      /(https?:\/\/[^\s<&]+|www\.[^\s<&]+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<&]*)?)/gi;
    return String(escapedText || "").replace(re, (match) => {
      let href = match;
      if (!/^https?:\/\//i.test(href)) href = "https://" + href;
      if (/^(javascript|data|vbscript):/i.test(href)) return match;
      const safeHref = href.replace(/"/g, "&quot;");
      if (isImageUrl(href)) {
        return (
          '<a class="chat-img-wrap" href="' +
          safeHref +
          '" target="_blank" rel="noopener noreferrer">' +
          '<img class="chat-img" src="' +
          safeHref +
          '" alt="gambar chat" loading="lazy" />' +
          "</a>"
        );
      }
      if (isVideoPlatformUrl(href)) {
        let thumb = "";
        try {
          if (window.GalleryDB && GalleryDB.videoThumbnailHint) thumb = GalleryDB.videoThumbnailHint(href) || "";
        } catch (e) {}
        const thumbAttr = thumb ? ' data-thumb="' + thumb.replace(/"/g, "&quot;") + '"' : "";
        return (
          '<a class="chat-vid-card" href="' +
          safeHref +
          '" target="_blank" rel="noopener noreferrer" data-vid-url="' +
          safeHref +
          '"' +
          thumbAttr +
          ">" +
          (thumb
            ? '<img class="chat-vid-thumb" src="' + thumb.replace(/"/g, "&quot;") + '" alt="" loading="lazy" />'
            : '<span class="chat-vid-ph">▶</span>') +
          '<span class="chat-vid-meta"><span class="chat-vid-title">Video</span><span class="chat-vid-url">' +
          match +
          "</span></span></a>"
        );
      }
      return (
        '<a class="chat-link" href="' +
        safeHref +
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

  function canShowActions(m) {
    if (!myUserId) return false;
    const ownerId = m.user_id ? String(m.user_id) : "";
    if (ownerId && ownerId === myUserId) return true;
    if (!iAmStaff) return false;
    if (ownerId && staffByUser[ownerId] === true) return false;
    return true;
  }

  function enrichVideoCards(root) {
    if (!root || !window.GalleryDB || !GalleryDB.fetchVideoMeta) return;
    root.querySelectorAll("a.chat-vid-card[data-vid-url]").forEach(async (a) => {
      if (a.dataset.enriched) return;
      a.dataset.enriched = "1";
      const url = a.getAttribute("data-vid-url");
      try {
        const meta = await GalleryDB.fetchVideoMeta(url);
        if (!meta) return;
        const titleEl = a.querySelector(".chat-vid-title");
        if (titleEl && meta.title) titleEl.textContent = meta.title;
        if (meta.thumbnail) {
          let img = a.querySelector(".chat-vid-thumb");
          if (!img) {
            const ph = a.querySelector(".chat-vid-ph");
            img = document.createElement("img");
            img.className = "chat-vid-thumb";
            img.loading = "lazy";
            img.alt = "";
            if (ph) ph.replaceWith(img);
            else a.insertBefore(img, a.firstChild);
          }
          img.src = meta.thumbnail;
        }
      } catch (e) {}
    });
  }

  function renderMessages() {
    if (!log) return;
    const q = getSearchQ();
    log.innerHTML = "";
    const filtered = q ? allMessages.filter((m) => msgMatches(m, q)) : allMessages;
    filtered.forEach((m) => appendBubble(m, q));
    log.scrollTop = log.scrollHeight;
    enrichVideoCards(log);
    if (status && window.GalleryDB && GalleryDB.enabled()) {
      if (q) {
        status.textContent =
          filtered.length + " dari " + allMessages.length + ' pesan cocok · "' + q + '"';
      }
    }
  }

  function appendBubble(m, q) {
    const div = document.createElement("div");
    div.className = "chat-bubble";
    div.dataset.id = m.id || "";
    const t = m.created_at ? new Date(m.created_at).toLocaleString("id-ID") : "";
    const edited =
      m.updated_at && m.created_at && String(m.updated_at) !== String(m.created_at)
        ? ' <small class="chat-edited">(diedit)</small>'
        : "";
    const av = m.avatar_emoji || "💬";
    const bodyEsc = esc(m.body);
    const bodyHtml = linkifyAndMedia(highlight(bodyEsc, q || ""), q);
    let actions = "";
    if (canShowActions(m)) {
      actions =
        '<div class="chat-actions">' +
        '<button type="button" class="chat-act chat-act-edit" data-act="edit" title="Ubah">Ubah</button>' +
        '<button type="button" class="chat-act chat-act-del" data-act="del" title="Hapus">Hapus</button>' +
        "</div>";
    }
    div.innerHTML =
      '<div class="chat-av">' +
      esc(av) +
      "</div>" +
      '<div class="chat-body"><strong>' +
      esc(m.author_name) +
      "</strong> <small>" +
      esc(t) +
      "</small>" +
      edited +
      '<div class="chat-text">' +
      bodyHtml +
      "</div>" +
      actions +
      "</div>";
    log.appendChild(div);
  }

  function upsertLocal(m) {
    const i = allMessages.findIndex((x) => x.id === m.id);
    if (i >= 0) allMessages[i] = Object.assign({}, allMessages[i], m);
    else allMessages.push(m);
  }

  function removeLocal(id) {
    allMessages = allMessages.filter((x) => x.id !== id);
  }

  function addMsg(m) {
    upsertLocal(m);
    const q = getSearchQ();
    if (msgMatches(m, q)) {
      const existing =
        log && m.id && log.querySelector('.chat-bubble[data-id="' + String(m.id).replace(/"/g, "") + '"]');
      if (existing) renderMessages();
      else {
        appendBubble(m, q);
        log.scrollTop = log.scrollHeight;
        enrichVideoCards(divLast());
      }
    }
    if (q && status) {
      const n = allMessages.filter((x) => msgMatches(x, q)).length;
      status.textContent = n + " dari " + allMessages.length + ' pesan cocok · "' + q + '"';
    }
  }

  function divLast() {
    return log ? log.lastElementChild : null;
  }

  function onUpdateMsg(m) {
    upsertLocal(m);
    renderMessages();
  }

  function onDeleteMsg(oldRow) {
    if (!oldRow || !oldRow.id) return;
    removeLocal(oldRow.id);
    renderMessages();
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

  /** Compress image via canvas → JPEG Blob */
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (!w || !h) {
          reject(new Error("Gambar tidak valid"));
          return;
        }
        const scale = Math.min(1, IMG_MAX_EDGE / Math.max(w, h));
        w = Math.round(w * scale);
        h = Math.round(h * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (!blob) reject(new Error("Gagal kompres gambar"));
            else resolve(blob);
          },
          "image/jpeg",
          IMG_JPEG_Q
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Gagal memuat gambar"));
      };
      img.src = url;
    });
  }

  async function sendImageFile(file) {
    if (!file || !String(file.type || "").startsWith("image/")) return;
    if (!GalleryDB.enabled()) {
      status.textContent = "Database belum dikonfigurasi.";
      return;
    }
    if (uploading) return;
    uploading = true;
    status.textContent = "Mengompres & mengunggah gambar…";
    try {
      const blob = await compressImage(file);
      const publicUrl = await GalleryDB.uploadChatImage(blob);
      if (!publicUrl) throw new Error("Upload gagal");
      const caption = (chatInput && chatInput.value.trim()) || "";
      const body = caption ? caption + "\n" + publicUrl : publicUrl;
      const row = await GalleryDB.sendChat({
        angkatanId: room.value || null,
        authorName: resolveAuthorName(),
        body,
        avatarEmoji: selectedAvatar,
      });
      if (chatInput) chatInput.value = "";
      if (typingCtl) typingCtl.setTyping(false);
      if (row && row.id && !allMessages.some((m) => m.id === row.id)) addMsg(row);
      status.textContent = "Gambar terkirim (otomatis hapus ~24 jam)";
    } catch (e) {
      status.textContent = e.message || String(e);
    } finally {
      uploading = false;
    }
  }

  async function resolveSessionContext() {
    loginDisplayName = "";
    myUserId = null;
    iAmStaff = false;
    try {
      if (!window.GalleryDB || !GalleryDB.enabled()) return;
      const session = await GalleryDB.getSession();
      if (!session || !session.user) return;
      myUserId = session.user.id;
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
          iAmStaff = !!(
            prof.is_admin ||
            /^(teacher|pengajar|guru)$/i.test(String(prof.role || ""))
          );
        }
      } catch (e) {}
      try {
        if (!iAmStaff && typeof GalleryDB.isCurrentUserStaff === "function") {
          iAmStaff = await GalleryDB.isCurrentUserStaff();
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
    room.innerHTML = '<option value="">Lintas angkatan (global)</option>';
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
          typingLine.textContent = (typing[0].avatar || "") + " " + typing[0].name + " sedang mengetik…";
        } else {
          typingLine.textContent = typing.length + " orang sedang mengetik…";
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
      unsub = GalleryDB.subscribeChat({
        angkatanId,
        onInsert: addMsg,
        onUpdate: onUpdateMsg,
        onDelete: onDeleteMsg,
      });
      bindTyping();
    } catch (e) {
      status.textContent = "Gagal: " + (e.message || e);
    }
  }

  async function handleEdit(msg) {
    const current = String(msg.body || "");
    const next = window.prompt("Ubah pesan:", current);
    if (next === null) return;
    const text = String(next).trim();
    if (!text) {
      status.textContent = "Pesan tidak boleh kosong";
      return;
    }
    if (text === current) return;
    status.textContent = "Menyimpan…";
    try {
      const updated = await GalleryDB.updateChat({ id: msg.id, body: text });
      upsertLocal(updated);
      renderMessages();
      status.textContent = "Pesan diperbarui";
    } catch (e) {
      status.textContent = e.message || String(e);
    }
  }

  async function handleDelete(msg) {
    if (!window.confirm("Hapus pesan ini?")) return;
    status.textContent = "Menghapus…";
    try {
      await GalleryDB.deleteChat({ id: msg.id });
      removeLocal(msg.id);
      renderMessages();
      status.textContent = "Pesan dihapus";
    } catch (e) {
      status.textContent = e.message || String(e);
    }
  }

  if (log) {
    log.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-act]");
      if (!btn) return;
      const bubble = btn.closest(".chat-bubble");
      if (!bubble) return;
      const id = bubble.dataset.id;
      const msg = allMessages.find((m) => m.id === id);
      if (!msg) return;
      if (btn.dataset.act === "edit") handleEdit(msg);
      else if (btn.dataset.act === "del") handleDelete(msg);
    });
  }

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

  if (chatInput) {
    chatInput.addEventListener("input", () => {
      saveProfile();
      if (!typingCtl) return;
      typingCtl.setTyping(true);
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => typingCtl && typingCtl.setTyping(false), 1200);
    });
    chatInput.addEventListener("paste", (ev) => {
      const items = ev.clipboardData && ev.clipboardData.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.type && it.type.startsWith("image/")) {
          ev.preventDefault();
          const file = it.getAsFile();
          if (file) sendImageFile(file);
          return;
        }
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      const f = fileInput.files && fileInput.files[0];
      if (f) sendImageFile(f);
      fileInput.value = "";
    });
  }

  if (chatForm) {
    chatForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      saveProfile();
      const body = chatInput ? chatInput.value : "";
      if (!String(body || "").trim()) return;
      try {
        const row = await GalleryDB.sendChat({
          angkatanId: room.value || null,
          authorName: resolveAuthorName(),
          body,
          avatarEmoji: selectedAvatar,
        });
        if (chatInput) chatInput.value = "";
        if (typingCtl) typingCtl.setTyping(false);
        if (row && row.id && !allMessages.some((m) => m.id === row.id)) addMsg(row);
      } catch (e) {
        status.textContent = e.message || String(e);
      }
    });
  }

  room.addEventListener("change", joinRoom);

  resolveSessionContext().then(() => {
    loadRooms().then(joinRoom);
  });
})();
