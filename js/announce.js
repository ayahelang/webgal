
(function () {
  const LS_PREFIX = "sh_ann_seen_";

  function stripHtml(html) {
    var d = document.createElement("div");
    d.innerHTML = html || "";
    return (d.textContent || d.innerText || "").replace(/\s+/g, " ").trim();
  }

  function speakAnnouncement(ann) {
    try {
      if (!window.speechSynthesis) return;
      var text = (ann.title || "Pengingat") + ". " + stripHtml(ann.body_html || "");
      if (!text.trim()) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text.slice(0, 600));
      u.lang = "id-ID";
      u.rate = 0.95;
      u.pitch = 1;
      // prefer Indonesian voice if available
      try {
        var voices = window.speechSynthesis.getVoices() || [];
        var idv = voices.find(function (v) {
          return /id/i.test(v.lang);
        });
        if (idv) u.voice = idv;
      } catch (e) {}
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn("TTS", e);
    }
  }


  function pageKind() {
    const p = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (!p || p === "/" || p === "index.html") return "home";
    if (p === "admin.html") return "admin";
    if (p === "my-works.html" || p === "profile.html" || p === "chat.html") return "user_panel";
    return "other";
  }


  function ensureAlarmCss() {
    if (document.getElementById("sh-alarm-css")) return;
    var s = document.createElement("style");
    s.id = "sh-alarm-css";
    s.textContent = [
      ".sh-alarm-float{position:fixed;z-index:99980;width:min(320px,calc(100vw - 24px));",
      "background:linear-gradient(165deg,#1a2740,#101820);border:1px solid rgba(255,180,60,.45);",
      "border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.45);color:#e8eef7;",
      "font:13px/1.4 system-ui,sans-serif;user-select:none;overflow:hidden}",
      ".sh-alarm-float.is-min{width:auto;min-width:140px}",
      ".sh-alarm-float.is-min .sh-alarm-body{display:none}",
      ".sh-alarm-hd{display:flex;align-items:center;gap:8px;padding:8px 10px;",
      "background:linear-gradient(135deg,rgba(60,40,10,.9),rgba(20,30,40,.95));",
      "cursor:grab;border-bottom:1px solid rgba(255,180,60,.2)}",
      ".sh-alarm-hd:active{cursor:grabbing}",
      ".sh-alarm-title{flex:1;font-weight:700;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".sh-alarm-hd button{border:0;background:rgba(255,255,255,.08);color:#cde;border-radius:6px;",
      "width:28px;height:28px;cursor:pointer;font-size:14px;line-height:1}",
      ".sh-alarm-hd button:hover{background:rgba(255,200,80,.25);color:#fff}",
      ".sh-alarm-body{padding:12px 14px 14px}",
      ".sh-alarm-row{display:flex;align-items:center;gap:12px;margin-bottom:8px}",
      ".sh-alarm-meta{flex:1;min-width:0}",
      ".sh-alarm-btn{border:0;background:rgba(255,255,255,.08);color:#cde;border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:14px;line-height:1}",
      ".sh-alarm-btn:hover{background:rgba(255,200,80,.25);color:#fff}",
      ".sh-alarm-msg{margin-top:8px;font-size:12px;color:#c5d4e6;max-height:120px;overflow:auto;line-height:1.45;border-top:1px solid rgba(255,180,60,.15);padding-top:8px}",
      ".sh-alarm-float.is-min .sh-alarm-body{display:none}",
      ".sh-alarm-float.is-min{width:auto;min-width:168px}",".sh-alarm-float.is-min .sh-alarm-hd{gap:6px}",".sh-alarm-btn[data-act=max]{font-size:13px;font-weight:700}",
      ".sh-alarm-float.is-min .sh-alarm-title:after{content:' (ketuk 2× / buka kembali)';font-weight:500;opacity:.75;font-size:10px}",

      ".sh-alarm-hg-frame,.sh-alarm-hg-sand-top,.sh-alarm-hg-sand-bot,.sh-alarm-hg-stream{",
      "animation-duration:var(--sh-hg-dur,3s)!important}",
      ".sh-alarm-hg{width:56px;height:72px;margin:0 auto 10px;display:flex;align-items:center;justify-content:center}",
      ".sh-alarm-hg-frame{position:relative;width:36px;height:64px;",
      "animation:shHgRotate var(--sh-hg-dur,3s) ease-in-out 1 forwards;transform-origin:center center}",
      ".sh-alarm-hg-top,.sh-alarm-hg-bot{position:absolute;left:0;width:36px;height:28px;",
      "border:2px solid rgba(255,200,100,.85);background:rgba(20,30,45,.55);overflow:hidden}",
      ".sh-alarm-hg-top{top:0;border-radius:4px 4px 18px 18px;border-bottom-color:transparent}",
      ".sh-alarm-hg-bot{bottom:0;border-radius:18px 18px 4px 4px;border-top-color:transparent}",
      ".sh-alarm-hg-neck{position:absolute;left:50%;top:26px;width:4px;height:12px;margin-left:-2px;",
      "background:rgba(255,200,100,.5)}",
      ".sh-alarm-hg-sand-top{position:absolute;left:4px;right:4px;top:4px;height:20px;",
      "background:linear-gradient(#ffc46a,#e8a040);border-radius:2px 2px 50% 50%;",
      "animation:shHgSandTop var(--sh-hg-dur,3s) linear 1 forwards;transform-origin:center bottom}",
      ".sh-alarm-hg-sand-bot{position:absolute;left:8px;right:8px;bottom:4px;height:0;",
      "background:linear-gradient(#e8a040,#ffc46a);border-radius:50% 50% 2px 2px;",
      "animation:shHgSandBot var(--sh-hg-dur,3s) linear 1 forwards}",
      ".sh-alarm-hg-stream{position:absolute;left:50%;top:28px;width:2px;height:12px;margin-left:-1px;",
      "background:repeating-linear-gradient(to bottom,#ffc46a 0 2px,transparent 2px 4px);",
      "opacity:.85;animation:shHgStream var(--sh-hg-dur,3s) linear 1 forwards}",
      "@keyframes shHgSandTop{0%{height:20px;opacity:1}70%{height:2px;opacity:.9}85%,100%{height:0;opacity:0}}",
      "@keyframes shHgSandBot{0%{height:0}70%{height:4px}100%{height:18px}}",
      "@keyframes shHgStream{0%,85%{opacity:.9}90%,100%{opacity:0}}",
      "@keyframes shHgRotate{0%,92%{transform:rotate(0deg)}100%{transform:rotate(180deg)}}",
      ".sh-alarm-count{text-align:center;font-size:28px;font-weight:800;letter-spacing:.04em;",
      "font-variant-numeric:tabular-nums;color:#ffc46a;text-shadow:0 0 12px rgba(255,180,60,.35)}",
      ".sh-alarm-sub{text-align:center;font-size:11px;color:#9ab;margin-top:4px}",
      ".sh-alarm-msg{margin-top:10px;font-size:12px;color:#c5d4e6;max-height:72px;overflow:auto}",
      ".sh-alarm-float.is-fired{border-color:rgba(80,220,120,.55);animation:shAlarmPulse 1s ease infinite}",
      "@keyframes shAlarmPulse{0%,100%{box-shadow:0 0 0 0 rgba(80,220,120,.4)}70%{box-shadow:0 0 0 12px rgba(80,220,120,0)}}",
      ".sh-alarm-float.is-fired .sh-alarm-count{color:#7dffb0}",
    ].join("");
    document.head.appendChild(s);
  }

  var alarmTimers = {};
  var alarmFired = {};

  function alarmUiKey(id) {
    return "sh_alarm_ui_" + id;
  }
  function loadAlarmUi(id) {
    try {
      return JSON.parse(localStorage.getItem(alarmUiKey(id)) || "null") || {};
    } catch (e) {
      return {};
    }
  }
  function saveAlarmUi(id, data) {
    try {
      localStorage.setItem(alarmUiKey(id), JSON.stringify(data));
    } catch (e) {}
  }

  function fmtCountdown(ms) {
    if (ms < 0) ms = 0;
    var t = Math.ceil(ms / 1000);
    var m = Math.floor(t / 60);
    var s = t % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function getAlarmFireAt(ann) {
    if (ann.alarm_fire_at) {
      var t = new Date(ann.alarm_fire_at).getTime();
      if (isFinite(t)) return t;
    }
    var delay = Number(ann.alarm_delay_sec) || 0;
    var base = ann.updated_at || ann.created_at || ann.starts_at;
    if (base) {
      var b = new Date(base).getTime();
      if (isFinite(b)) return b + delay * 1000;
    }
    return Date.now() + delay * 1000;
  }

  function bindAlarmDrag(panel, id) {
    var hd = panel.querySelector(".sh-alarm-hd");
    if (!hd) return;
    var dragging = false;
    var ox = 0,
      oy = 0;
    function onDown(ev) {
      if (ev.target && ev.target.closest && ev.target.closest("button")) return;
      dragging = true;
      var r = panel.getBoundingClientRect();
      ox = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
      oy = (ev.touches ? ev.touches[0].clientY : ev.clientY) - r.top;
      ev.preventDefault();
    }
    function onMove(ev) {
      if (!dragging) return;
      var cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      var cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      var x = Math.max(0, Math.min(window.innerWidth - 40, cx - ox));
      var y = Math.max(0, Math.min(window.innerHeight - 40, cy - oy));
      panel.style.left = x + "px";
      panel.style.top = y + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      var ui = loadAlarmUi(id);
      ui.x = parseFloat(panel.style.left) || 0;
      ui.y = parseFloat(panel.style.top) || 0;
      saveAlarmUi(id, ui);
    }
    hd.addEventListener("mousedown", onDown);
    hd.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
  }

  function ensureAlarmFloat(ann) {
    ensureAlarmCss();
    var id = String(ann.id);
    var el = document.getElementById("sh-alarm-float-" + id);
    if (el) return el;
    var ui = loadAlarmUi(id);
    el = document.createElement("div");
    el.id = "sh-alarm-float-" + id;
    el.className = "sh-alarm-float";
    el.setAttribute("data-ann-id", id);
    var left = ui.x != null ? ui.x : Math.max(12, window.innerWidth - 340);
    var top = ui.y != null ? ui.y : 80 + (Object.keys(alarmTimers).length % 5) * 24;
    el.style.left = left + "px";
    el.style.top = top + "px";
    el.innerHTML =
      '<div class="sh-alarm-hd">' +
      '<span class="sh-alarm-title"></span>' +
      '<button type="button" class="sh-alarm-btn" data-act="min" title="Perkecil">–</button>' +
      '<button type="button" class="sh-alarm-btn" data-act="max" title="Perbesar" hidden>□</button>' +
      '<button type="button" class="sh-alarm-btn" data-act="close" title="Tutup">✕</button>' +
      "</div>" +
      '<div class="sh-alarm-body">' +
      '<div class="sh-alarm-row">' +
      '<div class="sh-alarm-hg" aria-hidden="true"><div class="sh-alarm-hg-frame"><div class="sh-alarm-hg-top"></div><div class="sh-alarm-hg-neck"></div><div class="sh-alarm-hg-bot"></div><div class="sh-alarm-hg-sand-top"></div><div class="sh-alarm-hg-sand-bot"></div><div class="sh-alarm-hg-stream"></div></div></div>' +
      '<div class="sh-alarm-meta">' +
      '<div class="sh-alarm-count">--:--</div>' +
      '<div class="sh-alarm-sub">Menuju baca nyaring</div>' +
      "</div></div>" +
      '<div class="sh-alarm-msg"></div>' +
      "</div>";
    el.querySelector(".sh-alarm-title").textContent =
      "⏰ " + (ann.title || "Alarm").slice(0, 48);
    el.querySelector(".sh-alarm-msg").textContent = stripHtml(ann.body_html || "").slice(
      0,
      400
    );

    function syncMinMaxButtons() {
      var minBtn = el.querySelector('[data-act="min"]');
      var maxBtn = el.querySelector('[data-act="max"]');
      var closeBtn = el.querySelector('[data-act="close"]');
      var fired = !!alarmFired[id] || el.classList.contains("is-fired");
      var minimized = el.classList.contains("is-min");
      if (fired) {
        // Setelah read-aloud: hanya tutup total
        if (minBtn) minBtn.hidden = true;
        if (maxBtn) maxBtn.hidden = true;
        if (closeBtn) {
          closeBtn.hidden = false;
          closeBtn.title = "Tutup sepenuhnya";
        }
        return;
      }
      // Sebelum fire: min / max bergantian
      if (minBtn) {
        minBtn.hidden = minimized;
        minBtn.title = "Perkecil";
      }
      if (maxBtn) {
        maxBtn.hidden = !minimized;
        maxBtn.title = "Perbesar";
      }
      if (closeBtn) {
        // ✕ sebelum fire = sama dengan minimize (atau biarkan min)
        closeBtn.hidden = true; // pakai – dan □ agar jelas
      }
    }

    function setMinimized(on) {
      if (on) el.classList.add("is-min");
      else el.classList.remove("is-min");
      var u = loadAlarmUi(id);
      u.min = !!on;
      saveAlarmUi(id, u);
      syncMinMaxButtons();
    }

    el.querySelector('[data-act="min"]').addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (alarmFired[id] || el.classList.contains("is-fired")) return;
      setMinimized(true);
    });
    el.querySelector('[data-act="max"]').addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (alarmFired[id] || el.classList.contains("is-fired")) return;
      setMinimized(false);
    });
    el.querySelector('[data-act="close"]').addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var fired = !!alarmFired[id] || el.classList.contains("is-fired");
      if (!fired) {
        setMinimized(true);
        return;
      }
      try {
        if (alarmTimers[id]) clearInterval(alarmTimers[id]);
      } catch (e) {}
      delete alarmTimers[id];
      try {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
      } catch (e3) {}
      el.remove();
      try {
        sessionStorage.setItem("sh_alarm_closed_" + id, "1");
      } catch (e2) {}
      var u2 = loadAlarmUi(id);
      u2.min = false;
      saveAlarmUi(id, u2);
    });

    // Klik title saat minimized → maximize
    el.querySelector(".sh-alarm-title").addEventListener("click", function () {
      if (el.classList.contains("is-min") && !alarmFired[id]) setMinimized(false);
    });

    document.body.appendChild(el);
    if (ui.min) el.classList.add("is-min");
    syncMinMaxButtons();
    el._syncMinMaxButtons = syncMinMaxButtons;
    bindAlarmDrag(el, id);
    try {
      if (window.SHFloatDrag)
        SHFloatDrag.enable(el, {
          key: "alarm-" + id,
          handle: el.querySelector(".sh-alarm-hd"),
        });
    } catch (e) {}
    return el;
  }

  /** Paksa tampil floating alarm (setelah Simpan di admin) — abaikan flag closed sesi lama */
  function forceShowAlarm(ann) {
    if (!ann) return;
    ann = Object.assign({}, ann);
    ann.is_alarm = true;
    ann.active = true;
    if (!ann.id) ann.id = "local-" + Date.now();
    // pastikan fire_at ada
    if (!ann.alarm_fire_at) {
      var delay = Number(ann.alarm_delay_sec) || 0;
      if (!delay && (ann.alarm_min != null || ann.alarm_sec != null)) {
        delay = (Number(ann.alarm_min) || 0) * 60 + (Number(ann.alarm_sec) || 0);
      }
      ann.alarm_delay_sec = delay;
      ann.alarm_fire_at = new Date(Date.now() + delay * 1000).toISOString();
    }
    try {
      sessionStorage.removeItem("sh_alarm_closed_" + ann.id);
    } catch (e) {}
    // hapus panel lama jika ada agar animasi/sync ulang
    try {
      var oldEl = document.getElementById("sh-alarm-float-" + ann.id);
      if (oldEl) oldEl.remove();
      if (alarmTimers[ann.id]) {
        clearInterval(alarmTimers[ann.id]);
        delete alarmTimers[ann.id];
      }
      delete alarmFired[ann.id];
    } catch (e2) {}
    tickAlarmFloat(ann);
  }

  function tickAlarmFloat(ann) {
    if (sessionStorage.getItem("sh_alarm_closed_" + ann.id) === "1") return;
    var el = ensureAlarmFloat(ann);
    var fireAt = getAlarmFireAt(ann);
    var countEl = el.querySelector(".sh-alarm-count");
    var subEl = el.querySelector(".sh-alarm-sub");
    var hg = el.querySelector(".sh-alarm-hg-frame");
    // sinkronkan animasi pasir ke sisa waktu menuju read-aloud (sekali)
    if (hg && !hg.getAttribute("data-synced")) {
      var remain = Math.max(500, fireAt - Date.now());
      var durSec = (remain / 1000).toFixed(2);
      el.style.setProperty("--sh-hg-dur", durSec + "s");
      // restart animation
      hg.style.animation = "none";
      void hg.offsetWidth;
      hg.style.animation = "";
      var sands = el.querySelectorAll(".sh-alarm-hg-sand-top,.sh-alarm-hg-sand-bot,.sh-alarm-hg-stream");
      sands.forEach(function (n) {
        n.style.animation = "none";
        void n.offsetWidth;
        n.style.animation = "";
      });
      hg.setAttribute("data-synced", "1");
    }

    function tick() {
      var left = fireAt - Date.now();
      if (left > 0) {
        el.classList.remove("is-fired");
        if (countEl) countEl.textContent = fmtCountdown(left);
        if (subEl) subEl.textContent = "Hitung mundur · lalu baca nyaring";
        return;
      }
      if (countEl) countEl.textContent = "00:00";
      el.classList.add("is-fired");
      // Saat waktunya: maximize jika sempat min, baca di KOTAK YANG SAMA
      el.classList.remove("is-min");
      if (typeof el._syncMinMaxButtons === "function") el._syncMinMaxButtons();
      if (!alarmFired[ann.id]) {
        alarmFired[ann.id] = true;
        try {
          if (alarmTimers[ann.id]) {
            clearInterval(alarmTimers[ann.id]);
            delete alarmTimers[ann.id];
          }
        } catch (e0) {}
        if (subEl) subEl.textContent = "Membacakan pengumuman…";
        try {
          speakAnnouncement(ann);
        } catch (e) {}
        try {
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        } catch (e2) {}
        // Countdown kedua (splash_seconds) di kotak yang sama → auto-close
        var splashSec = Math.max(5, Number(ann.splash_seconds) || 15);
        var leftSplash = splashSec;
        var splashEndAt = Date.now() + splashSec * 1000;
        if (countEl) countEl.textContent = fmtCountdown(leftSplash * 1000);
        if (subEl)
          subEl.textContent =
            "Auto-tutup " + leftSplash + "s · ✕ tutup sekarang";
        var splashIv = setInterval(function () {
          // panel sudah dihapus manual?
          if (!document.getElementById("sh-alarm-float-" + ann.id)) {
            clearInterval(splashIv);
            return;
          }
          var msLeft = splashEndAt - Date.now();
          if (msLeft <= 0) {
            clearInterval(splashIv);
            delete alarmTimers[ann.id];
            try {
              if (window.speechSynthesis) window.speechSynthesis.cancel();
            } catch (e4) {}
            try {
              var node = document.getElementById("sh-alarm-float-" + ann.id);
              if (node) node.remove();
            } catch (e5) {}
            try {
              sessionStorage.setItem("sh_alarm_closed_" + ann.id, "1");
            } catch (e6) {}
            return;
          }
          if (countEl) countEl.textContent = fmtCountdown(msLeft);
          if (subEl)
            subEl.textContent =
              "Auto-tutup " +
              Math.ceil(msLeft / 1000) +
              "s · ✕ tutup sekarang";
        }, 250);
        alarmTimers[ann.id] = splashIv;
        if (typeof el._syncMinMaxButtons === "function") el._syncMinMaxButtons();
      }
    }
    tick();
    if (alarmTimers[ann.id]) clearInterval(alarmTimers[ann.id]);
    alarmTimers[ann.id] = setInterval(tick, 250);
  }

  function mountAlarmAnnouncements(list, profile, kind) {
    (list || []).forEach(function (ann) {
      if (!ann || !ann.is_alarm || !ann.active) return;
      // Alarm: tampil di SEMUA halaman (home, user panel, dll.)
      // Audience: public = semua pengunjung; logged_in / students = filter target
      if (pageKind() !== "admin") {
        if (!matchesAudience(ann, profile)) return;
      }
      var fireAt = getAlarmFireAt(ann);
      // tampilkan floating selama belum lewat 2 jam setelah fire
      if (Date.now() - fireAt > 2 * 3600 * 1000) return;
      if (sessionStorage.getItem("sh_alarm_closed_" + ann.id) === "1") return;
      tickAlarmFloat(ann);
    });
  }


  function inSchedule(ann, now) {
    if (!ann.active) return false;
    const days = Array.isArray(ann.schedule_days) ? ann.schedule_days.map(Number) : [];
    if (days.length) {
      if (days.indexOf(now.getDay()) < 0) return false;
    }
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
    btn.innerHTML = "<span>" + (ann.is_alarm ? "⏰" : "📢") + "</span><span class='sh-ann-float-label'>" + (ann.title || (ann.is_alarm ? "Alarm" : "Pengumuman")).slice(0, 28) + "</span>";
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
      const timerEl = overlay.querySelector(".sh-ann-timer");
      const close = () => {
        clearInterval(iv);
        overlay.remove();
        if (opts.testMode || ann._forceShow) {
          showFloatBtn(Object.assign({}, ann, {
            active: true,
            starts_at: null,
            ends_at: null,
            duration_days: null,
            duration_hours: 24,
          }));
          resolve();
          return;
        }
        if (!opts.fromFloat) markSeen(ann);
        /* alarm: TTS hanya setelah countdown, bukan di splash */

        if (isStillValid(ann)) showFloatBtn(ann);
        else removeFloat(ann.id);
        resolve();
      };
      overlay.querySelector(".sh-ann-close").onclick = close;
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });
      // Pasang ke DOM dulu, baru bangun player (agar audio + event stabil)
      document.body.appendChild(overlay);
      normalizeAnnVoiceUi(bodyEl);
      wireAnnVoicePlayers(bodyEl);
      setTimeout(function () { wireAnnVoicePlayers(bodyEl); }, 50);
      setTimeout(function () { wireAnnVoicePlayers(bodyEl); }, 250);
      setTimeout(function () { wireAnnVoicePlayers(bodyEl); }, 600);
      timerEl.textContent = "Menutup otomatis: " + sec + "s";
      const iv = setInterval(() => {
        sec -= 1;
        if (sec <= 0) close();
        else timerEl.textContent = "Menutup otomatis: " + sec + "s";
      }, 1000);
    });
  }

  async function boot() {
    // Uji dari admin: tampilkan payload paksa seperti pengunjung
    try {
      const raw = sessionStorage.getItem("sh_ann_force_preview");
      if (raw && pageKind() !== "admin") {
        sessionStorage.removeItem("sh_ann_force_preview");
        const force = JSON.parse(raw);
        if (force && force.body_html != null) {
          force.active = true;
          force._forceShow = true;
          await showSplash(force, { fromFloat: false, testMode: true });
          return;
        }
      }
    } catch (e) {
      try {
        sessionStorage.removeItem("sh_ann_force_preview");
      } catch (e2) {}
    }
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
      // Alarm floating — juga di halaman admin (setelah simpan / refresh)
      mountAlarmAnnouncements(list, profile, kind);
      // Splash pengumuman biasa: tidak di admin
      if (kind === "admin") return;
      const queue = list.filter(
        (ann) => matchesPlace(ann, kind) && matchesAudience(ann, profile) && inSchedule(ann, now)
      );
      for (const ann of queue) {
        if (ann.is_alarm) continue;
        await showSplash(ann);
      }
    } catch (e) {
      console.warn("announce", e);
    }
  }

  window.SHAnnounce = {
    showSplash,
    boot,
    mountAlarmAnnouncements,
    tickAlarmFloat,
    forceShowAlarm,
  };

  if (document.readyState === "complete") setTimeout(boot, 600);
  else window.addEventListener("load", () => setTimeout(boot, 600));

  // Refresh alarm floating tiap 30 detik (sinkron fire_at dari server)
  setInterval(function () {
    if (!window.GalleryDB || !GalleryDB.fetchActiveAnnouncements) return;
    GalleryDB.fetchActiveAnnouncements()
      .then(function (list) {
        return GalleryDB.getSession()
          .then(function (session) {
            if (!session) return null;
            return GalleryDB.getMyProfile();
          })
          .catch(function () {
            return null;
          })
          .then(function (profile) {
            mountAlarmAnnouncements(list, profile, pageKind());
          });
      })
      .catch(function () {});
  }, 10000);


  function fmtAnnClock(sec) {
    if (!isFinite(sec) || sec < 0) return "--:--";
    sec = Math.floor(sec);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  /**
   * Satu player custom saja — buang audio native / duplikat.
   */
  function normalizeAnnVoiceUi(root) {
    if (!root) return;
    var items = []; // {url, dur}
    function addItem(u, d) {
      u = String(u || "").trim();
      if (!u || u.indexOf("blob:") === 0) return; // blob preview lokal biasanya sudah invalid
      // skip duplicates
      for (var i = 0; i < items.length; i++) {
        if (items[i].url === u) {
          if (items[i].dur == null && d != null && isFinite(d)) items[i].dur = d;
          return;
        }
      }
      items.push({ url: u, dur: d != null && isFinite(d) ? d : null });
    }

    root.querySelectorAll("audio").forEach(function (node) {
      var u = node.getAttribute("src") || "";
      if (!u && node.src) u = node.src;
      var d = null;
      var host = node.closest("[data-duration], [data-dur], .sh-ap, .sh-voice-player, .ann-voice-block");
      if (host) {
        var ds = host.getAttribute("data-duration") || host.getAttribute("data-dur");
        if (ds) d = parseFloat(ds);
      }
      if (isFinite(node.duration) && node.duration > 0 && node.duration !== Infinity) {
        d = node.duration;
      }
      addItem(u, d);
    });
    root.querySelectorAll("[data-voice-url], [data-src]").forEach(function (node) {
      var u = node.getAttribute("data-voice-url") || node.getAttribute("data-src") || "";
      var ds = node.getAttribute("data-duration") || node.getAttribute("data-dur") || "";
      addItem(u, ds ? parseFloat(ds) : null);
    });

    // Hapus player/audio lama
    root.querySelectorAll(
      "audio, .sh-ap, .sh-audio, .sh-voice-player, .chat-voice-player, .ann-voice-block, .ann-voice-slot-render, .chat-voice-msg"
    ).forEach(function (n) {
      n.remove();
    });

    items.forEach(function (it) {
      var wrap = document.createElement("div");
      wrap.className = "ann-voice-slot-render";
      if (window.SHVoice && SHVoice.playerHtml) {
        wrap.innerHTML = SHVoice.playerHtml({
          url: it.url,
          duration: it.dur,
          ttlLabel: "",
          downloadable: true,
        });
      } else {
        wrap.innerHTML =
          '<div class="sh-ap" data-src="' + it.url.replace(/"/g, "&quot;") + '"' +
          (it.dur ? ' data-dur="' + it.dur + '"' : "") +
          ">" +
          '<button type="button" class="sh-ap-play">▶</button>' +
          '<button type="button" class="sh-ap-stop">■</button>' +
          '<div class="sh-ap-body"><div class="sh-ap-time"><span class="sh-ap-cur">00:00</span> / <span class="sh-ap-dur">00:00</span></div>' +
          '<input class="sh-ap-seek" type="range" min="0" max="' + (it.dur || 1) + '" value="0" step="0.01" /></div>' +
          '<button type="button" class="sh-ap-dl">⬇</button>' +
          '<audio class="sh-ap-audio" preload="auto" playsinline src="' + it.url.replace(/"/g, "&quot;") + '"></audio></div>';
      }
      // pastikan audio preload auto + src absolut
      var a = wrap.querySelector("audio");
      if (a) {
        a.preload = "auto";
        a.removeAttribute("controls");
        a.controls = false;
        try { a.load(); } catch (e) {}
      }
      root.appendChild(wrap);
    });

    root.querySelectorAll("audio").forEach(function (a) {
      a.removeAttribute("controls");
      a.controls = false;
      a.style.setProperty("display", "none", "important");
    });
  }

  function wireAnnVoicePlayers(root) {
    if (!root) return;
    root.querySelectorAll("audio").forEach(function (a) {
      a.removeAttribute("controls");
      a.controls = false;
      a.style.setProperty("display", "none", "important");
    });
    if (window.SHVoice && SHVoice.wirePlayers) {
      SHVoice.wirePlayers(root);
    }
  }


})();
