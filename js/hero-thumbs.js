(() => {
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let cache = { videos: [], designs: [], webs: [] };
  let flying = false;

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

  /* --- soft card whoosh via Web Audio (no external file) --- */
  let audioCtx = null;
  function playWhoosh() {
    try {
      if (reduced) return;
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const t0 = audioCtx.currentTime;
      // noise burst
      const dur = 0.22;
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.8);
      }
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      const filt = audioCtx.createBiquadFilter();
      filt.type = "bandpass";
      filt.frequency.value = 900 + Math.random() * 1200;
      filt.Q.value = 0.7;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filt);
      filt.connect(gain);
      gain.connect(audioCtx.destination);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
      // soft "tick"
      const o = audioCtx.createOscillator();
      const g2 = audioCtx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(180 + Math.random() * 80, t0);
      o.frequency.exponentialRampToValueAtTime(60, t0 + 0.12);
      g2.gain.setValueAtTime(0.04, t0);
      g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
      o.connect(g2);
      g2.connect(audioCtx.destination);
      o.start(t0);
      o.stop(t0 + 0.15);
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
  const easings = [easeOutBack, easeInOutCubic, easeOutElastic, (t) => 1 - Math.pow(1 - t, 3)];

  function flyCards() {
    if (flying || reduced) {
      applyRandomContent();
      return;
    }
    const stack = document.getElementById("heroThumbStack");
    const cards = stack ? [...stack.querySelectorAll(".mini-card")] : [];
    if (cards.length < 1) return;
    flying = true;
    stack.classList.add("is-flying");
    playWhoosh();

    const midSwap = 0.38 + Math.random() * 0.12;
    let swapped = false;
    const duration = 900 + Math.random() * 350; // ~0.9–1.25s natural & quick
    const starts = cards.map((c) => {
      const dx = (Math.random() * 2 - 1) * (window.innerWidth < 700 ? 90 : 160);
      const dy = (Math.random() * 2 - 1) * (window.innerWidth < 700 ? 70 : 130);
      const rz = (Math.random() * 2 - 1) * 48;
      const rx = (Math.random() * 2 - 1) * 36;
      const ry = (Math.random() * 2 - 1) * 50;
      const scale = 0.82 + Math.random() * 0.45;
      const z = Math.floor(Math.random() * 40);
      return { el: c, dx, dy, rz, rx, ry, scale, z, ease: easings[Math.floor(Math.random() * easings.length)] };
    });

    const t0 = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - t0) / duration);
      // fly out then back: 0→0.5 out, 0.5→1 return
      starts.forEach((s) => {
        const out = p < 0.5 ? s.ease(p * 2) : 1 - s.ease((p - 0.5) * 2);
        const x = s.dx * out;
        const y = s.dy * out;
        const rz = s.rz * out;
        const rx = s.rx * out;
        const ry = s.ry * out;
        const sc = 1 + (s.scale - 1) * out;
        s.el.style.zIndex = String(10 + s.z);
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
          sc.toFixed(3) +
          ")";
      });
      if (!swapped && p >= midSwap) {
        swapped = true;
        applyRandomContent();
        playWhoosh();
      }
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        starts.forEach((s) => {
          s.el.style.transform = "";
          s.el.style.zIndex = "";
        });
        stack.classList.remove("is-flying");
        flying = false;
      }
    }
    requestAnimationFrame(frame);
  }

  function bindDragFly() {
    const stack = document.getElementById("heroThumbStack");
    if (!stack || reduced) return;
    let last = null;
    let armed = false;

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
      return dist / dt; // px/ms
    }

    function onMove(e) {
      if (flying) return;
      if (!armed && e.type === "pointermove" && e.buttons === 0 && e.pointerType === "mouse") {
        // mouse hover drag without button: still count quick sweeps
      }
      const v = speed(e);
      // ~0.55 px/ms ≈ quick flick
      if (v > 0.55) {
        flyCards();
        last = null;
      }
    }
    function onDown(e) {
      armed = true;
      last = null;
      speed(e);
    }
    function onUp() {
      armed = false;
      last = null;
    }

    stack.addEventListener("pointerdown", onDown, { passive: true });
    stack.addEventListener("pointermove", onMove, { passive: true });
    stack.addEventListener("pointerup", onUp, { passive: true });
    stack.addEventListener("pointerleave", onUp, { passive: true });
    // also quick mouse move without press
    stack.addEventListener(
      "mousemove",
      (e) => {
        if (flying) return;
        const v = speed(e);
        if (v > 0.7) {
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
