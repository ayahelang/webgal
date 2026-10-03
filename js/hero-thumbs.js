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

  /** Hari biasa: daun melayang — fase cepat acak ke kiri/kiri-atas, lalu pantulan daun ringan + tidak menusuk */
  function flyLeafMode(cards, stack) {
    playWhoosh(true);
    const midSwap = 0.28 + Math.random() * 0.1;
    let swapped = false;
    // lebih lama supaya thumb sempat fully loaded + dramatika daun
    const duration = 3200 + Math.random() * 900;
    const mobile = window.innerWidth < 700;
    // target mentok kiri & kiri-atas (agak tidak wajar di fase awal)
    const leftBias = mobile ? -200 : -340;
    const topBias = mobile ? -110 : -180;
    const spanX = mobile ? 90 : 140;
    const spanY = mobile ? 80 : 120;

    const states = cards.map((c, i) => {
      // arah acak tapi bias kuat ke kiri / kiri-atas
      const biasX = leftBias + (Math.random() * 2 - 1) * spanX * 0.55 + i * (mobile ? -18 : -28);
      const biasY = topBias + Math.random() * spanY * 0.7 + (Math.random() * 2 - 1) * 30;
      // velocity awal acak (fase "tidak wajar" cepat)
      const speed = (mobile ? 9 : 14) + Math.random() * (mobile ? 7 : 11);
      const ang = Math.atan2(biasY, biasX) + (Math.random() * 2 - 1) * 0.55;
      return {
        el: c,
        x: 0,
        y: 0,
        // target puncak (mentok kiri / kiri-atas)
        tx: biasX,
        ty: biasY,
        // rotasi daun
        rz: (Math.random() * 2 - 1) * 42,
        rx: (Math.random() * 2 - 1) * 12,
        ry: (Math.random() * 2 - 1) * 16,
        phase: Math.random() * Math.PI * 2,
        wobbleAmp: 18 + Math.random() * 22,
        delay: i * 0.04 + Math.random() * 0.03,
        z: 14 + i,
        w: c.offsetWidth || 240,
        h: c.offsetHeight || 160,
        // physics body
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        // half-size untuk AABB (sedikit diperkecil agar visual gap wajar)
        hw: (c.offsetWidth || 240) * 0.48,
        hh: (c.offsetHeight || 160) * 0.48,
      };
    });

    // pemisahan keras + pantulan elastis ringan (daun) — mencegah saling menusuk
    function collideResolve(now) {
      let bumped = false;
      for (let i = 0; i < states.length; i++) {
        for (let j = i + 1; j < states.length; j++) {
          const a = states[i];
          const b = states[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          // AABB overlap check (lebih akurat untuk kartu persegi)
          const ox = a.hw + b.hw - Math.abs(dx);
          const oy = a.hh + b.hh - Math.abs(dy);
          if (ox > 0 && oy > 0) {
            // pisahkan di sumbu overlap terkecil
            if (ox < oy) {
              const sx = dx < 0 ? -1 : 1;
              const push = ox * 0.55;
              a.x -= sx * push;
              b.x += sx * push;
              // pantulan ringan (daun: restitution rendah)
              const relVx = a.vx - b.vx;
              if (relVx * sx > 0) {
                const impulse = relVx * 0.35;
                a.vx -= impulse * sx;
                b.vx += impulse * sx;
              }
              a.vx -= sx * (0.8 + Math.random() * 0.6);
              b.vx += sx * (0.8 + Math.random() * 0.6);
            } else {
              const sy = dy < 0 ? -1 : 1;
              const push = oy * 0.55;
              a.y -= sy * push;
              b.y += sy * push;
              const relVy = a.vy - b.vy;
              if (relVy * sy > 0) {
                const impulse = relVy * 0.35;
                a.vy -= impulse * sy;
                b.vy += impulse * sy;
              }
              a.vy -= sy * (0.8 + Math.random() * 0.6);
              b.vy += sy * (0.8 + Math.random() * 0.6);
            }
            bumped = true;
          }
        }
      }
      if (bumped && now - lastBump > 160) {
        playLeafBump();
        lastBump = now;
      }
    }

    const t0 = performance.now();
    let lastBump = 0;
    function frame(now) {
      const p = Math.min(1, (now - t0) / duration);
      const dt = 1; // frame unit

      states.forEach((s) => {
        const local = Math.max(0, Math.min(1, (p - s.delay) / Math.max(0.01, 1 - s.delay * 0.35)));
        // dua fase: 0–0.42 cepat acak (mentok), 0.42–1 daun melayang meliuk + kembali
        const peak = 0.42;
        let env;
        if (local < peak) {
          // cepat naik dengan easeOut (agak tidak wajar / "terlempar")
          env = easeOutSine(local / peak);
        } else {
          // turun lembut seperti daun jatuh meliuk
          env = 1 - easeInOutCubic((local - peak) / (1 - peak));
        }

        // target + sway daun (hanya kuat di puncak & turun)
        const swayX = Math.sin(local * Math.PI * 3.4 + s.phase) * s.wobbleAmp * env;
        const swayY = Math.cos(local * Math.PI * 2.6 + s.phase * 1.1) * (s.wobbleAmp * 0.55) * env;
        const targetX = s.tx * env + swayX;
        const targetY = s.ty * env + swayY;

        // fase awal: velocity dominan (cepat random); fase akhir: soft spring ke target
        if (local < peak) {
          // drag ringan + tarik ke target agar mentok kiri/kiri-atas
          s.vx *= 0.94;
          s.vy *= 0.94;
          s.vx += (targetX - s.x) * 0.07;
          s.vy += (targetY - s.y) * 0.07;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
        } else {
          // daun: damping lebih kuat + spring lembut + sisa velocity dari benturan
          s.vx *= 0.86;
          s.vy *= 0.86;
          s.x += (targetX - s.x) * 0.14 + s.vx;
          s.y += (targetY - s.y) * 0.14 + s.vy;
        }
      });

      collideResolve(now);

      states.forEach((s) => {
        const local = Math.max(0, Math.min(1, (p - s.delay) / Math.max(0.01, 1 - s.delay * 0.35)));
        const peak = 0.42;
        const env =
          local < peak
            ? easeOutSine(local / peak)
            : 1 - easeInOutCubic((local - peak) / (1 - peak));
        // rotasi meliuk-liuk seperti daun ringan
        const rotZ =
          s.rz * env +
          Math.sin(local * Math.PI * 3.1 + s.phase) * 14 * env +
          Math.sin(local * Math.PI * 5.2 + s.phase * 0.7) * 5 * env;
        const rotX = s.rx * env + Math.cos(local * Math.PI * 2.4 + s.phase) * 6 * env;
        const rotY = s.ry * env + Math.sin(local * Math.PI * 2.8 + s.phase * 1.2) * 7 * env;
        s.el.style.zIndex = String(30 + Math.round(12 + s.y * -0.025 + s.z));
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
          (1 + 0.05 * env).toFixed(3) +
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
