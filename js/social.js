/**
 * Love (merah=anon / biru=login) + komentar + modal
 */
(function (global) {
  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function ensureModal() {
    let m = document.getElementById("sh-social-modal");
    if (m) return m;
    m = document.createElement("div");
    m.id = "sh-social-modal";
    m.className = "sh-modal";
    m.hidden = true;
    m.innerHTML = `
      <div class="sh-modal-card">
        <button type="button" class="sh-modal-x" aria-label="Tutup">×</button>
        <h3 id="sh-modal-title">Interaksi</h3>
        <p id="sh-modal-hint" class="muted" style="font-size:13px"></p>
        <label class="field" id="sh-name-wrap"><span>Nama</span>
          <input id="sh-author-name" type="text" maxlength="60" placeholder="Nama kamu">
        </label>
        <label class="field" id="sh-body-wrap" hidden><span>Komentar</span>
          <textarea id="sh-comment-body" rows="3" maxlength="500" placeholder="Tulis komentar..."></textarea>
        </label>
        <button type="button" class="btn btn-primary" id="sh-modal-go">Kirim</button>
        <p id="sh-modal-err" class="muted" style="font-size:12px;color:#ffb4b4"></p>
        <div id="sh-comment-list" class="admin-list" style="margin-top:12px;max-height:220px;overflow:auto"></div>
      </div>`;
    document.body.appendChild(m);
    m.querySelector(".sh-modal-x").onclick = () => {
      m.hidden = true;
    };
    m.addEventListener("click", (e) => {
      if (e.target === m) m.hidden = true;
    });
    return m;
  }

  async function isLoggedIn() {
    try {
      if (!window.GalleryDB) return false;
      const s = await GalleryDB.getSession();
      return !!(s && s.user);
    } catch (e) {
      return false;
    }
  }

  function barHtml(targetType, targetId, counts) {
    const c = counts || {};
    return `<div class="react-bar" data-tt="${esc(targetType)}" data-tid="${esc(targetId)}">
      <button type="button" class="react-btn love-red" data-act="love" title="Love (tamu)">♥ <span class="n-lr">${c.loveRed || 0}</span></button>
      <button type="button" class="react-btn love-blue" data-act="love" title="Love (login)">♥ <span class="n-lb">${c.loveBlue || 0}</span></button>
      <button type="button" class="react-btn cmt-red" data-act="comment" title="Komentar (tamu)">💬 <span class="n-cr">${c.commentRed || 0}</span></button>
      <button type="button" class="react-btn cmt-blue" data-act="comment" title="Komentar (login)">💬 <span class="n-cb">${c.commentBlue || 0}</span></button>
    </div>`;
  }

  function applyCounts(bar, c) {
    if (!bar || !c) return;
    const set = (sel, v) => {
      const el = bar.querySelector(sel);
      if (el) el.textContent = v;
    };
    set(".n-lr", c.loveRed || 0);
    set(".n-lb", c.loveBlue || 0);
    set(".n-cr", c.commentRed || 0);
    set(".n-cb", c.commentBlue || 0);
  }

  async function hydrate(root) {
    if (!window.GalleryDB || !GalleryDB.enabled()) return;
    const bars = (root || document).querySelectorAll(".react-bar");
    for (const bar of bars) {
      try {
        const c = await GalleryDB.countReactions(bar.dataset.tt, bar.dataset.tid);
        applyCounts(bar, c);
      } catch (e) {}
    }
  }

  function bind(root) {
    (root || document).querySelectorAll(".react-bar").forEach((bar) => {
      if (bar.dataset.bound) return;
      bar.dataset.bound = "1";
      bar.querySelectorAll(".react-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openModal(bar.dataset.tt, bar.dataset.tid, btn.dataset.act);
        });
      });
    });
  }

  async function openModal(targetType, targetId, act) {
    const m = ensureModal();
    const logged = await isLoggedIn();
    m.hidden = false;
    m.dataset.tt = targetType;
    m.dataset.tid = targetId;
    m.dataset.act = act;

    const nameWrap = document.getElementById("sh-name-wrap");
    const bodyWrap = document.getElementById("sh-body-wrap");
    const title = document.getElementById("sh-modal-title");
    const hint = document.getElementById("sh-modal-hint");
    const err = document.getElementById("sh-modal-err");
    err.textContent = "";

    if (act === "love") {
      title.textContent = "Berikan love";
      bodyWrap.hidden = true;
      hint.textContent = logged
        ? "Kamu login → love biru. Satu love per akun per karya."
        : "Tanpa login → love merah. Isi nama, atau login Google untuk love biru.";
    } else {
      title.textContent = "Tulis komentar";
      bodyWrap.hidden = false;
      hint.textContent = logged
        ? "Kamu login → komentar biru."
        : "Tanpa login → komentar merah. Isi nama + komentar.";
    }
    nameWrap.style.display = logged ? "none" : "flex";

    // load comments preview
    const list = document.getElementById("sh-comment-list");
    list.innerHTML = "Memuat komentar...";
    try {
      const rows = await GalleryDB.listComments(targetType, targetId);
      list.innerHTML =
        rows
          .map(
            (r) =>
              `<div class="admin-row" style="flex-direction:column;align-items:flex-start">
            <strong style="color:${r.is_registered ? "#7db8ff" : "#ff8a9a"}">${esc(r.author_name)}</strong>
            <span style="font-size:13px">${esc(r.body)}</span>
          </div>`
          )
          .join("") || "<p class='muted'>Belum ada komentar.</p>";
    } catch (e) {
      list.innerHTML = "";
    }

    document.getElementById("sh-modal-go").onclick = async () => {
      err.textContent = "";
      try {
        const name = document.getElementById("sh-author-name").value;
        if (act === "love") {
          const c = await GalleryDB.addLove(targetType, targetId, name);
          document.querySelectorAll(`.react-bar[data-tid="${CSS.escape(targetId)}"]`).forEach((b) => applyCounts(b, c));
          m.hidden = true;
        } else {
          const body = document.getElementById("sh-comment-body").value;
          const c = await GalleryDB.addComment(targetType, targetId, name, body);
          document.querySelectorAll(`.react-bar[data-tid="${CSS.escape(targetId)}"]`).forEach((b) => applyCounts(b, c));
          document.getElementById("sh-comment-body").value = "";
          // refresh list
          openModal(targetType, targetId, "comment");
        }
      } catch (e) {
        err.textContent = e.message || String(e);
      }
    };
  }

  global.SHSocial = { barHtml, hydrate, bind, openModal };
})(window);
