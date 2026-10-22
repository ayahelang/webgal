
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
    // duration if ends empty; default 24 jam jika tidak diset
    if (!end && start) {
      end = new Date(start.getTime());
      if (ann.duration_days || ann.duration_hours) {
        if (ann.duration_days) end.setDate(end.getDate() + Number(ann.duration_days));
        if (ann.duration_hours) end.setHours(end.getHours() + Number(ann.duration_hours));
      } else {
        end.setHours(end.getHours() + 24);
      }
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

  function trackRead(ann, via) {
    try {
      if (window.GalleryDB && GalleryDB.recordAnnouncementRead) {
        GalleryDB.recordAnnouncementRead(ann.id, via || "view").catch(function () {});
      }
    } catch (e) {}
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
    trackRead(ann, "view");
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
    if (!end && start) {
      end = new Date(start.getTime());
      if (ann.duration_days || ann.duration_hours) {
        if (ann.duration_days) end.setDate(end.getDate() + Number(ann.duration_days));
        if (ann.duration_hours) end.setHours(end.getHours() + Number(ann.duration_hours));
      } else {
        end.setHours(end.getHours() + 24);
      }
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
      const bodyEl = overlay.querySelector(".sh-ann-body");
      // pastikan blok suara bisa diklik di atas elemen lain
      bodyEl.querySelectorAll(".ann-voice-block, .chat-voice-player").forEach(function (el) {
        el.style.position = "relative";
        el.style.zIndex = "2";
        el.style.pointerEvents = "auto";
      });
      bodyEl.querySelectorAll("audio").forEach(function (a) {
        a.removeAttribute("crossorigin");
      });
      wireAnnVoicePlayers(bodyEl);
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

  function fmtAnnClock(sec) {
    if (!isFinite(sec) || sec < 0) return "--:--";
    sec = Math.floor(sec);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function wireAnnVoicePlayers(root) {
    if (!root) return;
    root.querySelectorAll(".ann-voice-block, .chat-voice-player, .ann-voice-slot-render").forEach(function (wrap) {
      if (wrap.dataset.wired) return;
      wrap.dataset.wired = "1";
      var audio = wrap.querySelector("audio");
      var btn = wrap.querySelector("[data-voice-play]");
      var timeEl = wrap.querySelector("[data-voice-time]");
      if (!audio) return;
      // legacy plain audio
      if (!btn) {
        audio.controls = true;
        audio.preload = "metadata";
        audio.style.display = "block";
        return;
      }
      if (!timeEl) return;
      var known = parseFloat(wrap.getAttribute("data-duration") || "");
      if (!isFinite(known)) known = null;
      function totalDur() {
        if (known != null) return known;
        var d = audio.duration;
        if (isFinite(d) && d > 0 && d !== Infinity) return d;
        return null;
      }
      function renderTime() {
        var dur = totalDur();
        var cur = audio.currentTime || 0;
        timeEl.textContent = fmtAnnClock(cur) + " / " + (dur != null ? fmtAnnClock(dur) : "--:--");
      }
      audio.addEventListener("loadedmetadata", function () {
        var d = audio.duration;
        if (known == null && isFinite(d) && d > 0 && d !== Infinity) known = d;
        renderTime();
      });
      audio.addEventListener("timeupdate", renderTime);
      audio.addEventListener("ended", function () {
        btn.textContent = "▶";
        renderTime();
      });
      btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (audio.paused) {
          audio.play().then(function () {
            btn.textContent = "❚❚";
          }).catch(function () {
            btn.textContent = "▶";
          });
        } else {
          audio.pause();
          btn.textContent = "▶";
        }
      });
      if (known == null && audio.src) {
        fetch(audio.src, { mode: "cors" })
          .then(function (r) { return r.ok ? r.blob() : null; })
          .then(function (blob) {
            if (!blob) return;
            var obj = URL.createObjectURL(blob);
            var probe = new Audio();
            probe.preload = "metadata";
            probe.src = obj;
            probe.onloadedmetadata = function () {
              if (isFinite(probe.duration) && probe.duration > 0 && probe.duration !== Infinity) {
                known = probe.duration;
                wrap.setAttribute("data-duration", String(known));
                audio.src = obj;
                renderTime();
              }
            };
          })
          .catch(function () {});
      }
      try { audio.load(); } catch (e) {}
      renderTime();
    });
  }

})();
