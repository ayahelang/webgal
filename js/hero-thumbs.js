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

  /** Suara putaran roulette / roda — klik cepat lalu melambat */
  function playRoulette(durationSec) {
    try {
      if (reduced) return;
      const ctx = ensureAudio();
      const t0 = ctx.currentTime;
      const dur = Math.max(0.6, durationSec || 1.2);
      // interval klik: mulai cepat (~45ms), melambat ke ~180ms
      let t = 0;
      let interval = 0.04 + Math.random() * 0.015;
      let n = 0;
      while (t < dur && n < 40) {
        const tk = t0 + t;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        // pitch sedikit turun seiring waktu (seperti roda melambat)
        const freq = 880 - (t / dur) * 420 + (Math.random() * 40 - 20);
        o.frequency.setValueAtTime(Math.max(180, freq), tk);
        g.gain.setValueAtTime(0.0001, tk);
        g.gain.exponentialRampToValueAtTime(0.028 + Math.random() * 0.012, tk + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, tk + 0.035);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(tk);
        o.stop(tk + 0.04);
        // interval membesar (melambat)
        interval *= 1.08 + Math.random() * 0.04;
        t += interval;
        n++;
      }
      // "stop" soft thump di akhir
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = "sine";
      o2.frequency.setValueAtTime(120, t0 + dur);
      o2.frequency.exponentialRampToValueAtTime(55, t0 + dur + 0.12);
      g2.gain.setValueAtTime(0.04, t0 + dur);
      g2.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.14);
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.start(t0 + dur);
      o2.stop(t0 + dur + 0.15);
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
   * Hari biasa (bukan Kamis/Jumat): kartu berpencar → putar 3D (Z) → kembali bareng
   * Arah pencaran: [0]=atas, [1]=kiri-atas, [2]=kanan-atas sedikit
   */
  function flySpinMode(cards, stack) {
    playWhoosh(false);
    const midSwap = 0.3 + Math.random() * 0.1;
    let swapped = false;
    // cukup lama agar thumb sempat load saat kembali ke posisi awal
    const duration = 3000 + Math.random() * 700;
    const mobile = window.innerWidth < 700;

    // target relatif posisi awal — berpencar
    const targets = [
      // kartu 1 → naik lurus
      {
        dx: (Math.random() * 2 - 1) * (mobile ? 18 : 28),
        dy: mobile ? -(110 + Math.random() * 40) : -(150 + Math.random() * 55),
      },
      // kartu 2 → kiri agak atas
      {
        dx: mobile ? -(90 + Math.random() * 40) : -(130 + Math.random() * 55),
        dy: mobile ? -(70 + Math.random() * 35) : -(95 + Math.random() * 45),
      },
      // kartu 3 → kanan-atas sedikit
      {
        dx: mobile ? 45 + Math.random() * 35 : 60 + Math.random() * 50,
        dy: mobile ? -(80 + Math.random() * 35) : -(105 + Math.random() * 45),
      },
    ];

    const states = cards.map((c, i) => {
      const t = targets[i] || {
        dx: (Math.random() * 2 - 1) * 60,
        dy: -(90 + Math.random() * 40),
      };
      // arah putar Z: +1 atau -1 (random per kartu → biasanya beda)
      const spinDir = Math.random() < 0.5 ? 1 : -1;
      // kecepatan putar berbeda, tidak lemot: ~1.1–2.0 putaran penuh di fase spin
      const spins = 1.15 + Math.random() * 0.9;
      // tilt 3D ringan di sumbu X/Y agar terasa volume
      return {
        el: c,
        tx: t.dx,
        ty: t.dy,
        spinDir,
        totalRz: spinDir * spins * 360,
        rx: (Math.random() * 2 - 1) * (mobile ? 10 : 16),
        ry: (Math.random() * 2 - 1) * (mobile ? 12 : 20),
        // sedikit offset delay agar tidak 100% sinkron di awal, tapi return bareng
        delay: i * 0.025 + Math.random() * 0.02,
        z: 16 + i,
      };
    });

    // suara roulette per kartu (offset sedikit)
    states.forEach((s, i) => {
      setTimeout(() => {
        // durasi suara ≈ fase spin (~1s)
        playRoulette(0.95 + Math.random() * 0.35);
      }, 280 + i * 90 + Math.random() * 60);
    });

    const t0 = performance.now();

    function frame(now) {
      const p = Math.min(1, (now - t0) / duration);

      states.forEach((s) => {
        // progress lokal (delay kecil di awal saja)
        const local = Math.max(0, Math.min(1, (p - s.delay) / Math.max(0.01, 1 - s.delay)));

        // 3 fase:
        // 0.00–0.30  : berpencar ke target (easeOut)
        // 0.30–0.62  : di puncak, putar Z (ease linear-ish, kecepatan wajar)
        // 0.62–1.00  : kembali ke origin bareng (easeInOut) + sisa putaran meredam
        const OUT_END = 0.3;
        const SPIN_END = 0.62;

        let x, y, rz, rx, ry, scale;

        if (local < OUT_END) {
          // berpencar
          const t = easeOutSine(local / OUT_END);
          x = s.tx * t;
          y = s.ty * t;
          // mulai putar pelan
          rz = s.totalRz * 0.12 * t;
          rx = s.rx * t;
          ry = s.ry * t;
          scale = 1 + 0.06 * t;
        } else if (local < SPIN_END) {
          // putar di puncak
          const t = (local - OUT_END) / (SPIN_END - OUT_END); // 0→1
          x = s.tx;
          y = s.ty;
          // mayoritas putaran terjadi di sini (0.12 → 0.88 dari total)
          const spinProgress = 0.12 + t * 0.76;
          rz = s.totalRz * spinProgress;
          // goyang 3D ringan selama spin
          rx = s.rx + Math.sin(t * Math.PI * 2) * 4;
          ry = s.ry + Math.cos(t * Math.PI * 2.3) * 5;
          scale = 1.06;
        } else {
          // kembali bareng ke posisi awal, sisa putaran meredam dengan easing
          const t = (local - SPIN_END) / (1 - SPIN_END); // 0→1
          const ease = easeInOutCubic(t);
          // posisi: dari target → 0
          x = s.tx * (1 - ease);
          y = s.ty * (1 - ease);
          // di akhir fase spin rz ≈ totalRz * 0.88; lanjutkan sisa lalu redam ke 0
          // supaya tidak loncat: interpolasi dari 0.88 → 1.0 (selesai putaran) lalu visual damp
          const spinEndVal = s.totalRz * (0.88 + 0.12 * Math.min(1, ease * 1.4));
          rz = spinEndVal * (1 - ease); // sisa putaran meredam seiring kembali
          rx = s.rx * (1 - ease);
          ry = s.ry * (1 - ease);
          scale = 1.06 - 0.06 * ease;
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
