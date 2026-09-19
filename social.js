/**
 * Love/komentar mini di tiap link + collapse komentar
 * Merah = tamu, biru = login Google
 */
(function (global) {
  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  async function loggedIn() {
    try {
      if (!window.GalleryDB) return false;
      const s = await GalleryDB.getSession();
      return !!(s && s.user);
    } catch (e) {
      return false;
    }
  }

  /** Mini bar: 4 ikon kecil + angka */
  function miniBarHtml(targetType, targetId) {
    return `<div class="react-mini" data-tt="${esc(targetType)}" data-tid="${esc(targetId)}" onclick="event.preventDefault();event.stopPropagation();">
      <button type="button" class="rm-btn love-red" data-act="love" title="Love tamu">♥ <span class="n-lr">0</span></button>
      <button type="button" class="rm-btn love-blue" data-act="love" title="Love login">♥ <span class="n-lb">0</span></button>
      <button type="button" class="rm-btn cmt-red" data-act="comment" title="Komentar tamu">💬 <span class="n-cr">0</span></button>
      <button type="button" class="rm-btn cmt-blue" data-act="comment" title="Komentar login">💬 <span class="n-cb">0</span></button>
    </div>
    <div class="cmt-panel" data-tt="${esc(targetType)}" data-tid="${esc(targetId)}" hidden></div>`;
  }

  /** Full bar (video card) */
  function barHtml(targetType, targetId) {
    return miniBarHtml(targetType, targetId);
  }

  function applyCounts(root, c) {
    if (!root || !c) return;
    const set = (sel, v) => {
      root.querySelectorAll(sel).forEach((el) => {
        el.textContent = v;
      });
    };
    // root may be react-mini or parent containing it
    const nodes = root.classList && root.classList.contains("react-mini") ? [root] : root.querySelectorAll(".react-mini");
    nodes.forEach((bar) => {
      if (bar.dataset.tid !== String(root.dataset && root.dataset.tid ? root.dataset.tid : bar.dataset.tid)) {
        /* when hydrating by bar itself */
      }
      const s = (sel, v) => {
        const el = bar.querySelector(sel);
        if (el) el.textContent = v;
      };
      s(".n-lr", c.loveRed || 0);
      s(".n-lb", c.loveBlue || 0);
      s(".n-cr", c.commentRed || 0);
      s(".n-cb", c.commentBlue || 0);
    });
  }

  async function hydrate(scope) {
    if (!window.GalleryDB || !GalleryDB.enabled()) return;
    const bars = (scope || document).querySelectorAll(".react-mini");
    for (const bar of bars) {
      try {
        const c = await GalleryDB.countReactions(bar.dataset.tt, bar.dataset.tid);
        const s = (sel, v) => {
          const el = bar.querySelector(sel);
          if (el) el.textContent = v;
        };
        s(".n-lr", c.loveRed || 0);
        s(".n-lb", c.loveBlue || 0);
        s(".n-cr", c.commentRed || 0);
        s(".n-cb", c.commentBlue || 0);
      } catch (e) {}
    }
  }

  function bind(scope) {
    (scope || document).querySelectorAll(".react-mini").forEach((bar) => {
      if (bar.dataset.bound) return;
      bar.dataset.bound = "1";
      bar.querySelectorAll(".rm-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          onAct(bar, btn.dataset.act);
        });
      });
    });
  }

  async function onAct(bar, act) {
    const tt = bar.dataset.tt;
    const tid = bar.dataset.tid;
    const panel = bar.parentElement && bar.parentElement.querySelector(`.cmt-panel[data-tid="${CSS.escape(tid)}"]`);
    // or sibling
    const panel2 =
      panel ||
      (bar.nextElementSibling && bar.nextElementSibling.classList.contains("cmt-panel")
        ? bar.nextElementSibling
        : null) ||
      document.querySelector(`.cmt-panel[data-tid="${CSS.escape(tid)}"]`);

    if (act === "love") {
      await doLove(bar, tt, tid);
      return;
    }
    // comment → collapse panel
    if (panel2) {
      const open = panel2.hidden;
      document.querySelectorAll(".cmt-panel").forEach((p) => {
        p.hidden = true;
      });
      if (open) {
        panel2.hidden = false;
        await renderCommentPanel(panel2, tt, tid);
      }
    }
  }

  async function doLove(bar, tt, tid) {
    const isLog = await loggedIn();
    let name = "";
    if (!isLog) {
      name = prompt("Nama kamu (untuk love tamu), atau batalkan lalu login Google untuk love biru:");
      if (name === null) return;
      if (String(name).trim().length < 2) {
        alert("Nama terlalu pendek.");
        return;
      }
    }
    try {
      const c = await GalleryDB.addLove(tt, tid, name);
      const s = (sel, v) => {
        const el = bar.querySelector(sel);
        if (el) el.textContent = v;
      };
      s(".n-lr", c.loveRed || 0);
      s(".n-lb", c.loveBlue || 0);
      s(".n-cr", c.commentRed || 0);
      s(".n-cb", c.commentBlue || 0);
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function renderCommentPanel(panel, tt, tid) {
    const isLog = await loggedIn();
    panel.innerHTML = `
      <div class="cmt-box">
        ${
          isLog
            ? `<p class="cmt-hint">Login terdeteksi → komentar <b style="color:#7db8ff">biru</b>.</p>`
            : `<p class="cmt-hint">Tamu → komentar <b style="color:#ff8a9a">merah</b>. Atau <a href="profile.html">login Google</a> untuk biru.</p>
               <input type="text" class="cmt-name" placeholder="Nama kamu" maxlength="60">`
        }
        <textarea class="cmt-body" rows="2" maxlength="500" placeholder="Tulis komentar..."></textarea>
        <button type="button" class="btn btn-primary cmt-send" style="padding:8px 12px;font-size:12px">Kirim komentar</button>
        <div class="cmt-list muted" style="font-size:12px">Memuat...</div>
      </div>`;

    try {
      const rows = await GalleryDB.listComments(tt, tid);
      const list = panel.querySelector(".cmt-list");
      list.innerHTML =
        rows
          .map(
            (r) =>
              `<div class="cmt-item" style="border-left:3px solid ${r.is_registered ? "#7db8ff" : "#ff8a9a"};padding-left:8px;margin:6px 0">
            <b>${esc(r.author_name)}</b>: ${esc(r.body)}</div>`
          )
          .join("") || "Belum ada komentar.";
    } catch (e) {
      panel.querySelector(".cmt-list").textContent = "";
    }

    panel.querySelector(".cmt-send").onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const nameEl = panel.querySelector(".cmt-name");
      const body = panel.querySelector(".cmt-body").value;
      const name = nameEl ? nameEl.value : "";
      try {
        const c = await GalleryDB.addComment(tt, tid, name, body);
        const bar = document.querySelector(`.react-mini[data-tid="${CSS.escape(tid)}"]`);
        if (bar) {
          bar.querySelector(".n-lr").textContent = c.loveRed || 0;
          bar.querySelector(".n-lb").textContent = c.loveBlue || 0;
          bar.querySelector(".n-cr").textContent = c.commentRed || 0;
          bar.querySelector(".n-cb").textContent = c.commentBlue || 0;
        }
        panel.querySelector(".cmt-body").value = "";
        await renderCommentPanel(panel, tt, tid);
      } catch (err) {
        alert(err.message || String(err));
      }
    };
  }

  global.SHSocial = { miniBarHtml, barHtml, hydrate, bind };
})(window);
