(() => {
  const $ = (s) => document.querySelector(s);
  const log = $("#chatLog");
  const room = $("#chatRoom");
  const status = $("#chatStatus");
  const typingLine = $("#typingLine");
  let unsub = null;
  let typingCtl = null;
  let typingTimer = null;

  const LS_NAME = "sh_chat_name";
  const LS_AV = "sh_chat_avatar";
  $("#chatName").value = localStorage.getItem(LS_NAME) || "";
  const savedAv = localStorage.getItem(LS_AV);
  if (savedAv) $("#chatAvatar").value = savedAv;

  function esc(t) {
    return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function addMsg(m) {
    const div = document.createElement("div");
    div.className = "chat-bubble";
    const t = m.created_at ? new Date(m.created_at).toLocaleString("id-ID") : "";
    const av = m.avatar_emoji || "💬";
    div.innerHTML = `<div class="chat-av">${esc(av)}</div><div class="chat-body"><strong>${esc(m.author_name)}</strong> <small>${esc(t)}</small><div>${esc(m.body)}</div></div>`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  function saveProfile() {
    localStorage.setItem(LS_NAME, $("#chatName").value.trim());
    localStorage.setItem(LS_AV, $("#chatAvatar").value);
  }

  async function loadRooms() {
    room.innerHTML = `<option value="">Lintas angkatan (global)</option>`;
    if (!GalleryDB.enabled()) {
      status.textContent = "Supabase belum dikonfigurasi.";
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
      userName: $("#chatName").value.trim() || "Anonim",
      avatarEmoji: $("#chatAvatar").value,
      onSync(people) {
        const me = ($("#chatName").value.trim() || "Anonim").toLowerCase();
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
    log.innerHTML = "";
    typingLine.textContent = "";
    if (!GalleryDB.enabled()) return;
    const angkatanId = room.value || null;
    status.textContent = "Memuat pesan...";
    try {
      const rows = await GalleryDB.listChat({ angkatanId, limit: 150 });
      rows.forEach(addMsg);
      status.textContent = angkatanId ? "Ruang angkatan" : "Ruang lintas angkatan · realtime aktif";
      unsub = GalleryDB.subscribeChat({ angkatanId, onInsert: addMsg });
      bindTyping();
    } catch (e) {
      status.textContent = "Gagal: " + (e.message || e);
    }
  }

  $("#chatInput").addEventListener("input", () => {
    saveProfile();
    if (!typingCtl) return;
    typingCtl.setTyping(true);
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => typingCtl && typingCtl.setTyping(false), 1200);
  });
  $("#chatName").addEventListener("change", () => { saveProfile(); bindTyping(); });
  $("#chatAvatar").addEventListener("change", () => { saveProfile(); bindTyping(); });

  $("#chatForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    saveProfile();
    try {
      await GalleryDB.sendChat({
        angkatanId: room.value || null,
        authorName: $("#chatName").value,
        body: $("#chatInput").value,
        avatarEmoji: $("#chatAvatar").value,
      });
      $("#chatInput").value = "";
      if (typingCtl) typingCtl.setTyping(false);
    } catch (e) {
      status.textContent = e.message || String(e);
    }
  });

  room.addEventListener("change", joinRoom);
  loadRooms().then(joinRoom);
})();
