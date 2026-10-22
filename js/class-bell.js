/**
 * Class end warning (global) — suara & notifikasi di semua pengunjung
 * - 5 menit sebelum checkout_end: TTS "Lima menit lagi jam pelajaran … Selesai"
 * - Saat checkout_end: lonceng sekolah + popup "jam pelajaran … telah selesai"
 * Data dari gallery_attendance_sessions (aktif, berlaku hari ini).
 */
(function () {
  const LS_WARN = "sh_class_warn_";
  const LS_END = "sh_class_end_";
  const POLL_MS = 15000;
  let sessionsCache = [];
  let unlocked = false;
  let lastFetch = 0;

  function inJakartaParts(d) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
    const wdMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
    return {
      weekday: wdMap[parts.weekday] || 1,
      date: parts.year + "-" + parts.month + "-" + parts.day,
      minutes: parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10),
      seconds: parseInt(parts.second, 10) || 0,
    };
  }

  function timeToMin(t) {
    if (!t) return 0;
    const p = String(t).slice(0, 5).split(":");
    return parseInt(p[0], 10) * 60 + parseInt(p[1] || 0, 10);
  }

  function sessionAppliesToday(s, nowP) {
    if (s.session_date) {
      return String(s.session_date).slice(0, 10) === nowP.date;
    }
    const days = s.weekdays || [];
    if (!days.length) return true;
    return days.map(Number).indexOf(nowP.weekday) >= 0;
  }

  function sessionLabel(s) {
    const mapel = (s.subject_label || s.subject_code || "").trim();
    const title = (s.title || "").trim();
    if (mapel && title && mapel.toLowerCase() !== title.toLowerCase()) {
      return mapel + " — " + title;
    }
    return title || mapel || "pelajaran";
  }

  function alreadyFired(prefix, sessionId, dateKey) {
    try {
      return localStorage.getItem(prefix + sessionId + "_" + dateKey) === "1";
    } catch (e) {
      return false;
    }
  }

  function markFired(prefix, sessionId, dateKey) {
    try {
      localStorage.setItem(prefix + sessionId + "_" + dateKey, "1");
    } catch (e) {}
  }

  function ensureAudioUnlock() {
    if (unlocked) return;
    unlocked = true;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        if (ctx.state === "suspended") ctx.resume().catch(function () {});
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        g.gain.value = 0.0001;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.01);
      }
    } catch (e) {}
    try {
      if (window.speechSynthesis) speechSynthesis.getVoices();
    } catch (e) {}
  }

  function speakId(text) {
    try {
      if (!window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "id-ID";
      u.rate = 0.95;
      u.pitch = 1;
      u.volume = 1;
      const voices = speechSynthesis.getVoices() || [];
      const idVoice =
        voices.find(function (v) {
          return /id(-|_)?ID|Indonesian/i.test(v.lang + " " + v.name);
        }) ||
        voices.find(function (v) {
          return /^id/i.test(v.lang);
        });
      if (idVoice) u.voice = idVoice;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (e) {
      console.warn("[class-bell] TTS", e);
    }
  }

  /** Lonceng sekolah klasik (Web Audio) */
  function playSchoolBell() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      if (ctx.state === "suspended") ctx.resume().catch(function () {});
      const now = ctx.currentTime;

      function ring(start, freq, dur, vol) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const f = ctx.createBiquadFilter();
        o.type = "sine";
        o.frequency.value = freq;
        f.type = "bandpass";
        f.frequency.value = freq;
        f.Q.value = 8;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        o.connect(f);
        f.connect(g);
        g.connect(ctx.destination);
        // slight metallic overtone
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.type = "triangle";
        o2.frequency.value = freq * 2.01;
        g2.gain.setValueAtTime(0.0001, start);
        g2.gain.exponentialRampToValueAtTime(vol * 0.35, start + 0.015);
        g2.gain.exponentialRampToValueAtTime(0.0001, start + dur * 0.85);
        o2.connect(g2);
        g2.connect(ctx.destination);
        o.start(start);
        o.stop(start + dur + 0.05);
        o2.start(start);
        o2.stop(start + dur + 0.05);
      }

      // pattern: ding-dong × 3 (mirip lonceng sekolah)
      const base = 784; // G5
      for (let i = 0; i < 3; i++) {
        const t0 = now + i * 1.15;
        ring(t0, base, 0.85, 0.22);
        ring(t0 + 0.38, base * 0.75, 0.95, 0.2);
      }
      setTimeout(function () {
        try {
          ctx.close();
        } catch (e) {}
      }, 4500);
    } catch (e) {
      console.warn("[class-bell] audio", e);
    }
  }

  function showEndPopup(label) {
    const existing = document.getElementById("shClassEndPopup");
    if (existing) existing.remove();
    const wrap = document.createElement("div");
    wrap.id = "shClassEndPopup";
    wrap.setAttribute("role", "alertdialog");
    wrap.setAttribute("aria-live", "assertive");
    wrap.style.cssText =
      "position:fixed;inset:0;z-index:10060;display:flex;align-items:center;justify-content:center;" +
      "padding:16px;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);";
    const box = document.createElement("div");
    box.style.cssText =
      "max-width:min(440px,94vw);padding:24px 22px;border-radius:16px;" +
      "background:linear-gradient(145deg,rgba(14,28,36,.98),rgba(8,16,22,.98));" +
      "border:1px solid rgba(255,211,107,.45);box-shadow:0 20px 50px rgba(0,0,0,.5);" +
      "color:#e8f7fc;text-align:center;font:500 15px/1.5 system-ui,sans-serif;";
    const icon = document.createElement("div");
    icon.style.cssText = "font-size:36px;margin-bottom:8px;";
    icon.textContent = "🔔";
    const h = document.createElement("div");
    h.style.cssText = "font-weight:700;font-size:17px;margin-bottom:10px;color:#ffd36b;";
    h.textContent = "Jam pelajaran selesai";
    const body = document.createElement("p");
    body.style.cssText = "margin:0 0 18px;color:#d5ebf3;";
    body.textContent = "Jam pelajaran " + label + " telah selesai.";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Baik";
    btn.style.cssText =
      "min-width:110px;padding:10px 18px;border-radius:10px;border:0;cursor:pointer;" +
      "background:linear-gradient(135deg,#3d9bb8,#2a7a94);color:#fff;font-weight:600;font-size:14px;";
    btn.onclick = function () {
      wrap.remove();
    };
    wrap.onclick = function (e) {
      if (e.target === wrap) wrap.remove();
    };
    box.appendChild(icon);
    box.appendChild(h);
    box.appendChild(body);
    box.appendChild(btn);
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    setTimeout(function () {
      try {
        btn.focus();
      } catch (e) {}
    }, 40);
    // auto-dismiss after 45s
    setTimeout(function () {
      try {
        if (wrap.parentNode) wrap.remove();
      } catch (e) {}
    }, 45000);
  }

  async function fetchSessions() {
    try {
      if (!window.GalleryDB || typeof GalleryDB.listActiveAttendanceSessions !== "function") {
        return [];
      }
      const list = await GalleryDB.listActiveAttendanceSessions();
      sessionsCache = Array.isArray(list) ? list : [];
      lastFetch = Date.now();
      return sessionsCache;
    } catch (e) {
      console.warn("[class-bell] fetch", e);
      return sessionsCache;
    }
  }

  function tick() {
    const now = new Date();
    const nowP = inJakartaParts(now);
    const today = sessionsCache.filter(function (s) {
      return s && s.active !== false && sessionAppliesToday(s, nowP);
    });

    today.forEach(function (s) {
      const endMin = timeToMin(s.checkout_end);
      if (!endMin && endMin !== 0) return;
      const warnMin = endMin - 5;
      const label = sessionLabel(s);
      const sid = String(s.id);

      // 5 menit sebelum berakhir (jendela ~1 menit agar tidak kelewatan poll)
      if (nowP.minutes === warnMin && !alreadyFired(LS_WARN, sid, nowP.date)) {
        markFired(LS_WARN, sid, nowP.date);
        ensureAudioUnlock();
        const text = "Lima menit lagi jam pelajaran " + label + " Selesai";
        speakId(text);
      }

      // tepat saat / melewati checkout_end (hanya fire sekali per sesi/hari)
      if (nowP.minutes >= endMin && !alreadyFired(LS_END, sid, nowP.date)) {
        // jangan fire terlalu lama setelah lewat (max 2 menit) agar refresh halaman lama tidak spam
        if (nowP.minutes <= endMin + 2) {
          markFired(LS_END, sid, nowP.date);
          ensureAudioUnlock();
          playSchoolBell();
          showEndPopup(label);
        } else {
          // sudah lewat jauh — tandai saja agar tidak muncul belakangan
          markFired(LS_END, sid, nowP.date);
        }
      }
    });
  }

  async function loop() {
    if (Date.now() - lastFetch > 60000 || !sessionsCache.length) {
      await fetchSessions();
    }
    tick();
  }

  function boot() {
    // unlock audio setelah interaksi pertama (kebijakan browser)
    ["pointerdown", "keydown", "touchstart", "click"].forEach(function (ev) {
      document.addEventListener(
        ev,
        function () {
          ensureAudioUnlock();
        },
        { once: true, passive: true }
      );
    });
    if (window.speechSynthesis) {
      speechSynthesis.onvoiceschanged = function () {};
      try {
        speechSynthesis.getVoices();
      } catch (e) {}
    }

    loop();
    setInterval(loop, POLL_MS);

    // realtime: sesi absensi berubah dari admin
    try {
      if (window.GalleryDB && typeof GalleryDB.subscribeAttendanceLive === "function") {
        GalleryDB.subscribeAttendanceLive(function () {
          fetchSessions().then(function () {
            tick();
          });
        });
      }
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 800);
    });
  } else {
    setTimeout(boot, 800);
  }
})();
