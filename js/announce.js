
(function () {
  const LS_PREFIX = "sh_ann_seen_";

  function pageKind() {
    const p = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (!p || p === "/" || p === "index.html") return "home";
    if (p === "admin.html") return "admin";
    if (p === "my-works.html" || p === "profile.html" || p === "chat.html") return "user_panel";
    return "other";
  }

  function inSchedule(ann, now) {
    if (!ann.active) return false;
    const start = ann.starts_at ? new Date(ann.starts_at) : null;
    let end = ann.ends_at ? new Date(ann.ends_at) : null;
    if (start && now < start) return false;
    // duration overrides if ends empty
    if (!end && start && (ann.duration_days || ann.duration_hours)) {
      end = new Date(start.getTime());
      if (ann.duration_days) end.setDate(end.getDate() + Number(ann.duration_days));
      if (ann.duration_hours) end.setHours(end.getHours() + Number(ann.duration_hours));
    }
    if (end && now > end) return false;

    const times = Math.max(1, Number(ann.times_per_day) || 1);
    const hours = Array.isArray(ann.schedule_hours) ? ann.schedule_hours.filter((h) => h >= 0 && h <= 23) : [];
    const dayKey = now.toISOString().slice(0, 10);
    const seenKey = LS_PREFIX + ann.id + "_" + dayKey;
    let seen = [];
    try {
      seen = JSON.parse(localStorage.getItem(seenKey) || "[]");
    } catch (e) {
      seen = [];
    }
    if (seen.length >= times) return false;

    if (hours.length) {
      const h = now.getHours();
      // only show if current hour is in list, and not yet shown this hour
      if (hours.indexOf(h) < 0) return false;
      if (seen.indexOf(h) >= 0) return false;
    } else {
      // auto slots: divide day into times equal windows
      const slot = Math.floor((now.getHours() * 60 + now.getMinutes()) / (1440 / times));
      if (seen.indexOf(slot) >= 0) return false;
    }
    return true;
  }

  function markSeen(ann) {
    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10);
    const seenKey = LS_PREFIX + ann.id + "_" + dayKey;
    let seen = [];
    try {
      seen = JSON.parse(localStorage.getItem(seenKey) || "[]");
    } catch (e) {}
    const times = Math.max(1, Number(ann.times_per_day) || 1);
    const hours = Array.isArray(ann.schedule_hours) ? ann.schedule_hours : [];
    if (hours.length) seen.push(now.getHours());
    else {
      const slot = Math.floor((now.getHours() * 60 + now.getMinutes()) / (1440 / times));
      seen.push(slot);
    }
    try {
      localStorage.setItem(seenKey, JSON.stringify(seen));
    } catch (e) {}
  }

  function matchesAudience(ann, profile) {
    const aud = ann.audience || "public";
    if (aud === "public") return true;
    if (aud === "logged_in") return !!(profile && profile.id);
    if (aud === "students") {
      if (!profile || !profile.linked_student_name) return false;
      const targets = ann.target_students || [];
      if (!targets.length) return false;
      const y = String(profile.linked_angkatan_year || "");
      const c = String(profile.linked_class_code || "");
      const n = String(profile.linked_student_name || "").toLowerCase().trim();
      return targets.some((t) => {
        const ty = String(t.year || t.angkatan_year || "");
        const tc = String(t.class || t.class_code || "");
        const tn = String(t.name || "").toLowerCase().trim();
        return (!ty || ty === y) && (!tc || tc === c) && tn === n;
      });
    }
    return false;
  }

  function matchesPlace(ann, kind) {
    const show = ann.show_on || "home";
    if (show === "home") return kind === "home";
    if (show === "user_panel") return kind === "user_panel";
    if (show === "both") return kind === "home" || kind === "user_panel";
    // flags from combined show_on string
    if (show.indexOf("home") >= 0 && kind === "home") return true;
    if (show.indexOf("user") >= 0 && kind === "user_panel") return true;
    return false;
  }


  const openFloats = {};

  function isStillValid(ann) {
    const now = new Date();
    const start = ann.starts_at ? new Date(ann.starts_at) : null;
    let end = ann.ends_at ? new Date(ann.ends_at) : null;
    if (start && now < start) return false;
    if (!end && start && (ann.duration_days || ann.duration_hours)) {
      end = new Date(start.getTime());
      if (ann.duration_days) end.setDate(end.getDate() + Number(ann.duration_days));
      if (ann.duration_hours) end.setHours(end.getHours() + Number(ann.duration_hours));
    }
    if (end && now > end) return false;
    return !!ann.active;
  }

  function removeFloat(id) {
    const el = document.getElementById("sh-ann-float-" + id);
    if (el) el.remove();
    delete openFloats[id];
  }

  function showFloatBtn(ann) {
    if (!isStillValid(ann)) {
      removeFloat(ann.id);
      return;
    }
    if (document.getElementById("sh-ann-float-" + ann.id)) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "sh-ann-float-" + ann.id;
    btn.className = "sh-ann-float-btn";
    btn.title = ann.title || "Pengumuman";
    btn.innerHTML = "<span>📢</span><span class='sh-ann-float-label'>" + (ann.title || "Pengumuman").slice(0, 28) + "</span>";
    btn.onclick = () => {
      removeFloat(ann.id);
      showSplash(ann, { fromFloat: true });
    };
    document.body.appendChild(btn);
    openFloats[ann.id] = true;
  }

  function showSplash(ann, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      let sec = Math.max(5, Number(ann.splash_seconds) || 15);
      const overlay = document.createElement("div");
      overlay.className = "sh-ann-splash";
      overlay.innerHTML =
        `<div class="sh-ann-card" role="dialog" aria-modal="true">` +
        `<h2></h2><div class="sh-ann-body"></div>` +
        `<div class="sh-ann-foot"><span class="sh-ann-timer"></span>` +
        `<button type="button" class="sh-ann-close">Tutup</button></div></div>`;
      overlay.querySelector("h2").textContent = ann.title || "Pengumuman";
      overlay.querySelector(".sh-ann-body").innerHTML = ann.body_html || "";
      const timerEl = overlay.querySelector(".sh-ann-timer");
      const close = () => {
        clearInterval(iv);
        overlay.remove();
        if (!opts.fromFloat) markSeen(ann);
        if (isStillValid(ann)) showFloatBtn(ann);
        else removeFloat(ann.id);
        resolve();
      };
      overlay.querySelector(".sh-ann-close").onclick = close;
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });
      document.body.appendChild(overlay);
      timerEl.textContent = "Menutup otomatis: " + sec + "s";
      const iv = setInterval(() => {
        sec -= 1;
        if (sec <= 0) close();
        else timerEl.textContent = "Menutup otomatis: " + sec + "s";
      }, 1000);
    });
  }

  async function boot() {
    if (pageKind() === "admin") return;
    if (!window.GalleryDB || !GalleryDB.fetchActiveAnnouncements) return;
    try {
      const list = await GalleryDB.fetchActiveAnnouncements();
      if (!list.length) return;
      let profile = null;
      try {
        const session = await GalleryDB.getSession();
        if (session) profile = await GalleryDB.getMyProfile();
      } catch (e) {}
      const kind = pageKind();
      const now = new Date();
      const queue = list.filter(
        (ann) => matchesPlace(ann, kind) && matchesAudience(ann, profile) && inSchedule(ann, now)
      );
      for (const ann of queue) {
        await showSplash(ann);
      }
    } catch (e) {
      console.warn("announce", e);
    }
  }

  window.SHAnnounce = {
    showSplash,
    boot,
  };

  if (document.readyState === "complete") setTimeout(boot, 600);
  else window.addEventListener("load", () => setTimeout(boot, 600));
})();
