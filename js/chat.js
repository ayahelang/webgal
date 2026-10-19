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
  let replyToId = null;
  let replyToMeta = null; // { author_name, body, depth }


  const AVATARS = ["🎓", "💬", "🌟", "🦋", "🌸", "🚀", "💜", "🌙", "🔥", "✨", "🦊", "🍀"];
  const LS_NAME = "sh_chat_name";
  const LS_AV = "sh_chat_avatar";
  const staffByUser = Object.create(null);
  /** max long-edge px after compress */
  const IMG_MAX_EDGE = 960;
  const IMG_JPEG_Q = 0.72;
  let audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    return audioCtx;
  }

  /** Soft chime for new incoming message */
  function playNotifSound() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") ctx.resume();
      const t0 = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(880, t0);
      o.frequency.exponentialRampToValueAtTime(660, t0 + 0.12);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.3);
    } catch (e) {}
  }

  /** Distinct higher/double beep when someone replies to your message */
  function playReplyToMeSound() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") ctx.resume();
      const t0 = ctx.currentTime;
      [0, 0.12].forEach((off, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(i === 0 ? 1046 : 1318, t0 + off);
        g.gain.setValueAtTime(0.0001, t0 + off);
        g.gain.exponentialRampToValueAtTime(0.14, t0 + off + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.18);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t0 + off);
        o.stop(t0 + off + 0.2);
      });
    } catch (e) {}
  }

  function autoResizeInput() {
    if (!chatInput || chatInput.tagName !== "TEXTAREA") return;
    chatInput.style.height = "auto";
    const maxH = (parseFloat(getComputedStyle(chatInput).lineHeight) || 20) * 4 + 16;
    const h = Math.min(chatInput.scrollHeight, maxH);
    chatInput.style.height = h + "px";
    chatInput.style.overflowY = chatInput.scrollHeight > maxH ? "auto" : "hidden";
  }

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


  function msgById(id) {
    return allMessages.find((m) => m.id === id) || null;
  }

  function depthOf(m, map) {
    let d = 0;
    let cur = m && m.reply_to ? String(m.reply_to) : "";
    const seen = Object.create(null);
    while (cur && d < 5) {
      if (seen[cur]) break;
      seen[cur] = true;
      d += 1;
      const p = map[cur] || msgById(cur);
      cur = p && p.reply_to ? String(p.reply_to) : "";
    }
    return d;
  }

  function canReplyTo(m) {
    if (!m || !m.id) return false;
    const map = Object.create(null);
    allMessages.forEach((x) => { if (x.id) map[x.id] = x; });
    return depthOf(m, map) < 2; // levels 0,1,2 only
  }

  function setReplyTarget(m) {
    if (!m || !canReplyTo(m)) {
      if (m && !canReplyTo(m)) status.textContent = "Balasan maksimal 3 level";
      return;
    }
    replyToId = m.id;
    replyToMeta = { author_name: m.author_name, body: m.body };
    const bar = $("#chatReplyBar");
    const lab = $("#chatReplyLabel");
    if (bar) bar.hidden = false;
    if (lab) {
      const snip = String(m.body || "").replace(/\s+/g, " ").slice(0, 60);
      lab.textContent = "Membalas " + (m.author_name || "Anonim") + ": " + snip;
    }
    if (chatInput) chatInput.focus();
  }

  function clearReplyTarget() {
    replyToId = null;
    replyToMeta = null;
    const bar = $("#chatReplyBar");
    if (bar) bar.hidden = true;
  }

  function orderedForDisplay(list) {
    // Keep chronological; indent by depth. Flat list is fine for UX.
    return list.slice().sort((a, b) => {
      const ta = a.created_at ? Date.parse(a.created_at) : 0;
      const tb = b.created_at ? Date.parse(b.created_at) : 0;
      return ta - tb;
    });
  }

  function renderMessages() {
    if (!log) return;
    const q = getSearchQ();
    log.innerHTML = "";
    const base = q ? allMessages.filter((m) => msgMatches(m, q)) : allMessages;
    const filtered = orderedForDisplay(base);
    const map = Object.create(null);
    allMessages.forEach((x) => { if (x.id) map[x.id] = x; });
    filtered.forEach((m) => appendBubble(m, q, depthOf(m, map)));
    log.scrollTop = log.scrollHeight;
    enrichVideoCards(log);
    if (status && window.GalleryDB && GalleryDB.enabled()) {
      if (q) {
        status.textContent =
          filtered.length + " dari " + allMessages.length + ' pesan cocok · "' + q + '"';
      }
    }
  }

  function applyTextClamp(textEl) {
    if (!textEl) return;
    textEl.classList.remove("is-clamped", "is-expanded");
    const prevMore = textEl.parentElement && textEl.parentElement.querySelector(".chat-text-more");
    if (prevMore) prevMore.remove();
    requestAnimationFrame(() => {
      const lineH = parseFloat(getComputedStyle(textEl).lineHeight) || 18;
      const max4 = lineH * 4 + 2;
      if (textEl.scrollHeight > max4 + 4) {
        textEl.classList.add("is-clamped");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chat-text-more";
        btn.textContent = "Baca selengkapnya";
        btn.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (textEl.classList.contains("is-expanded")) {
            textEl.classList.remove("is-expanded");
            textEl.classList.add("is-clamped");
            btn.textContent = "Baca selengkapnya";
          } else {
            textEl.classList.remove("is-clamped");
            textEl.classList.add("is-expanded");
            btn.textContent = "Tutup";
          }
        });
        textEl.insertAdjacentElement("afterend", btn);
      }
    });
  }

  function appendBubble(m, q, depth) {
    const div = document.createElement("div");
    div.className = "chat-bubble" + (depth ? " chat-depth-" + Math.min(depth, 2) : "");
    div.dataset.id = m.id || "";
    if (m.reply_to) div.dataset.replyTo = m.reply_to;
    const t = m.created_at ? new Date(m.created_at).toLocaleString("id-ID") : "";
    const edited =
      m.updated_at && m.created_at && String(m.updated_at) !== String(m.created_at)
        ? ' <small class="chat-edited">(diedit)</small>'
        : "";
    const av = m.avatar_emoji || "💬";
    const bodyEsc = esc(m.body);
    const bodyHtml = linkifyAndMedia(highlight(bodyEsc, q || ""), q);
    let parentHtml = "";
    if (m.reply_to) {
      const parent = msgById(m.reply_to);
      if (parent) {
        const snip = esc(String(parent.body || "").replace(/\s+/g, " ").slice(0, 80));
        parentHtml =
          '<div class="chat-reply-ref">↩ ' +
          esc(parent.author_name || "Anonim") +
          ": " +
          snip +
          "</div>";
      } else {
        parentHtml = '<div class="chat-reply-ref">↩ balasan</div>';
      }
    }
    let actions = '<div class="chat-actions">';
    if (canReplyTo(m)) {
      actions +=
        '<button type="button" class="chat-act chat-act-reply" data-act="reply" title="Balas">Balas</button>';
    }
    if (canShowActions(m)) {
      actions +=
        '<button type="button" class="chat-act chat-act-edit" data-act="edit" title="Ubah">Ubah</button>' +
        '<button type="button" class="chat-act chat-act-del" data-act="del" title="Hapus">Hapus</button>';
    }
    actions += "</div>";
    if (!canReplyTo(m) && !canShowActions(m)) actions = "";
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
      parentHtml +
      '<div class="chat-text">' +
      bodyHtml +
      "</div>" +
      actions +
      "</div>";
    log.appendChild(div);
    applyTextClamp(div.querySelector(".chat-text"));
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
    const isNew = !allMessages.some((x) => x.id === m.id);
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
    // Notification sound for incoming messages (not own)
    if (isNew && m && m.id) {
      const ownerId = m.user_id ? String(m.user_id) : "";
      const isMine = myUserId && ownerId && ownerId === myUserId;
      if (!isMine) {
        let isReplyToMe = false;
        if (m.reply_to) {
          const parent = msgById(m.reply_to);
          if (parent) {
            const pOwner = parent.user_id ? String(parent.user_id) : "";
            if (myUserId && pOwner && pOwner === myUserId) isReplyToMe = true;
            else if (!pOwner && parent.author_name && resolveAuthorName() &&
              String(parent.author_name).toLowerCase() === resolveAuthorName().toLowerCase()) {
              isReplyToMe = true;
            }
          }
        }
        if (isReplyToMe) playReplyToMeSound();
        else playNotifSound();
      }
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
        replyTo: replyToId,
      });
      if (chatInput) {
        chatInput.value = "";
        autoResizeInput();
      }
      clearReplyTarget();
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

  const CHAT_BODY_MAX = 8000;

  function closeAllInlineComposers(exceptBubble) {
    if (!log) return;
    log.querySelectorAll(".chat-inline-composer").forEach((el) => {
      if (exceptBubble && exceptBubble.contains(el)) return;
      el.remove();
    });
    log.querySelectorAll(".chat-bubble.is-editing").forEach((b) => {
      if (exceptBubble && b === exceptBubble) return;
      b.classList.remove("is-editing");
      const te = b.querySelector(".chat-text");
      if (te) te.hidden = false;
      const more = b.querySelector(".chat-text-more");
      if (more) more.hidden = false;
    });
  }

  function autoResizeEl(ta, maxLines) {
    if (!ta) return;
    ta.style.height = "auto";
    const lineH = parseFloat(getComputedStyle(ta).lineHeight) || 20;
    const maxH = lineH * (maxLines || 4) + 12;
    const h = Math.min(ta.scrollHeight, maxH);
    ta.style.height = h + "px";
    ta.style.overflowY = ta.scrollHeight > maxH ? "auto" : "hidden";
  }

  async function handleEdit(msg, bubble) {
    if (!bubble) bubble = log && log.querySelector('.chat-bubble[data-id="' + String(msg.id).replace(/"/g, "") + '"]');
    if (!bubble) return;
    closeAllInlineComposers(bubble);
    if (bubble.classList.contains("is-editing")) return;
    bubble.classList.add("is-editing");
    const textEl = bubble.querySelector(".chat-text");
    const moreBtn = bubble.querySelector(".chat-text-more");
    const actions = bubble.querySelector(".chat-actions");
    if (textEl) textEl.hidden = true;
    if (moreBtn) moreBtn.hidden = true;

    const wrap = document.createElement("div");
    wrap.className = "chat-inline-composer chat-inline-edit";
    wrap.innerHTML =
      '<textarea class="chat-inline-ta" maxlength="' +
      CHAT_BODY_MAX +
      '" rows="1"></textarea>' +
      '<div class="chat-inline-actions">' +
      '<button type="button" class="btn btn-primary chat-inline-save">Simpan</button>' +
      '<button type="button" class="chat-act chat-inline-cancel">Batal</button>' +
      "</div>";
    const ta = wrap.querySelector(".chat-inline-ta");
    ta.value = String(msg.body || "");
    if (actions) actions.insertAdjacentElement("beforebegin", wrap);
    else bubble.querySelector(".chat-body").appendChild(wrap);
    autoResizeEl(ta, 8);
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);

    ta.addEventListener("input", () => autoResizeEl(ta, 8));
    wrap.querySelector(".chat-inline-cancel").addEventListener("click", () => {
      wrap.remove();
      bubble.classList.remove("is-editing");
      if (textEl) textEl.hidden = false;
      if (moreBtn) moreBtn.hidden = false;
    });
    wrap.querySelector(".chat-inline-save").addEventListener("click", async () => {
      const text = String(ta.value || "").trim();
      if (!text) {
        status.textContent = "Pesan tidak boleh kosong";
        return;
      }
      if (text === String(msg.body || "")) {
        wrap.remove();
        bubble.classList.remove("is-editing");
        if (textEl) textEl.hidden = false;
        if (moreBtn) moreBtn.hidden = false;
        return;
      }
      status.textContent = "Menyimpan…";
      try {
        const updated = await GalleryDB.updateChat({ id: msg.id, body: text.slice(0, CHAT_BODY_MAX) });
        upsertLocal(updated);
        renderMessages();
        status.textContent = "Pesan diperbarui";
      } catch (e) {
        status.textContent = e.message || String(e);
      }
    });
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

  function openInlineReply(msg, bubble) {
    if (!bubble) return;
    if (!canReplyTo(msg)) {
      status.textContent = "Balasan maksimal 3 level";
      return;
    }
    closeAllInlineComposers(bubble);
    // remove existing reply composer on this bubble
    const existing = bubble.querySelector(".chat-inline-reply");
    if (existing) {
      existing.remove();
      return; // toggle off
    }
    replyToId = msg.id;
    replyToMeta = { author_name: msg.author_name, body: msg.body };
    const bar = $("#chatReplyBar");
    const lab = $("#chatReplyLabel");
    if (bar) bar.hidden = false;
    if (lab) {
      const snip = String(msg.body || "").replace(/\s+/g, " ").slice(0, 60);
      lab.textContent = "Membalas " + (msg.author_name || "Anonim") + ": " + snip;
    }

    const wrap = document.createElement("div");
    wrap.className = "chat-inline-composer chat-inline-reply";
    wrap.innerHTML =
      '<textarea class="chat-inline-ta" maxlength="' +
      CHAT_BODY_MAX +
      '" rows="1" placeholder="Tulis balasan…"></textarea>' +
      '<div class="chat-inline-actions">' +
      '<button type="button" class="btn btn-primary chat-inline-send">Kirim</button>' +
      '<button type="button" class="chat-act chat-inline-cancel">Batal</button>' +
      "</div>";
    const actions = bubble.querySelector(".chat-actions");
    if (actions) actions.insertAdjacentElement("afterend", wrap);
    else bubble.querySelector(".chat-body").appendChild(wrap);
    const ta = wrap.querySelector(".chat-inline-ta");
    autoResizeEl(ta, 4);
    ta.focus();

    ta.addEventListener("input", () => {
      autoResizeEl(ta, 4);
      if (typingCtl) {
        typingCtl.setTyping(true);
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => typingCtl && typingCtl.setTyping(false), 1200);
      }
    });
    ta.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        wrap.querySelector(".chat-inline-send").click();
      }
    });
    wrap.querySelector(".chat-inline-cancel").addEventListener("click", () => {
      wrap.remove();
      clearReplyTarget();
    });
    wrap.querySelector(".chat-inline-send").addEventListener("click", async () => {
      const body = String(ta.value || "").trim();
      if (!body) return;
      try {
        const row = await GalleryDB.sendChat({
          angkatanId: room.value || null,
          authorName: resolveAuthorName(),
          body: body.slice(0, CHAT_BODY_MAX),
          avatarEmoji: selectedAvatar,
          replyTo: msg.id,
        });
        wrap.remove();
        clearReplyTarget();
        if (typingCtl) typingCtl.setTyping(false);
        if (row && row.id && !allMessages.some((m) => m.id === row.id)) addMsg(row);
        status.textContent = "Balasan terkirim";
      } catch (e) {
        status.textContent = e.message || String(e);
      }
    });
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
      if (btn.dataset.act === "edit") handleEdit(msg, bubble);
      else if (btn.dataset.act === "del") handleDelete(msg);
      else if (btn.dataset.act === "reply") openInlineReply(msg, bubble);
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
      autoResizeInput();
      saveProfile();
      if (!typingCtl) return;
      typingCtl.setTyping(true);
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => typingCtl && typingCtl.setTyping(false), 1200);
    });
    // Enter kirim, Shift+Enter baris baru
    chatInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        if (chatForm) chatForm.requestSubmit();
      }
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
      // after text paste, resize
      setTimeout(autoResizeInput, 0);
    });
    // initial size
    autoResizeInput();
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
          replyTo: replyToId,
        });
        if (chatInput) {
          chatInput.value = "";
          autoResizeInput();
        }
        clearReplyTarget();
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


  // --- Floating window: dock / float / max / min ---
  (function initChatWindow() {
    const win = $("#chatWin");
    const bar = $("#chatWinBar");
    if (!win || !bar) return;
    const LS_MODE = "sh_chat_win_mode";
    const LS_POS = "sh_chat_win_pos";
    // Jika datang dari halaman lain dengan niat restore, jangan tetap di min
    try {
      if (sessionStorage.getItem("sh_chat_restore") === "1") {
        sessionStorage.removeItem("sh_chat_restore");
        localStorage.setItem(LS_MODE, window.innerWidth < 720 ? "dock" : "float");
      }
    } catch (e) {}
    let mode = localStorage.getItem(LS_MODE) || "dock";
    let dragging = false;
    let ox = 0, oy = 0;

    // Ensure restore FAB exists and is attached to <body> (not trapped in main stacking)
    let restore = $("#chatWinRestore");
    if (!restore) {
      restore = document.createElement("button");
      restore.type = "button";
      restore.id = "chatWinRestore";
      restore.className = "chat-win-restore";
      restore.title = "Buka kembali chat";
      restore.textContent = "💬 Chat";
      restore.setAttribute("hidden", "");
    }
    if (restore.parentElement !== document.body) {
      document.body.appendChild(restore);
    }

    function restoreTarget() {
      return window.innerWidth < 720 ? "dock" : "float";
    }

    function setRestoreVisible(on) {
      if (!restore) return;
      if (on) {
        restore.classList.add("is-visible");
        restore.removeAttribute("hidden");
        restore.setAttribute("aria-hidden", "false");
        restore.style.display = "inline-flex";
      } else {
        restore.classList.remove("is-visible");
        restore.setAttribute("hidden", "");
        restore.setAttribute("aria-hidden", "true");
        restore.style.display = "none";
      }
    }

    function applyMode(m) {
      if (!m || !["dock", "float", "max", "min"].includes(m)) m = "dock";
      mode = m;
      win.classList.remove("mode-dock", "mode-float", "mode-max", "mode-min");
      win.classList.add("mode-" + m);
      win.dataset.mode = m;
      try { localStorage.setItem(LS_MODE, m); } catch (e) {}
      document.body.classList.toggle("chat-is-min", m === "min");
      setRestoreVisible(m === "min");
      if (m === "float") {
        try {
          const pos = JSON.parse(localStorage.getItem(LS_POS) || "null");
          if (pos && typeof pos.left === "number") {
            win.style.left = pos.left + "px";
            win.style.top = pos.top + "px";
          } else {
            win.style.left = "12px";
            win.style.top = "64px";
          }
        } catch (e) {}
      }
      if (m === "dock" || m === "max") {
        win.style.left = "";
        win.style.top = "";
      }
    }

    bar.querySelectorAll("[data-win]").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        applyMode(btn.getAttribute("data-win"));
      });
    });

    function doRestore(ev) {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      if (mode !== "min") return;
      applyMode(restoreTarget());
    }
    restore.addEventListener("click", doRestore);
    restore.addEventListener("touchend", doRestore, { passive: false });

    bar.addEventListener("pointerdown", (ev) => {
      if (mode !== "float") return;
      if (ev.target.closest("[data-win]")) return;
      dragging = true;
      const rect = win.getBoundingClientRect();
      ox = ev.clientX - rect.left;
      oy = ev.clientY - rect.top;
      try { bar.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    bar.addEventListener("pointermove", (ev) => {
      if (!dragging) return;
      const left = Math.max(0, Math.min(window.innerWidth - 80, ev.clientX - ox));
      const top = Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - oy));
      win.style.left = left + "px";
      win.style.top = top + "px";
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      try {
        localStorage.setItem(
          LS_POS,
          JSON.stringify({ left: parseInt(win.style.left, 10) || 0, top: parseInt(win.style.top, 10) || 0 })
        );
      } catch (e) {}
    }
    bar.addEventListener("pointerup", endDrag);
    bar.addEventListener("pointercancel", endDrag);

    const cancelBtn = $("#chatReplyCancel");
    if (cancelBtn) cancelBtn.addEventListener("click", clearReplyTarget);

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && mode === "min") applyMode("dock");
    });

    // Safety: if stuck in min with no visible restore, force dock after load
    applyMode(mode);
    if (mode === "min") {
      requestAnimationFrame(() => {
        const r = restore.getBoundingClientRect();
        if (!r.width || !r.height || restore.offsetParent === null) {
          // still not painted — force visible again
          setRestoreVisible(true);
        }
      });
    }
  })();

})();