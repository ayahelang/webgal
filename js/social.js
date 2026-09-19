/**
 * Love/komentar per-link — default tersembunyi, toggle via judul website
 */
(function (global) {
  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
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

  function miniBarHtml(targetType, targetId) {
    let mineRed = false,
      mineBlue = false;
    try {
      const raw = sessionStorage.getItem("sh_love_" + targetType + "_" + targetId);
      if (raw) {
        if (raw.endsWith("|blue")) mineBlue = true;
        else mineRed = true;
      }
    } catch (e) {}
    return `<div class="react-mini is-collapsed" data-tt="${esc(targetType)}" data-tid="${esc(targetId)}" hidden>
      <button type="button" class="rm-btn rm-love-r ${mineRed ? "is-on" : ""}" data-act="love-red" title="Love (tamu)">
        <span class="ic">♥</span> <span class="n-lr">0</span>
      </button>
      <button type="button" class="rm-btn rm-love-b ${mineBlue ? "is-on" : ""}" data-act="love-blue" title="Love (login Google)">
        <span class="ic">♥</span> <span class="n-lb">0</span>
      </button>
      <button type="button" class="rm-btn rm-cmt-r" data-act="comment-red" title="Komentar (tamu)">
        <span class="ic">💬</span> <span class="n-cr">0</span>
      </button>
      <button type="button" class="rm-btn rm-cmt-b" data-act="comment-blue" title="Komentar (login)">
        <span class="ic">💬</span> <span class="n-cb">0</span>
      </button>
    </div>
    <div class="cmt-panel" data-tt="${esc(targetType)}" data-tid="${esc(targetId)}" hidden></div>`;
  }

  function barHtml(tt, tid) {
    return miniBarHtml(tt, tid);
  }

  function setCounts(bar, c) {
    if (!bar || !c) return;
    const s = (sel, v) => {
      const el = bar.querySelector(sel);
      if (el) el.textContent = v;
    };
    s(".n-lr", c.loveRed || 0);
    s(".n-lb", c.loveBlue || 0);
    s(".n-cr", c.commentRed || 0);
    s(".n-cb", c.commentBlue || 0);
  }

  function setLoveOn(bar, active, isBlue) {
    const r = bar.querySelector(".rm-love-r");
    const b = bar.querySelector(".rm-love-b");
    if (!active) {
      r && r.classList.remove("is-on");
      b && b.classList.remove("is-on");
      return;
    }
    if (isBlue) {
      b && b.classList.add("is-on");
      r && r.classList.remove("is-on");
    } else {
      r && r.classList.add("is-on");
      b && b.classList.remove("is-on");
    }
  }

  async function hydrate(scope) {
    if (!window.GalleryDB || !GalleryDB.enabled()) return;
    const bars = (scope || document).querySelectorAll(".react-mini");
    for (const bar of bars) {
      try {
        const c = await GalleryDB.countReactions(bar.dataset.tt, bar.dataset.tid);
        setCounts(bar, c);
      } catch (e) {}
    }
  }

  function bind(scope) {
    const root = scope || document;
    // Toggle HANYA jika klik judul putih (<b>), bar lain tetap buka website
    root.querySelectorAll(".work-choice").forEach((a) => {
      if (a.dataset.socialToggle) return;
      a.dataset.socialToggle = "1";
      const title = a.querySelector("b");
      if (title) {
        title.style.cursor = "pointer";
        title.title = "Klik judul: tampilkan/sembunyikan love & komentar";
        title.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const row = a.closest(".work-row");
          if (!row) return;
          const bar = row.querySelector(".react-mini");
          if (!bar) return;
          const open = bar.hasAttribute("hidden");
          if (open) {
            bar.removeAttribute("hidden");
            bar.classList.remove("is-collapsed");
            if (window.GalleryDB) {
              GalleryDB.countReactions(bar.dataset.tt, bar.dataset.tid)
                .then((c) => setCounts(bar, c))
                .catch(() => {});
            }
          } else {
            bar.setAttribute("hidden", "");
            bar.classList.add("is-collapsed");
            const panel = row.querySelector(".cmt-panel");
            if (panel) panel.hidden = true;
          }
        });
      }
    });

    root.querySelectorAll(".react-mini").forEach((bar) => {
      if (bar.dataset.bound) return;
      bar.dataset.bound = "1";
      bar.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      bar.querySelectorAll(".rm-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          onAct(bar, btn.dataset.act);
        });
      });
    });
  }

  async function ensureGuestName() {
    let name = GalleryDB.getGuestName ? GalleryDB.getGuestName() : "";
    if (name && name.length >= 2) return name;
    name = prompt("Nama kamu (disimpan sekali selama kunjungan ini):");
    if (name === null) return null;
    name = String(name).trim();
    if (name.length < 2) {
      alert("Nama terlalu pendek.");
      return null;
    }
    if (GalleryDB.setGuestName) GalleryDB.setGuestName(name);
    return name;
  }

  async function onAct(bar, act) {
    const tt = bar.dataset.tt;
    const tid = bar.dataset.tid;
    const logged = await isLoggedIn();

    if (act === "love-red" || act === "love-blue") {
      if (act === "love-blue" && !logged) {
        if (confirm("Love biru membutuhkan login Google. Buka halaman Profil?")) {
          try { sessionStorage.setItem("sh_return", location.href); } catch (e) {}
          location.href = "profile.html?login=1";
        }
        return;
      }
      let name = "";
      if (!logged && act === "love-red") {
        const has = GalleryDB.hasLovedLocal && GalleryDB.hasLovedLocal(tt, tid);
        if (!has) {
          name = await ensureGuestName();
          if (name === null) return;
        }
      }
      try {
        const res = await GalleryDB.toggleLove(tt, tid, name);
        setCounts(bar, res.counts);
        setLoveOn(bar, res.active, !!res.isRegistered || act === "love-blue");
      } catch (e) {
        alert(e.message || String(e));
      }
      return;
    }

    if (act === "comment-blue" && !logged) {
      if (confirm("Komentar biru membutuhkan login Google. Buka Profil?")) {
          try { sessionStorage.setItem("sh_return", location.href); } catch (e) {}
          location.href = "profile.html?login=1";
        }
      return;
    }
    if (act === "comment-red" && !logged) {
      const n = await ensureGuestName();
      if (n === null) return;
    }

    const panel =
      (bar.nextElementSibling && bar.nextElementSibling.classList.contains("cmt-panel") && bar.nextElementSibling) ||
      bar.parentElement.querySelector(".cmt-panel");
    if (!panel) return;
    const willOpen = panel.hidden;
    document.querySelectorAll(".cmt-panel").forEach((p) => {
      p.hidden = true;
    });
    if (willOpen) {
      panel.hidden = false;
      await renderCommentPanel(panel, tt, tid, act === "comment-blue");
    }
  }

  async function renderCommentPanel(panel, tt, tid, preferBlue) {
    const logged = await isLoggedIn();
    const guest = GalleryDB.getGuestName ? GalleryDB.getGuestName() : "";
    panel.innerHTML = `
      <div class="cmt-box" onclick="event.stopPropagation()">
        <p class="cmt-hint">${
          logged || preferBlue
            ? "Komentar <b style=\"color:#7db8ff\">biru</b>."
            : "Komentar <b style=\"color:#ff8a9a\">merah</b>."
        }</p>
        ${!logged ? `<input type="text" class="cmt-name" placeholder="Nama" maxlength="60" value="${esc(guest)}">` : ""}
        <textarea class="cmt-body" rows="2" maxlength="500" placeholder="Tulis komentar..."></textarea>
        <button type="button" class="btn btn-primary cmt-send" style="padding:8px 12px;font-size:12px">Kirim</button>
        <div class="cmt-list" style="font-size:12px">Memuat...</div>
      </div>`;
    try {
      const rows = await GalleryDB.listComments(tt, tid);
      panel.querySelector(".cmt-list").innerHTML =
        rows
          .map(
            (r) =>
              `<div class="cmt-item" style="border-left:3px solid ${r.is_registered ? "#7db8ff" : "#ff8a9a"};padding:4px 8px;margin:4px 0">
            <b>${esc(r.author_name)}</b>: ${esc(r.body)}</div>`
          )
          .join("") || "<span class='muted'>Belum ada komentar.</span>";
    } catch (e) {
      panel.querySelector(".cmt-list").textContent = "";
    }
    panel.querySelector(".cmt-send").onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const nameEl = panel.querySelector(".cmt-name");
      const body = panel.querySelector(".cmt-body").value;
      try {
        const c = await GalleryDB.addComment(tt, tid, nameEl ? nameEl.value : "", body);
        const bar = document.querySelector(`.react-mini[data-tid="${CSS.escape(tid)}"]`);
        if (bar) setCounts(bar, c);
        panel.querySelector(".cmt-body").value = "";
        await renderCommentPanel(panel, tt, tid, preferBlue);
      } catch (err) {
        alert(err.message || String(err));
      }
    };
  }

  global.SHSocial = { miniBarHtml, barHtml, hydrate, bind };
})(window);
