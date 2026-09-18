(() => {
  const $ = (s) => document.querySelector(s);
  const log = $("#chatLog");
  const room = $("#chatRoom");
  const status = $("#chatStatus");
  let unsub = null;

  function esc(t) {
    return String(t || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }
  function addMsg(m, mine) {
    const div = document.createElement("div");
    div.className = "chat-bubble" + (mine ? " mine" : "");
    const t = m.created_at ? new Date(m.created_at).toLocaleString("id-ID") : "";
    div.innerHTML = `<strong>${esc(m.author_name)}</strong> <small>${esc(t)}</small><div>${esc(m.body)}</div>`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
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
        opt.textContent = "Angkatan: " + a.label;
        room.appendChild(opt);
      });
    } catch (e) {
      status.textContent = e.message || String(e);
    }
  }

  async function joinRoom() {
    if (unsub) unsub();
    log.innerHTML = "";
    if (!GalleryDB.enabled()) return;
    const angkatanId = room.value || null;
    status.textContent = "Memuat pesan...";
    try {
      const rows = await GalleryDB.listChat({ angkatanId, limit: 150 });
      rows.forEach((m) => addMsg(m, false));
      status.textContent = angkatanId ? "Ruang angkatan" : "Ruang lintas angkatan";
      unsub = GalleryDB.subscribeChat({
        angkatanId,
        onInsert: (m) => addMsg(m, false),
      });
    } catch (e) {
      status.textContent = "Gagal: " + (e.message || e);
    }
  }

  $("#chatForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    try {
      const body = $("#chatInput").value;
      const authorName = $("#chatName").value;
      await GalleryDB.sendChat({
        angkatanId: room.value || null,
        authorName,
        body,
      });
      $("#chatInput").value = "";
    } catch (e) {
      status.textContent = e.message || String(e);
    }
  });

  room.addEventListener("change", joinRoom);
  loadRooms().then(joinRoom);
})();
