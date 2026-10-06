/**
 * Absensi online — siswa (check-in / check-out + efek meriah)
 */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  let filter = "open";
  let sessions = [];
  let records = [];
  let profile = null;

  function inJakartaParts(d) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
    const wdMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
    return {
      weekday: wdMap[parts.weekday] || 1,
      date: parts.year + "-" + parts.month + "-" + parts.day,
      minutes: parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10),
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

  function windowStatus(s, nowP) {
    const ci0 = timeToMin(s.checkin_start);
    const ci1 = timeToMin(s.checkin_end);
    const co0 = timeToMin(s.checkout_start);
    const co1 = timeToMin(s.checkout_end);
    const m = nowP.minutes;
    const allowLate = !!s.allow_late;
    const inCheckin = m >= ci0 && m <= ci1;
    const lateButAllowed = allowLate && m > ci1 && m < co0;
    return {
      canCheckin: inCheckin || lateButAllowed,
      canCheckout: m >= co0 && m <= co1,
      checkinOpen: inCheckin,
      checkinLateClosed: m > ci1 && !allowLate,
      checkoutOpen: m >= co0 && m <= co1,
      isLateWindow: lateButAllowed,
    };
  }

  function matchesAudience(s, prof) {
    if (!prof || !prof.linked_student_name) return false;
    const y = String(prof.linked_angkatan_year || "");
    const c = String(prof.linked_class_code || "");
    const n = String(prof.linked_student_name || "").toLowerCase().trim();
    const aud = s.audience || "all_linked";
    if (aud === "all_linked") {
      if ((s.target_years || []).length && s.target_years.indexOf(y) < 0) return false;
      if ((s.target_classes || []).length && s.target_classes.indexOf(c) < 0) return false;
      return true;
    }
    if (aud === "class") {
      return (s.target_years || []).indexOf(y) >= 0 && (s.target_classes || []).indexOf(c) >= 0;
    }
    if (aud === "students") {
      const targets = s.target_students || [];
      return targets.some((t) => {
        const tn = String(t.name || "").toLowerCase().trim();
        const ty = String(t.year || t.angkatan_year || "");
        const tc = String(t.class || t.class_code || "");
        return tn === n && (!ty || ty === y) && (!tc || tc === c);
      });
    }
    return true;
  }

  function recFor(sessionId) {
    return records.find((r) => String(r.session_id) === String(sessionId));
  }

  function classify(s, nowP) {
    if (!matchesAudience(s, profile)) return null;
    if (!sessionAppliesToday(s, nowP) && !(recFor(s.id) && recFor(s.id).checkin_at)) {
      // still show if has record historically? only today's focus
      if (!s.session_date && !(s.weekdays || []).length) {
        /* always-on template */
      } else if (!sessionAppliesToday(s, nowP)) {
        return "idle";
      }
    }
    const rec = recFor(s.id);
    const w = windowStatus(s, nowP);
    const needOut = s.require_checkout !== false;
    if (rec && rec.checkin_at && (!needOut || rec.checkout_at)) return "done";
    if (rec && rec.checkin_at && needOut && !rec.checkout_at) {
      if (w.canCheckout || w.checkoutOpen) return "open";
      if (nowP.minutes > timeToMin(s.checkout_end)) return "missed"; // missed checkout
      return "open";
    }
    if (!rec || !rec.checkin_at) {
      if (w.canCheckin) return "open";
      if (w.checkinLateClosed && sessionAppliesToday(s, nowP)) return "missed";
      return "idle";
    }
    return "idle";
  }

  function celebrate(kind) {
    const toast = $("#attToast");
    if (toast) {
      toast.hidden = false;
      toast.textContent = kind === "out" ? "Mantap! Check-out tersimpan ✨" : "Hadir! Terima kasih, semangat belajar 🎉";
      setTimeout(() => (toast.hidden = true), 3200);
    }
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = kind === "out" ? [523, 659, 784, 1046] : [392, 523, 659, 784];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.value = freq;
        g.gain.value = 0.0001;
        o.connect(g);
        g.connect(ctx.destination);
        const t0 = ctx.currentTime + i * 0.09;
        g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
        o.start(t0);
        o.stop(t0 + 0.3);
      });
    } catch (e) {}
    // fireworks particles
    const canvas = $("#attFx");
    if (!canvas) return;
    canvas.hidden = false;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx2 = canvas.getContext("2d");
    const parts = [];
    for (let i = 0; i < 80; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 5;
      parts.push({
        x: canvas.width / 2,
        y: canvas.height * 0.4,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 40 + Math.random() * 30,
        color: ["#7de3ff", "#ffd36b", "#ff8fab", "#8ff5bd", "#c5a3ff"][i % 5],
      });
    }
    let frame = 0;
    function draw() {
      frame++;
      ctx2.clearRect(0, 0, canvas.width, canvas.height);
      parts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.life--;
        ctx2.globalAlpha = Math.max(0, p.life / 50);
        ctx2.fillStyle = p.color;
        ctx2.beginPath();
        ctx2.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx2.fill();
      });
      if (frame < 70) requestAnimationFrame(draw);
      else {
        canvas.hidden = true;
        ctx2.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    draw();
  }

  function render() {
    const host = $("#attList");
    if (!host) return;
    const nowP = inJakartaParts(new Date());
    const items = sessions
      .map((s) => ({ s, status: classify(s, nowP) }))
      .filter((x) => x.status && x.status !== "idle")
      .filter((x) => filter === "all" || x.status === filter);

    if (!items.length) {
      host.innerHTML = '<div class="summary-card muted">Tidak ada sesi absensi untuk filter ini.</div>';
      return;
    }
    host.innerHTML = items
      .map(({ s, status }) => {
        const rec = recFor(s.id);
        const w = windowStatus(s, nowP);
        const badge =
          status === "done" ? "✓ Selesai" : status === "missed" ? "Terlewat" : w.isLateWindow ? "Check-in (terlambat)" : w.canCheckin ? "Check-in buka" : w.canCheckout ? "Check-out buka" : "Aktif";
        let body = "";
        if (!rec || !rec.checkin_at) {
          body = `<label class="field"><span>Rencana belajar (singkat)</span>
            <input type="text" maxlength="120" data-ci-note="${s.id}" placeholder="Contoh: praktek domain & hosting"></label>
            <button type="button" class="btn btn-primary" data-ci="${s.id}" ${w.canCheckin ? "" : "disabled"}>Check-in hadir</button>`;
        } else if (s.require_checkout !== false && !rec.checkout_at) {
          const stIn = rec.checkin_status === "late" ? " · <b style=\"color:#ffb86b\">Terlambat</b>" : rec.checkin_status === "on_time" ? " · Tepat waktu" : "";
          body = `<p class="muted" style="font-size:12px">Check-in: ${esc(rec.checkin_note || "—")}${stIn}</p>
            <label class="field"><span>Yang sudah dikerjakan (ringkas)</span>
            <input type="text" maxlength="120" data-co-note="${s.id}" placeholder="Contoh: selesai setting custom domain"></label>
            <button type="button" class="btn btn-primary" data-co="${s.id}" ${w.canCheckout ? "" : "disabled"}>Check-out</button>`;
        } else {
          const stIn = rec.checkin_status === "late" ? " · <b style=\"color:#ffb86b\">Terlambat</b>" : rec.checkin_status === "on_time" ? " · Tepat waktu" : "";
          const stOut = rec.checkout_status === "late" ? " · <b style=\"color:#ffb86b\">Terlambat</b>" : "";
          body = `<p class="muted" style="font-size:13px">In: ${esc(rec.checkin_note || "—")}${stIn}<br>Out: ${esc(rec.checkout_note || "—")}${stOut}</p>`;
        }
        return `<div class="summary-card att-card" data-status="${status}">
          <div class="att-card-head">
            <div><strong>${esc(s.title)}</strong>
              <div class="muted" style="font-size:12px">${esc(s.subject_label || s.subject_code)} · ${esc(s.checkin_start)}–${esc(s.checkin_end)} → ${esc(s.checkout_start)}–${esc(s.checkout_end)}</div>
            </div>
            <span class="att-badge">${badge}</span>
          </div>
          ${body}
        </div>`;
      })
      .join("");

    $$("[data-ci]").forEach((b) =>
      b.addEventListener("click", async () => {
        const id = b.getAttribute("data-ci");
        const note = ($('[data-ci-note="' + id + '"]') || {}).value || "";
        b.disabled = true;
        try {
          await GalleryDB.submitAttendanceCheckin({ sessionId: id, note });
          celebrate("in");
          await reload();
        } catch (e) {
          alert(e.message || e);
          b.disabled = false;
        }
      })
    );
    $$("[data-co]").forEach((b) =>
      b.addEventListener("click", async () => {
        const id = b.getAttribute("data-co");
        const note = ($('[data-co-note="' + id + '"]') || {}).value || "";
        b.disabled = true;
        try {
          await GalleryDB.submitAttendanceCheckout({ sessionId: id, note });
          celebrate("out");
          await reload();
        } catch (e) {
          alert(e.message || e);
          b.disabled = false;
        }
      })
    );
  }

  function esc(t) {
    return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  }

  async function reload() {
    sessions = await GalleryDB.listActiveAttendanceSessions();
    records = await GalleryDB.myAttendanceRecords();
    render();
  }

  async function boot() {
    if (!window.GalleryDB || !GalleryDB.enabled()) return;
    const gate = $("#attLoginGate");
    const app = $("#attApp");
    $("#attBtnLogin") &&
      ($("#attBtnLogin").onclick = () =>
        GalleryDB.signInWithGoogle({ redirectTo: location.href }).catch((e) => alert(e.message || e)));

    const sess = await GalleryDB.getSession();
    if (!sess) {
      if (gate) gate.hidden = false;
      if (app) app.hidden = true;
      return;
    }
    if (gate) gate.hidden = true;
    if (app) app.hidden = false;
    profile = await GalleryDB.getMyProfile();
    const bar = $("#attProfileBar");
    if (bar) {
      if (!profile || !profile.linked_student_name) {
        bar.innerHTML =
          '<p class="muted">Akun login: <b>' +
          esc(sess.user.email) +
          '</b>. <a href="profile.html">Tautkan nama siswa di Profil</a> dulu untuk isi absensi.</p>';
      } else {
        bar.innerHTML =
          "<p>Halo <b>" +
          esc(profile.linked_student_name) +
          "</b> · Angkatan " +
          esc(profile.linked_angkatan_year) +
          " · Kelas " +
          esc(profile.linked_class_code) +
          "</p>";
      }
    }
    $$("#attFilters .filter").forEach((b) =>
      b.addEventListener("click", () => {
        $$("#attFilters .filter").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        filter = b.dataset.attFilter;
        render();
      })
    );
    await reload();
    // refresh status (terlambat / jendela check-in) tiap 20 dtk
    setInterval(() => render(), 20000);
    // Realtime: perubahan sesi/record dari guru langsung ke layar siswa
    try {
      if (window.GalleryDB && typeof GalleryDB.subscribeAttendanceLive === "function") {
        GalleryDB.subscribeAttendanceLive(function () {
          reload().catch(function () {});
        });
      }
    } catch (e) {
      console.warn("[att] realtime", e);
    }
    // fallback poll data
    setInterval(function () {
      reload().catch(function () {});
    }, 40000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
