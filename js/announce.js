
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
        if (ann.is_alarm) {
          try {
            speakAnnouncement(ann);
          } catch (e) {}
        }
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

  // Alarm talking: polling ringan tiap menit (hanya is_alarm)
  setInterval(function () {
    if (pageKind() === "admin") return;
    if (!window.GalleryDB || !GalleryDB.fetchActiveAnnouncements) return;
    GalleryDB.fetchActiveAnnouncements()
      .then(function (list) {
        return Promise.resolve().then(function () {
          return GalleryDB.getSession()
            .then(function (session) {
              if (!session) return null;
              return GalleryDB.getMyProfile();
            })
            .catch(function () {
              return null;
            })
            .then(function (profile) {
              var kind = pageKind();
              var now = new Date();
              var alarms = (list || []).filter(function (ann) {
                return (
                  ann.is_alarm &&
                  matchesPlace(ann, kind) &&
                  matchesAudience(ann, profile) &&
                  inSchedule(ann, now)
                );
              });
              alarms.forEach(function (ann) {
                // tampilkan splash + suara (inSchedule sudah cek kuota)
                showSplash(ann);
              });
            });
        });
      })
      .catch(function () {});
  }, 60000);


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
