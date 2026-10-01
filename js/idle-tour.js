/**
 * Idle auto-tour — scroll + pindah halaman acak.
 * Idle: 3s, lalu 5s, 7s... (+2s setelah user menginterupsi).
 */
(function () {
  const PAGES = [
    "index.html",
    "videos.html",
    "skills.html",
    "refleksi.html",
    "stats.html",
    "about.html",
    "chat.html",
    "kisi-kisi.html",
  ];
  const SKIP = { "admin.html": 1, "profile.html": 1, "submit.html": 1, "my-works.html": 1 };
  const STORAGE_IDLE = "sh_tour_idle_ms";
  const STORAGE_VISITED = "sh_tour_visited";
  const BASE_IDLE = 3000;
  const IDLE_STEP = 2000;

  let idleMs = BASE_IDLE;
  let idleTimer = null;
  let tourActive = false;
  let abortTour = false;
  let raf = 0;
  let lastActivity = Date.now();
  let lastMouse = { x: 0, y: 0 };
  let readyAt = Date.now() + 1200; // ignore noise di load awal

  try {
    const saved = parseInt(sessionStorage.getItem(STORAGE_IDLE) || "", 10);
    if (saved >= BASE_IDLE && saved < 120000) idleMs = saved;
  } catch (e) {}

  function currentPage() {
    let p = (location.pathname.split("/").pop() || "").toLowerCase();
    if (!p || p === "/") p = "index.html";
    return p;
  }

  function getVisited() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_VISITED) || "[]");
    } catch (e) {
      return [];
    }
  }
  function setVisited(arr) {
    try {
      sessionStorage.setItem(STORAGE_VISITED, JSON.stringify(arr.slice(-PAGES.length)));
    } catch (e) {}
  }
  function markVisited(page) {
    const v = getVisited().filter((x) => PAGES.indexOf(x) >= 0);
    if (v.indexOf(page) < 0) v.push(page);
    if (v.length >= PAGES.length) setVisited([page]);
    else setVisited(v);
  }

  function pickNextPage() {
    const cur = currentPage();
    const visited = getVisited();
    let pool = PAGES.filter((p) => p !== cur && visited.indexOf(p) < 0);
    if (!pool.length) pool = PAGES.filter((p) => p !== cur);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      sleep._t = t;
    });
  }

  function easeScroll(toY, duration) {
    return new Promise((resolve) => {
      const startY = window.scrollY || document.documentElement.scrollTop || 0;
      const diff = toY - startY;
      if (Math.abs(diff) < 2) return resolve();
      const t0 = performance.now();
      function frame(now) {
        if (abortTour) return resolve();
        const t = Math.min(1, (now - t0) / duration);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        window.scrollTo(0, startY + diff * e);
        if (t < 1) raf = requestAnimationFrame(frame);
        else resolve();
      }
      raf = requestAnimationFrame(frame);
    });
  }

  async function scrollTourOnPage() {
    const maxY = Math.max(
      0,
      (document.documentElement.scrollHeight || document.body.scrollHeight) - window.innerHeight
    );
    if (maxY < 48) {
      await sleep(1000 + Math.random() * 800);
      return;
    }
    let y = window.scrollY || 0;
    while (y < maxY - 10 && !abortTour) {
      y = Math.min(maxY, y + 160 + Math.random() * 280);
      await easeScroll(y, 800 + Math.random() * 1000);
      await sleep(180 + Math.random() * 350);
    }
    if (abortTour) return;
    if (Math.random() < 0.6) {
      await easeScroll(maxY * (0.2 + Math.random() * 0.35), 1200 + Math.random() * 1000);
      await sleep(250);
      if (!abortTour && Math.random() < 0.45) await easeScroll(0, 1400 + Math.random() * 900);
    } else {
      await sleep(500 + Math.random() * 700);
    }
  }

  async function runTour() {
    if (tourActive) return;
    if (SKIP[currentPage()]) return;
    tourActive = true;
    abortTour = false;
    document.documentElement.classList.add("sh-tour-active");
    try {
      markVisited(currentPage());
      await scrollTourOnPage();
      if (abortTour) return;
      const next = pickNextPage();
      if (next) {
        markVisited(next);
        try {
          sessionStorage.setItem("sh_tour_continue", "1");
        } catch (e) {}
        location.assign(next);
        return;
      }
    } catch (e) {
      console.warn("tour", e);
    } finally {
      tourActive = false;
      document.documentElement.classList.remove("sh-tour-active");
      if (!abortTour) scheduleIdle();
    }
  }

  function clearIdle() {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  function scheduleIdle() {
    clearIdle();
    if (SKIP[currentPage()]) return;
    let wait = idleMs;
    try {
      if (sessionStorage.getItem("sh_tour_continue") === "1") {
        sessionStorage.removeItem("sh_tour_continue");
        wait = 700;
      }
    } catch (e) {}
    idleTimer = setTimeout(() => {
      if (Date.now() < readyAt) {
        scheduleIdle();
        return;
      }
      if (Date.now() - lastActivity < wait - 100) {
        scheduleIdle();
        return;
      }
      runTour();
    }, wait);
  }

  function bumpIdleAfterInterrupt() {
    idleMs = Math.min(idleMs + IDLE_STEP, 60000);
    try {
      sessionStorage.setItem(STORAGE_IDLE, String(idleMs));
      sessionStorage.removeItem("sh_tour_continue");
    } catch (e) {}
  }

  function onUserActivity(kind, ev) {
    if (Date.now() < readyAt && kind === "move") return;
    if (kind === "move" && ev) {
      const x = ev.clientX || 0;
      const y = ev.clientY || 0;
      const dx = Math.abs(x - lastMouse.x);
      const dy = Math.abs(y - lastMouse.y);
      lastMouse = { x, y };
      if (dx < 10 && dy < 10) return;
    }
    lastActivity = Date.now();
    if (tourActive) {
      abortTour = true;
      if (raf) cancelAnimationFrame(raf);
      if (sleep._t) clearTimeout(sleep._t);
      document.documentElement.classList.remove("sh-tour-active");
      tourActive = false;
      bumpIdleAfterInterrupt();
    }
    clearIdle();
    scheduleIdle();
  }

  const opts = { capture: true, passive: true };
  window.addEventListener("mousemove", (e) => onUserActivity("move", e), opts);
  window.addEventListener("pointermove", (e) => onUserActivity("move", e), opts);
  window.addEventListener("mousedown", () => onUserActivity("click"), opts);
  window.addEventListener("click", () => onUserActivity("click"), opts);
  window.addEventListener("wheel", () => onUserActivity("wheel"), opts);
  window.addEventListener("touchstart", () => onUserActivity("touch"), opts);
  window.addEventListener("keydown", () => onUserActivity("key"), opts);

  function boot() {
    if (SKIP[currentPage()]) return;
    markVisited(currentPage());
    readyAt = Date.now() + 1000;
    scheduleIdle();
    // debug helper
    try {
      window.SHTour = {
        start: () => runTour(),
        idleMs: () => idleMs,
        status: () => ({ idleMs, tourActive, page: currentPage() }),
      };
    } catch (e) {}
  }

  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot);
})();
