(() => {
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let cache = { videos: [], designs: [], webs: [] };
  let flying = false;
  // Jumat = lempar kartu 3D; Kamis = daun melayang; hari lain = berpencar + spin
  const isFriday = () => new Date().getDay() === 5;
  const isThursday = () => new Date().getDay() === 4;

  function pick(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function ytId(url) {
    if (!url) return "";
    const m =
      String(url).match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{6,})/) ||
      String(url).match(/youtube\.com\/watch\?.*?v=([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : "";
  }
  function videoThumb(url) {
    const id = ytId(url);
    if (id) return "https://img.youtube.com/vi/" + id + "/hqdefault.jpg";
    const dm = String(url).match(/dailymotion\.com\/(?:video|embed\/video)\/([a-zA-Z0-9]+)/);
    if (dm) return "https://www.dailymotion.com/thumbnail/video/" + dm[1];
    return "";
  }
  function webThumb(url) {
    if (!url) return "";
    return "https://image.thum.io/get/width/480/crop/720/" + url;
  }
  function setCard(el, imgUrl, title, sub) {
    if (!el) return;
    const bg = el.querySelector("[data-bg]");
    const t = el.querySelector("[data-title]");
    const s = el.querySelector("[data-sub]");
    if (bg && imgUrl) bg.style.backgroundImage = 'url("' + String(imgUrl).replace(/"/g, "") + '")';
    if (t) t.textContent = title || t.textContent;
    if (s) s.textContent = sub || "";
  }

  function applyRandomContent() {
    const v = pick(cache.videos.filter((x) => x && x.url));
    const d = pick(cache.designs.filter((x) => x && (x.image_url || x.url)));
    const w = pick(cache.webs.filter((x) => x && x.url));
    if (v) {
      setCard(
        document.getElementById("heroThumbVideo"),
        videoThumb(v.url) || webThumb(v.url),
        v.title || "Video",
        (v.owner_name || v.platform || "VIDEO").toString().slice(0, 28)
      );
    }
    if (d) {
      setCard(
        document.getElementById("heroThumbDesign"),
        d.image_url || d.thumb_url || webThumb(d.url),
        d.title || "Desain",
        (d.author_name || d.category || "DESAIN").toString().slice(0, 28)
      );
    }
    if (w) {
      setCard(
        document.getElementById("heroThumbWeb"),
        webThumb(w.url),
        w.title || "Website",
        (w.owner || "WEB").toString().slice(0, 28)
      );
    }
  }

  let audioCtx = null;
  function ensureAudio() {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }
  function playWhoosh(soft) {
    try {
      if (reduced) return;
      const ctx = ensureAudio();
      const t0 = ctx.currentTime;
      if (soft) {
        // angin + gemerisik daun (noise berlapis)
        const dur = 0.85;
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const env = Math.sin((i / data.length) * Math.PI);
          data[i] = (Math.random() * 2 - 1) * env * 0.55;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.setValueAtTime(280, t0);
        lp.frequency.linearRampToValueAtTime(720, t0 + 0.35);
        lp.frequency.linearRampToValueAtTime(320, t0 + dur);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.09, t0 + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(lp);
        lp.connect(gain);
        gain.connect(ctx.destination);
        src.start(t0);
        src.stop(t0 + dur + 0.02);
        // "crack" daun singkat
        for (let k = 0; k < 3; k++) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "triangle";
          const tk = t0 + 0.12 + k * 0.18 + Math.random() * 0.05;
          o.frequency.setValueAtTime(220 + Math.random() * 400, tk);
          o.frequency.exponentialRampToValueAtTime(80, tk + 0.08);
          g.gain.setValueAtTime(0.025, tk);
          g.gain.exponentialRampToValueAtTime(0.0001, tk + 0.09);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(tk);
          o.stop(tk + 0.1);
        }
        return;
      }
      const dur = 0.2;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.6);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = "bandpass";
      filt.frequency.value = 900 + Math.random() * 1200;
      filt.Q.value = 0.6;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filt);
      filt.connect(gain);
      gain.connect(ctx.destination);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
    } catch (e) {}
  }
  function playLeafBump() {
    try {
      if (reduced) return;
      const ctx = ensureAudio();
      const t0 = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(140 + Math.random() * 60, t0);
      o.frequency.exponentialRampToValueAtTime(50, t0 + 0.07);
      g.gain.setValueAtTime(0.035, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.09);
    } catch (e) {}
  }

  /** Suara putaran roulette / roda — klik cepat lalu melambat (lebih nyaring) */
  function playRoulette(durationSec) {
    try {
      if (reduced) return;
      const ctx = ensureAudio();
      const t0 = ctx.currentTime;
      const dur = Math.max(0.6, durationSec || 1.2);
      let t = 0;
      let interval = 0.038 + Math.random() * 0.012;
      let n = 0;
      while (t < dur && n < 42) {
        const tk = t0 + t;
        // klik utama (square)
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        const freq = 920 - (t / dur) * 480 + (Math.random() * 50 - 25);
        o.frequency.setValueAtTime(Math.max(160, freq), tk);
        g.gain.setValueAtTime(0.0001, tk);
        g.gain.exponentialRampToValueAtTime(0.07 + Math.random() * 0.025, tk + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, tk + 0.04);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(tk);
        o.stop(tk + 0.045);
        // layer noise pendek biar lebih "kayu/plastik"
        if (n % 2 === 0) {
          const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          const ng = ctx.createGain();
          ng.gain.setValueAtTime(0.045, tk);
          ng.gain.exponentialRampToValueAtTime(0.0001, tk + 0.028);
          src.connect(ng);
          ng.connect(ctx.destination);
          src.start(tk);
          src.stop(tk + 0.03);
        }
        interval *= 1.075 + Math.random() * 0.035;
        t += interval;
        n++;
      }
      // thump stop
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = "sine";
      o2.frequency.setValueAtTime(140, t0 + dur);
      o2.frequency.exponentialRampToValueAtTime(48, t0 + dur + 0.14);
      g2.gain.setValueAtTime(0.09, t0 + dur);
      g2.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.16);
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.start(t0 + dur);
      o2.stop(t0 + dur + 0.17);
    } catch (e) {}
  }

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function easeOutElastic(t) {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  }
  function easeOutSine(t) {
    return Math.sin((t * Math.PI) / 2);
  }
  const easingsHard = [easeOutBack, easeInOutCubic, easeOutElastic, (t) => 1 - Math.pow(1 - t, 3)];
  const easingsSoft = [easeInOutCubic, easeOutSine, (t) => t * t * (3 - 2 * t), (t) => 1 - Math.pow(1 - t, 2)];

  /** Jumat: lempar kartu 3D (versi heboh) */
  function flyThrowMode(cards, stack) {
    playWhoosh(false);
    const midSwap = 0.38 + Math.random() * 0.12;
    let swapped = false;
    const duration = 900 + Math.random() * 350;
    const mobile = window.innerWidth < 700;
    const starts = cards.map((c) => ({
      el: c,
      dx: (Math.random() * 2 - 1) * (mobile ? 90 : 160),
      dy: (Math.random() * 2 - 1) * (mobile ? 70 : 130),
      rz: (Math.random() * 2 - 1) * 48,
      rx: (Math.random() * 2 - 1) * 36,
      ry: (Math.random() * 2 - 1) * 50,
      scale: 0.82 + Math.random() * 0.45,
      z: Math.floor(Math.random() * 40),
      ease: easingsHard[Math.floor(Math.random() * easingsHard.length)],
    }));
    const t0 = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - t0) / duration);
      starts.forEach((s) => {
        const out = p < 0.5 ? s.ease(p * 2) : 1 - s.ease((p - 0.5) * 2);
        s.el.style.zIndex = String(10 + s.z);
        s.el.style.transform =
          "translate3d(" +
          (s.dx * out).toFixed(1) +
          "px," +
          (s.dy * out).toFixed(1) +
          "px,0) rotateX(" +
          (s.rx * out).toFixed(1) +
          "deg) rotateY(" +
          (s.ry * out).toFixed(1) +
          "deg) rotateZ(" +
          (s.rz * out).toFixed(1) +
          "deg) scale(" +
          (1 + (s.scale - 1) * out).toFixed(3) +
          ")";
      });
      if (!swapped && p >= midSwap) {
        swapped = true;
        applyRandomContent();
        playWhoosh(false);
      }
      if (p < 1) requestAnimationFrame(frame);
      else finish(cards, stack, starts);
    }
    requestAnimationFrame(frame);
  }

  /** Hari biasa: daun beterbangan — angin kencang acak ke kiri-atas, mentok edge, lalu jatuh lembut kembali */
  function flyLeafMode(cards, stack) {
    playWhoosh(true);
    const midSwap = 0.22 + Math.random() * 0.12;
    let swapped = false;
    // cukup lama agar fase angin + jatuh terasa natural
    const duration = 3800 + Math.random() * 1200;
    const mobile = window.innerWidth < 700;

    // batas "mentok" relatif ke posisi stack (pixel, negatif = kiri/atas)
    // kartu dianggap mentok kiri/atas saat pusatnya mendekati pinggir viewport
    const stackRect = stack.getBoundingClientRect();
    const edgeLeft = -(stackRect.left + (cards[0]?.offsetWidth || 200) * 0.35);
    const edgeTop = -(stackRect.top + (cards[0]?.offsetHeight || 140) * 0.25);
    // jangan biarkan terlalu jauh di luar layar
    const clampLeft = Math.min(edgeLeft, mobile ? -220 : -380);
    const clampTop = Math.min(edgeTop, mobile ? -140 : -240);

    const states = cards.map((c, i) => {
      // arah angin: kuadran kiri-atas, tiap daun beda sudut & kecepatan
      // angle: π .. 1.5π  (kiri murni → kiri-atas → atas murni), dengan jitter
      const baseAng = Math.PI + Math.random() * (Math.PI * 0.48); // ≈180°–266°
      const speed = (mobile ? 11 : 17) + Math.random() * (mobile ? 9 : 14);
      // sedikit delay acak biar tidak serentak (angin menerpa bertahap)
      const delay = i * (0.035 + Math.random() * 0.04) + Math.random() * 0.05;
      // kapan angin "reda" untuk daun ini (0.28–0.48 dari progress lokal)
      const windEnd = 0.28 + Math.random() * 0.2;
      return {
        el: c,
        x: 0,
        y: 0,
        vx: Math.cos(baseAng) * speed,
        vy: Math.sin(baseAng) * speed,
        // rotasi daun
        rz: (Math.random() * 2 - 1) * 50,
        rx: (Math.random() * 2 - 1) * 14,
        ry: (Math.random() * 2 - 1) * 18,
        phase: Math.random() * Math.PI * 2,
        wobbleFreq: 2.4 + Math.random() * 2.2,
        wobbleAmp: 14 + Math.random() * 20,
        delay,
        windEnd,
        z: 14 + i,
        hw: (c.offsetWidth || 240) * 0.48,
        hh: (c.offsetHeight || 160) * 0.48,
        // status physics
        hitEdge: false,
        settled: false,
      };
    });

    // collision antar-daun (AABB + restitution rendah)
    function collideResolve(now) {
      let bumped = false;
      for (let i = 0; i < states.length; i++) {
        for (let j = i + 1; j < states.length; j++) {
          const a = states[i];
          const b = states[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const ox = a.hw + b.hw - Math.abs(dx);
          const oy = a.hh + b.hh - Math.abs(dy);
          if (ox > 0 && oy > 0) {
            if (ox < oy) {
              const sx = dx < 0 ? -1 : 1;
              const push = ox * 0.5;
              a.x -= sx * push;
              b.x += sx * push;
              const relVx = a.vx - b.vx;
              if (relVx * sx > 0) {
                const impulse = relVx * 0.3;
                a.vx -= impulse * sx;
                b.vx += impulse * sx;
              }
              a.vx -= sx * (0.6 + Math.random() * 0.5);
              b.vx += sx * (0.6 + Math.random() * 0.5);
            } else {
              const sy = dy < 0 ? -1 : 1;
              const push = oy * 0.5;
              a.y -= sy * push;
              b.y += sy * push;
              const relVy = a.vy - b.vy;
              if (relVy * sy > 0) {
                const impulse = relVy * 0.3;
                a.vy -= impulse * sy;
                b.vy += impulse * sy;
              }
              a.vy -= sy * (0.6 + Math.random() * 0.5);
              b.vy += sy * (0.6 + Math.random() * 0.5);
            }
            bumped = true;
          }
        }
      }
      if (bumped && now - lastBump > 180) {
        playLeafBump();
        lastBump = now;
      }
    }

    // pantulan di pinggir kiri / atas layar
    function edgeBounce(s) {
      let hit = false;
      // mentok kiri
      if (s.x <= clampLeft) {
        s.x = clampLeft;
        if (s.vx < 0) {
          s.vx = -s.vx * (0.25 + Math.random() * 0.2); // restitution rendah (daun)
          s.vy += (Math.random() * 2 - 1) * 1.5; // sedikit goyang
          hit = true;
        }
      }
      // mentok atas
      if (s.y <= clampTop) {
        s.y = clampTop;
        if (s.vy < 0) {
          s.vy = -s.vy * (0.22 + Math.random() * 0.18);
          s.vx += (Math.random() * 2 - 1) * 1.8;
          hit = true;
        }
      }
      if (hit && !s.hitEdge) {
        s.hitEdge = true;
        playLeafBump();
      }
    }

    const t0 = performance.now();
    let lastBump = 0;
    let lastTs = t0;

    function frame(now) {
      const p = Math.min(1, (now - t0) / duration);
      // dt normalisasi ke ~60fps supaya physics stabil
      const rawDt = Math.min(32, now - lastTs) / 16.67;
      lastTs = now;

      states.forEach((s) => {
        // progress lokal per daun (delay acak)
        const local = Math.max(0, Math.min(1, (p - s.delay) / Math.max(0.01, 1 - s.delay * 0.4)));
        if (local <= 0) return;

        // ── fase angin (0 → windEnd): gaya dorong ke kiri-atas + drag ringan
        // ── fase reda  (windEnd → 1): angin hilang, gravity + spring kembali ke origin
        const windPhase = local < s.windEnd;
        const windFade = windPhase
          ? 1 - local / s.windEnd // semakin kuat di awal, reda mendekati windEnd
          : 0;

        if (windPhase) {
          // dorongan angin residual (sudah ada velocity awal, tambah sedikit impuls acak)
          s.vx += (Math.random() * 2 - 1) * 0.35 * windFade;
          s.vy += (Math.random() * 2 - 1) * 0.25 * windFade;
          // drag udara ringan
          s.vx *= 0.985;
          s.vy *= 0.985;
        } else {
          // angin reda → gravity (turun) + spring lembut ke (0,0) + damping kuat
          const fallT = (local - s.windEnd) / (1 - s.windEnd); // 0→1 di fase jatuh
          // gravity: tarik ke bawah (positif Y)
          s.vy += 0.55 + fallT * 0.35;
          // spring kembali ke origin (semakin kuat seiring waktu)
          const spring = 0.04 + fallT * 0.09;
          s.vx += -s.x * spring;
          s.vy += -s.y * spring;
          // damping (daun ringan, cepat tenang)
          s.vx *= 0.92;
          s.vy *= 0.90;
        }

        // integrasi posisi
        s.x += s.vx * rawDt;
        s.y += s.vy * rawDt;

        // pantulan di edge kiri/atas
        edgeBounce(s);

        // di akhir, pastikan mendekati origin
        if (local > 0.92) {
          s.x *= 0.85;
          s.y *= 0.85;
          s.vx *= 0.7;
          s.vy *= 0.7;
        }
      });

      collideResolve(now);

      // render
      states.forEach((s) => {
        const local = Math.max(0, Math.min(1, (p - s.delay) / Math.max(0.01, 1 - s.delay * 0.4)));
        // amplitude rotasi mengikuti seberapa jauh daun dari origin (lebih natural)
        const dist = Math.sqrt(s.x * s.x + s.y * s.y);
        const env = Math.min(1, dist / 180);
        const wobble =
          Math.sin(local * Math.PI * s.wobbleFreq + s.phase) * s.wobbleAmp * env;
        const rotZ =
          s.rz * env +
          wobble +
          Math.sin(local * Math.PI * 4.5 + s.phase * 0.7) * 6 * env;
        const rotX = s.rx * env + Math.cos(local * Math.PI * 2.2 + s.phase) * 5 * env;
        const rotY = s.ry * env + Math.sin(local * Math.PI * 2.6 + s.phase * 1.15) * 6 * env;
        const scale = 1 + 0.04 * env;

        s.el.style.zIndex = String(30 + Math.round(12 + s.y * -0.03 + s.z));
        s.el.style.transform =
          "translate3d(" +
          s.x.toFixed(1) +
          "px," +
          s.y.toFixed(1) +
          "px,0) rotateX(" +
          rotX.toFixed(1) +
          "deg) rotateY(" +
          rotY.toFixed(1) +
          "deg) rotateZ(" +
          rotZ.toFixed(1) +
          "deg) scale(" +
          scale.toFixed(3) +
          ")";
      });

      if (!swapped && p >= midSwap) {
        swapped = true;
        applyRandomContent();
        playWhoosh(true);
      }
      if (p < 1) requestAnimationFrame(frame);
      else
        finish(
          cards,
          stack,
          states.map((s) => ({ el: s.el }))
        );
    }
    requestAnimationFrame(frame);
  }

  /**
   * Hari biasa (bukan Kamis/Jumat): kartu berpencar → putar horizontal (rotateY) → kembali bareng
   * Arah: [0]=atas, [1]=kiri, [2]=kanan agak bawah — tetap di dalam layar, tidak overlap
   */
  function flySpinMode(cards, stack) {
    playWhoosh(false);
    const midSwap = 0.3 + Math.random() * 0.1;
    let swapped = false;
    const duration = 3000 + Math.random() * 700;
    const mobile = window.innerWidth < 700;
    const pad = 16;

    // batas aman agar kartu tidak keluar viewport
    function safeTarget(el, preferDx, preferDy) {
      const r = el.getBoundingClientRect();
      const maxLeft = -(r.left - pad);
      const maxRight = window.innerWidth - r.right - pad;
      const maxUp = -(r.top - pad);
      const maxDown = window.innerHeight - r.bottom - pad;
      let dx = preferDx;
      let dy = preferDy;
      if (dx < 0) dx = Math.max(dx, maxLeft);
      else dx = Math.min(dx, maxRight);
      if (dy < 0) dy = Math.max(dy, maxUp);
      else dy = Math.min(dy, maxDown);
      return { dx, dy };
    }

    // arah pencaran ideal (sebelum clamp)
    const preferred = [
      // kartu 1 → atas
      {
        dx: (Math.random() * 2 - 1) * (mobile ? 12 : 20),
        dy: mobile ? -(100 + Math.random() * 30) : -(130 + Math.random() * 40),
      },
      // kartu 2 → kiri (agak netral vertikal)
      {
        dx: mobile ? -(85 + Math.random() * 35) : -(120 + Math.random() * 45),
        dy: (Math.random() * 2 - 1) * (mobile ? 18 : 28),
      },
      // kartu 3 → kanan, agak ke bawah boleh
      {
        dx: mobile ? 55 + Math.random() * 35 : 75 + Math.random() * 45,
        dy: mobile ? 20 + Math.random() * 35 : 25 + Math.random() * 45,
      },
    ];

    // pastikan target tidak overlap kasar: minimal jarak antar pusat ~ 130px
    const rawTargets = cards.map((c, i) => {
      const p = preferred[i] || { dx: 0, dy: -80 };
      return safeTarget(c, p.dx, p.dy);
    });
    // separasi sederhana jika terlalu dekat
    for (let i = 0; i < rawTargets.length; i++) {
      for (let j = i + 1; j < rawTargets.length; j++) {
        const a = rawTargets[i];
        const b = rawTargets[j];
        let dx = b.dx - a.dx;
        let dy = b.dy - a.dy;
        const dist = Math.hypot(dx, dy);
        const minDist = mobile ? 110 : 140;
        if (dist < minDist && dist > 0.1) {
          const push = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          a.dx -= nx * push;
          a.dy -= ny * push;
          b.dx += nx * push;
          b.dy += ny * push;
          // re-clamp setelah push
          const sa = safeTarget(cards[i], a.dx, a.dy);
          const sb = safeTarget(cards[j], b.dx, b.dy);
          rawTargets[i] = sa;
          rawTargets[j] = sb;
        }
      }
    }

    // arah putar: pastikan TIDAK semua sama
    const dirs = cards.map(() => (Math.random() < 0.5 ? 1 : -1));
    if (dirs.length >= 2 && dirs.every((d) => d === dirs[0])) {
      dirs[1] = -dirs[0];
    }
    // kalau 3 kartu dan 2 sama, biarkan; kalau semua sama sudah diforce di atas
    // kecepatan putar sangat beda (putaran penuh di fase spin)
    const speedPool = [1.2, 1.75, 2.35].sort(() => Math.random() - 0.5);

    const states = cards.map((c, i) => {
      const t = rawTargets[i] || { dx: 0, dy: -80 };
      const spinDir = dirs[i];
      const spins = (speedPool[i] || 1.5) + (Math.random() * 0.2 - 0.1);
      return {
        el: c,
        tx: t.dx,
        ty: t.dy,
        // putar horizontal = rotateY
        totalRy: spinDir * spins * 360,
        // tilt X ringan saja biar ada volume, Z hampir diam
        rx: (Math.random() * 2 - 1) * (mobile ? 6 : 10),
        rz: (Math.random() * 2 - 1) * 4,
        delay: i * 0.02 + Math.random() * 0.015,
        z: 16 + i,
      };
    });

    // suara roulette per kartu (lebih nyaring, offset)
    states.forEach((s, i) => {
      setTimeout(() => {
        playRoulette(1.0 + Math.random() * 0.3);
      }, 260 + i * 100 + Math.random() * 50);
    });

    const t0 = performance.now();

    function frame(now) {
      const p = Math.min(1, (now - t0) / duration);

      states.forEach((s) => {
        const local = Math.max(0, Math.min(1, (p - s.delay) / Math.max(0.01, 1 - s.delay)));

        // 0.00–0.28  berpencar
        // 0.28–0.64  putar horizontal di tempat (rotateY)
        // 0.64–1.00  kembali bareng + sisa putaran meredam
        const OUT_END = 0.28;
        const SPIN_END = 0.64;

        let x, y, ry, rx, rz, scale;

        if (local < OUT_END) {
          const t = easeOutSine(local / OUT_END);
          x = s.tx * t;
          y = s.ty * t;
          ry = s.totalRy * 0.1 * t; // mulai putar pelan
          rx = s.rx * t;
          rz = s.rz * t;
          scale = 1 + 0.05 * t;
        } else if (local < SPIN_END) {
          const t = (local - OUT_END) / (SPIN_END - OUT_END);
          x = s.tx;
          y = s.ty;
          // mayoritas putaran horizontal di sini
          const spinProgress = 0.1 + t * 0.8;
          ry = s.totalRy * spinProgress;
          rx = s.rx;
          rz = s.rz;
          scale = 1.05;
        } else {
          const t = (local - SPIN_END) / (1 - SPIN_END);
          const ease = easeInOutCubic(t);
          x = s.tx * (1 - ease);
          y = s.ty * (1 - ease);
          // sisa putaran meredam ke 0
          const spinEndVal = s.totalRy * (0.9 + 0.1 * Math.min(1, ease * 1.3));
          ry = spinEndVal * (1 - ease);
          rx = s.rx * (1 - ease);
          rz = s.rz * (1 - ease);
          scale = 1.05 - 0.05 * ease;
        }

        s.el.style.zIndex = String(20 + s.z + Math.round(Math.abs(y) * 0.02));
        s.el.style.transform =
          "translate3d(" +
          x.toFixed(1) +
          "px," +
          y.toFixed(1) +
          "px,0) rotateX(" +
          rx.toFixed(1) +
          "deg) rotateY(" +
          ry.toFixed(1) +
          "deg) rotateZ(" +
          rz.toFixed(1) +
          "deg) scale(" +
          scale.toFixed(3) +
          ")";
      });

      if (!swapped && p >= midSwap) {
        swapped = true;
        applyRandomContent();
        playWhoosh(false);
      }
      if (p < 1) requestAnimationFrame(frame);
      else
        finish(
          cards,
          stack,
          states.map((s) => ({ el: s.el }))
        );
    }
    requestAnimationFrame(frame);
  }

  function finish(cards, stack, starts) {
    (starts || []).forEach((s) => {
      s.el.style.transform = "";
      s.el.style.zIndex = "";
    });
    if (stack) stack.classList.remove("is-flying", "is-leaf");
    flying = false;
  }

  function flyCards() {
    if (flying || reduced) {
      applyRandomContent();
      return;
    }
    const stack = document.getElementById("heroThumbStack");
    const cards = stack ? [...stack.querySelectorAll(".mini-card")] : [];
    if (!cards.length) return;
    flying = true;
    stack.classList.add("is-flying");
    if (isFriday()) {
      stack.classList.remove("is-leaf");
      flyThrowMode(cards, stack);
    } else if (isThursday()) {
      stack.classList.add("is-leaf");
      flyLeafMode(cards, stack);
    } else {
      stack.classList.remove("is-leaf");
      flySpinMode(cards, stack);
    }
  }

  function bindDragFly() {
    const stack = document.getElementById("heroThumbStack");
    if (!stack || reduced) return;
    let last = null;
    function speed(e) {
      const x = e.clientX != null ? e.clientX : e.touches && e.touches[0] ? e.touches[0].clientX : 0;
      const y = e.clientY != null ? e.clientY : e.touches && e.touches[0] ? e.touches[0].clientY : 0;
      const t = performance.now();
      if (!last) {
        last = { x, y, t };
        return 0;
      }
      const dt = Math.max(1, t - last.t);
      const dist = Math.hypot(x - last.x, y - last.y);
      last = { x, y, t };
      return dist / dt;
    }
    stack.addEventListener(
      "pointermove",
      (e) => {
        if (flying) return;
        if (speed(e) > 0.55) {
          flyCards();
          last = null;
        }
      },
      { passive: true }
    );
    stack.addEventListener(
      "mousemove",
      (e) => {
        if (flying) return;
        if (speed(e) > 0.7) {
          flyCards();
          last = null;
        }
      },
      { passive: true }
    );
  }

  async function load() {
    if (!window.GalleryDB) return;
    try {
      if (GalleryDB.listVideos) cache.videos = (await GalleryDB.listVideos()) || [];
    } catch (e) {}
    try {
      if (GalleryDB.listDesignsPublic) cache.designs = (await GalleryDB.listDesignsPublic()) || [];
      else if (GalleryDB.adminListDesigns) cache.designs = (await GalleryDB.adminListDesigns()) || [];
    } catch (e) {}
    try {
      const g = GalleryDB.fetchGalleryFromDb ? await GalleryDB.fetchGalleryFromDb() : null;
      const students = (g && g.students) || [];
      const webs = [];
      students.forEach((st) => {
        (st.works || st.websites || []).forEach((w) => {
          if (w && w.url) webs.push({ title: w.title || w.name || "Website", url: w.url, owner: st.name });
        });
      });
      cache.webs = webs;
    } catch (e) {}
    applyRandomContent();
    bindDragFly();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(load, 400));
  else setTimeout(load, 400);
})();
