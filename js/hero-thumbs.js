(() => {
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let cache = { videos: [], designs: [], webs: [] };
  let flying = false;
  // Jumat (getDay()===5) = animasi lempar kartu; hari lain = daun melayang
  const isFriday = () => new Date().getDay() === 5;

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

  /** Hari biasa: daun melayang + benturan sederhana (tidak menusuk) */
  function flyLeafMode(cards, stack) {
    playWhoosh(true);
    const midSwap = 0.35 + Math.random() * 0.08;
    let swapped = false;
    const duration = 2400 + Math.random() * 600; // lebih lama: muat thumb + dramatis
    const mobile = window.innerWidth < 700;
    // jauh ke kiri agar menutupi teks hero
    const leftBias = mobile ? -160 : -280;
    const spanX = mobile ? 100 : 160;
    const spanY = mobile ? 140 : 220;

    const states = cards.map((c, i) => {
      const dirY = -0.25 - Math.random() * 0.85;
      return {
        el: c,
        // posisi relatif selama animasi (diupdate tiap frame)
        x: 0,
        y: 0,
        // target puncak terbang
        tx: leftBias + (Math.random() * 2 - 1) * spanX * 0.6 + i * (mobile ? -12 : -20),
        ty: dirY * spanY * (0.55 + Math.random() * 0.5),
        rz: (Math.random() * 2 - 1) * 32,
        rx: (Math.random() * 2 - 1) * 10,
        ry: (Math.random() * 2 - 1) * 14,
        phase: Math.random() * Math.PI * 2,
        wobbleAmp: 14 + Math.random() * 18,
        delay: i * 0.05,
        z: 12 + i,
        w: c.offsetWidth || 240,
        h: c.offsetHeight || 160,
        vx: 0,
        vy: 0,
      };
    });

    // radius approx for collision (half diagonal soft)
    function collideResolve() {
      let bumped = false;
      for (let i = 0; i < states.length; i++) {
        for (let j = i + 1; j < states.length; j++) {
          const a = states[i];
          const b = states[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const minDist = Math.min(a.w, b.w) * 0.42;
          const dist = Math.hypot(dx, dy) || 0.01;
          if (dist < minDist) {
            const overlap = (minDist - dist) * 0.55;
            const nx = dx / dist;
            const ny = dy / dist;
            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;
            // pentalan ringan
            const push = 1.2 + Math.random();
            a.vx -= nx * push;
            a.vy -= ny * push;
            b.vx += nx * push;
            b.vy += ny * push;
            bumped = true;
          }
        }
      }
      if (bumped) playLeafBump();
    }

    const t0 = performance.now();
    let lastBump = 0;
    function frame(now) {
      const p = Math.min(1, (now - t0) / duration);
      states.forEach((s) => {
        const local = Math.max(0, Math.min(1, (p - s.delay) / Math.max(0.01, 1 - s.delay * 0.4)));
        // envelope naik-turun lembut (smoothstep)
        const e =
          local < 0.5
            ? local * 2 * local * 2 * (3 - 2 * local * 2) // approx
            : 1 - Math.pow((local - 0.5) * 2, 2) * (0.5 + 0.5 * local);
        const env = local < 0.55 ? easeInOutCubic(local / 0.55) : 1 - easeInOutCubic((local - 0.55) / 0.45);
        // target + ombang-ambing daun
        const sway = Math.sin(local * Math.PI * 3 + s.phase) * s.wobbleAmp * env;
        const swayY = Math.cos(local * Math.PI * 2.2 + s.phase) * (s.wobbleAmp * 0.45) * env;
        const targetX = s.tx * env + sway;
        const targetY = s.ty * env + swayY;
        // integrasi ringan ke target + velocity dari benturan
        s.vx *= 0.88;
        s.vy *= 0.88;
        s.x += (targetX - s.x) * 0.18 + s.vx;
        s.y += (targetY - s.y) * 0.18 + s.vy;
      });
      // benturan tiap frame (throttle sound)
      const before = states.map((s) => ({ x: s.x, y: s.y }));
      collideResolve();
      if (now - lastBump > 180) {
        let moved = false;
        for (let i = 0; i < states.length; i++) {
          if (Math.hypot(states[i].x - before[i].x, states[i].y - before[i].y) > 3) moved = true;
        }
        if (moved) lastBump = now;
      }

      states.forEach((s) => {
        const local = Math.max(0, Math.min(1, (p - s.delay) / Math.max(0.01, 1 - s.delay * 0.4)));
        const env = local < 0.55 ? easeInOutCubic(local / 0.55) : 1 - easeInOutCubic((local - 0.55) / 0.45);
        const rotZ = s.rz * env + Math.sin(local * Math.PI * 2.5 + s.phase) * 10;
        s.el.style.zIndex = String(30 + Math.round(10 + s.y * -0.02 + s.z));
        s.el.style.transform =
          "translate3d(" +
          s.x.toFixed(1) +
          "px," +
          s.y.toFixed(1) +
          "px,0) rotateX(" +
          (s.rx * env).toFixed(1) +
          "deg) rotateY(" +
          (s.ry * env).toFixed(1) +
          "deg) rotateZ(" +
          rotZ.toFixed(1) +
          "deg) scale(" +
          (1 + 0.04 * env).toFixed(3) +
          ")";
      });

      if (!swapped && p >= midSwap) {
        swapped = true;
        applyRandomContent();
        playWhoosh(true);
      }
      if (p < 1) requestAnimationFrame(frame);
      else finish(
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
    } else {
      stack.classList.add("is-leaf");
      flyLeafMode(cards, stack);
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
