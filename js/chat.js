(() => {
  const $ = (s) => document.querySelector(s);
  const log = $("#chatLog");
  const room = $("#chatRoom");
  const status = $("#chatStatus");
  const typingLine = $("#typingLine");
  const searchInput = $("#chatSearch");
  const avatarPicker = $("#chatAvatarPicker");
  const nameInput = $("#chatName");
  const chatInput = $("#chatInput");
  const chatForm = $("#chatForm");
  const fileInput = $("#chatFile");
  let unsub = null;
  let typingCtl = null;
  let typingTimer = null;
  let allMessages = [];
  let selectedAvatar = "💬";
  let loginDisplayName = "";
  let myUserId = null;
  let iAmStaff = false;
  let iAmAdmin = false;
  let uploading = false;
  let mediaRecorder = null;
  let mediaChunks = [];
  let mediaStream = null;
  let voiceTimer = null;
  let voiceStartedAt = 0;
  let voiceAudioCtx = null;
  let voiceAnalyser = null;
  let voiceMeterRaf = 0;
  let voiceSourceNode = null;
  let replyToId = null;
  let replyToMeta = null; // { author_name, body, depth }


  const AVATARS = ["🎓", "💬", "🌟", "🦋", "🌸", "🚀", "💜", "🌙", "🔥", "✨", "🦊", "🍀"];
  const LS_NAME = "sh_chat_name";
  const LS_AV = "sh_chat_avatar";
  const staffByUser = Object.create(null);
  /** max long-edge px after compress */
  const IMG_MAX_EDGE = 960;
  const IMG_JPEG_Q = 0.72;
  let audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    return audioCtx;
  }

  /** Soft chime for new incoming message */
  function playNotifSound() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") ctx.resume();
      const t0 = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(880, t0);
      o.frequency.exponentialRampToValueAtTime(660, t0 + 0.12);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.3);
    } catch (e) {}
  }

  /** Distinct higher/double beep when someone replies to your message */
  function playReplyToMeSound() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") ctx.resume();
      const t0 = ctx.currentTime;
      [0, 0.12].forEach((off, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(i === 0 ? 1046 : 1318, t0 + off);
        g.gain.setValueAtTime(0.0001, t0 + off);
        g.gain.exponentialRampToValueAtTime(0.14, t0 + off + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.18);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t0 + off);
        o.stop(t0 + off + 0.2);
      });
    } catch (e) {}
  }

  function autoResizeInput() {
    if (!chatInput || chatInput.tagName !== "TEXTAREA") return;
    chatInput.style.height = "auto";
    const maxH = (parseFloat(getComputedStyle(chatInput).lineHeight) || 20) * 4 + 16;
    const h = Math.min(chatInput.scrollHeight, maxH);
    chatInput.style.height = h + "px";
    chatInput.style.overflowY = chatInput.scrollHeight > maxH ? "auto" : "hidden";
  }

  function esc(t) {
    return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }


  const VOICE_PREFIX = "__voice__";
  // __voice__|ttl=3h|url  ATAU  __voice__|ttl=3h|dur=12.5|url
  const VOICE_RE = /^__voice__\|ttl=(3h|24h|forever)(?:\|dur=([\d.]+))?\|(.+)$/i;

  function parseVoiceBody(body) {
    const s = String(body || "").trim();
    const m = s.match(VOICE_RE);
    if (!m) return null;
    const dur = m[2] != null && m[2] !== "" ? parseFloat(m[2]) : NaN;
    return {
      ttl: m[1].toLowerCase(),
      duration: isFinite(dur) ? dur : null,
      url: m[3],
    };
  }

  function fmtVoiceClock(sec) {
    if (!isFinite(sec) || sec < 0) return "--:--";
    sec = Math.floor(sec);
    const mm = Math.floor(sec / 60);
    const ss = sec % 60;
    return String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
  }

  function isVoiceMessage(m) {
    return !!(m && parseVoiceBody(m.body));
  }

  function voiceTtlMs(ttl) {
    if (ttl === "forever") return Infinity;
    if (ttl === "24h") return 24 * 3600 * 1000;
    return 3 * 3600 * 1000; // 3h default
  }

  function isVoiceExpired(m) {
    const v = parseVoiceBody(m && m.body);
    if (!v) return false;
    if (v.ttl === "forever") return false;
    const t = m.created_at ? Date.parse(m.created_at) : 0;
    if (!t) return false;
    return Date.now() - t > voiceTtlMs(v.ttl);
  }

  function voiceRetentionLabel(ttl) {
    if (ttl === "forever") return "permanen (admin)";
    if (ttl === "24h") return "24 jam (guru)";
    return "3 jam";
  }

  function myVoiceTtl() {
    if (iAmAdmin) return "forever";
    if (iAmStaff) return "24h";
    return "3h";
  }

  function encodeVoiceBody(url, ttl, durationSec) {
    let s = VOICE_PREFIX + "|ttl=" + (ttl || "3h");
    if (durationSec != null && isFinite(durationSec) && durationSec > 0) {
      s += "|dur=" + (Math.round(durationSec * 10) / 10);
    }
    s += "|" + String(url || "").trim();
    return s;
  }

  function plainTextFromMessage(m) {
    const v = parseVoiceBody(m && m.body);
    if (v) return "Pesan suara";
    return String((m && m.body) || "");
  }

  function messageSnippet(mOrBody, maxLen) {
    maxLen = maxLen || 80;
    let body = mOrBody;
    if (mOrBody && typeof mOrBody === "object") body = mOrBody.body;
    body = String(body || "");
    // jangan pernah bocorkan payload mentah ke UI
    if (/__voice__/i.test(body)) {
      const v = parseVoiceBody(body.trim());
      const d = v && v.duration != null ? " (" + fmtVoiceClock(v.duration) + ")" : "";
      return "🎤 Pesan suara" + d;
    }
    const tx = body.replace(/\s+/g, " ").trim();
    if (tx.length <= maxLen) return tx;
    return tx.slice(0, maxLen) + "…";
  }

  function isImageUrl(u) {
    const s = String(u || "");
    if (/\/chat-images\//i.test(s)) return true;
    if (/\/storage\/v1\/object\/public\/[^/]+\/.+\.(jpe?g|png|webp|gif)(\?|$)/i.test(s)) return true;
    if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(s)) return true;
    return false;
  }

  function isVideoPlatformUrl(u) {
    const s = String(u || "");
    return /(youtube\.com|youtu\.be|dailymotion\.com|dai\.ly|tiktok\.com|instagram\.com|facebook\.com|fb\.watch|twitter\.com|x\.com)\//i.test(s);
  }

  function linkifyAndMedia(escapedText, q) {
    // Work on escaped text: find URL-like tokens and replace with rich media or links
    const re =
      /(https?:\/\/[^\s<&]+|www\.[^\s<&]+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<&]*)?)/gi;
    return String(escapedText || "").replace(re, (match) => {
      let href = match;
      if (!/^https?:\/\//i.test(href)) href = "https://" + href;
      if (/^(javascript|data|vbscript):/i.test(href)) return match;
      const safeHref = href.replace(/"/g, "&quot;");
      if (isImageUrl(href)) {
        return (
          '<a class="chat-img-wrap" href="' +
          safeHref +
          '" target="_blank" rel="noopener noreferrer">' +
          '<img class="chat-img" src="' +
          safeHref +
          '" alt="gambar chat" loading="lazy" />' +
          "</a>"
        );
      }
      if (isVideoPlatformUrl(href)) {
        let thumb = "";
        try {
          if (window.GalleryDB && GalleryDB.videoThumbnailHint) thumb = GalleryDB.videoThumbnailHint(href) || "";
        } catch (e) {}
        const thumbAttr = thumb ? ' data-thumb="' + thumb.replace(/"/g, "&quot;") + '"' : "";
        return (
          '<a class="chat-vid-card" href="' +
          safeHref +
          '" target="_blank" rel="noopener noreferrer" data-vid-url="' +
          safeHref +
          '"' +
          thumbAttr +
          ">" +
          (thumb
            ? '<img class="chat-vid-thumb" src="' + thumb.replace(/"/g, "&quot;") + '" alt="" loading="lazy" />'
            : '<span class="chat-vid-ph">▶</span>') +
          '<span class="chat-vid-meta"><span class="chat-vid-title">Video</span><span class="chat-vid-url">' +
          match +
          "</span></span></a>"
        );
      }
      return (
        '<a class="chat-link" href="' +
        safeHref +
        '" target="_blank" rel="noopener noreferrer">' +
        match +
        "</a>"
      );
    });
  }

  function highlight(escapedText, q) {
    if (!q) return escapedText;
    const needle = esc(q);
    if (!needle) return escapedText;
    try {
      const re = new RegExp("(" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      return escapedText.replace(re, '<mark class="chat-hit">$1</mark>');
    } catch (e) {
      return escapedText;
    }
  }

  function getSearchQ() {
    return (searchInput && searchInput.value ? searchInput.value : "").trim();
  }

  function msgMatches(m, q) {
    if (!q) return true;
    const hay = ((m.author_name || "") + " " + (m.body || "")).toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function canShowActions(m) {
    const ownerId = m.user_id ? String(m.user_id) : "";
    if (myUserId && ownerId && ownerId === myUserId) return true;
    // pemilik by nama (login display / tautan) — termasuk balasan sendiri
    const myNames = [];
    if (loginDisplayName) myNames.push(String(loginDisplayName).toLowerCase());
    try {
      const n = resolveAuthorName && resolveAuthorName();
      if (n) myNames.push(String(n).toLowerCase());
    } catch (e) {}
    const an = String((m && m.author_name) || "").toLowerCase();
    if (an && myNames.some(function (x) { return x && x === an; })) return true;
    if (!myUserId) return false;
    if (!iAmStaff) return false;
    if (ownerId && staffByUser[ownerId] === true) return false;
    return true;
  }

  function editCountOf(m) {
    if (!m) return 0;
    if (m.edit_count != null && m.edit_count !== "") return Number(m.edit_count) || 0;
    if (Array.isArray(m.edit_history)) return m.edit_history.length;
    return 0;
  }

  function canEditMessage(m) {
    if (!canShowActions(m)) return false;
    if (isVoiceMessage(m)) return false; // suara: hanya hapus
    if (editCountOf(m) >= 3) return false;
    return true;
  }

  function enrichVideoCards(root) {
    if (!root || !window.GalleryDB || !GalleryDB.fetchVideoMeta) return;
    root.querySelectorAll("a.chat-vid-card[data-vid-url]").forEach(async (a) => {
      if (a.dataset.enriched) return;
      a.dataset.enriched = "1";
      const url = a.getAttribute("data-vid-url");
      try {
        const meta = await GalleryDB.fetchVideoMeta(url);
        if (!meta) return;
        const titleEl = a.querySelector(".chat-vid-title");
        if (titleEl && meta.title) titleEl.textContent = meta.title;
        if (meta.thumbnail) {
          let img = a.querySelector(".chat-vid-thumb");
          if (!img) {
            const ph = a.querySelector(".chat-vid-ph");
            img = document.createElement("img");
            img.className = "chat-vid-thumb";
            img.loading = "lazy";
            img.alt = "";
            if (ph) ph.replaceWith(img);
            else a.insertBefore(img, a.firstChild);
          }
          img.src = meta.thumbnail;
        }
      } catch (e) {}
    });
  }


  function msgById(id) {
    return allMessages.find((m) => m.id === id) || null;
  }

  function depthOf(m, map) {
    let d = 0;
    let cur = m && m.reply_to ? String(m.reply_to) : "";
    const seen = Object.create(null);
    while (cur && d < 5) {
      if (seen[cur]) break;
      seen[cur] = true;
      d += 1;
      const p = map[cur] || msgById(cur);
      cur = p && p.reply_to ? String(p.reply_to) : "";
    }
    return d;
  }

  function canReplyTo(m) {
    if (!m || !m.id) return false;
    const map = Object.create(null);
    allMessages.forEach((x) => { if (x.id) map[x.id] = x; });
    return depthOf(m, map) < 2; // levels 0,1,2 only
  }

  function setReplyTarget(m) {
    if (!m || !canReplyTo(m)) {
      if (m && !canReplyTo(m)) status.textContent = "Balasan maksimal 3 level";
      return;
    }
    replyToId = m.id;
    replyToMeta = { author_name: m.author_name, body: m.body };
    const bar = $("#chatReplyBar");
    const lab = $("#chatReplyLabel");
    if (bar) bar.hidden = false;
    if (lab) {
      lab.textContent = "Membalas " + (m.author_name || "Anonim") + ": " + messageSnippet(m, 60);
    }
    if (chatInput) chatInput.focus();
  }

  function clearReplyTarget() {
    replyToId = null;
    replyToMeta = null;
    const bar = $("#chatReplyBar");
    if (bar) bar.hidden = true;
  }

  function orderedForDisplay(list) {
    // Hierarki: balasan tampil di bawah induk (DFS), saudara urut waktu
    const map = Object.create(null);
    (list || []).forEach(function (m) {
      if (m && m.id) map[String(m.id)] = m;
    });
    const children = Object.create(null);
    const roots = [];
    (list || []).forEach(function (m) {
      if (!m) return;
      const pid = m.reply_to ? String(m.reply_to) : "";
      if (pid && map[pid]) {
        if (!children[pid]) children[pid] = [];
        children[pid].push(m);
      } else {
        roots.push(m);
      }
    });
    function byTime(a, b) {
      const ta = a.created_at ? Date.parse(a.created_at) : 0;
      const tb = b.created_at ? Date.parse(b.created_at) : 0;
      return ta - tb;
    }
    roots.sort(byTime);
    Object.keys(children).forEach(function (k) {
      children[k].sort(byTime);
    });
    const out = [];
    function walk(m) {
      out.push(m);
      const kids = children[String(m.id)];
      if (kids) kids.forEach(walk);
    }
    roots.forEach(walk);
    return out;
  }

  function purgeExpiredVoiceLocal() {
    const expired = allMessages.filter((m) => isVoiceExpired(m));
    if (!expired.length) return;
    allMessages = allMessages.filter((m) => !isVoiceExpired(m));
    // best-effort hapus di server (hanya yang boleh)
    expired.forEach((m) => {
      if (!m || !m.id || !window.GalleryDB || !GalleryDB.deleteChat) return;
      GalleryDB.deleteChat({ id: m.id }).catch(function () {});
    });
  }

  function renderMessages() {
    if (!log) return;
    purgeExpiredVoiceLocal();
    const q = getSearchQ();
    log.innerHTML = "";
    const base = (q ? allMessages.filter((m) => msgMatches(m, q)) : allMessages).filter(
      (m) => !isVoiceExpired(m)
    );
    const filtered = orderedForDisplay(base);
    const map = Object.create(null);
    allMessages.forEach((x) => { if (x.id) map[x.id] = x; });
    filtered.forEach((m) => appendBubble(m, q, depthOf(m, map)));
    log.scrollTop = log.scrollHeight;
    enrichVideoCards(log);
    if (status && window.GalleryDB && GalleryDB.enabled()) {
      if (q) {
        status.textContent =
          filtered.length + " dari " + allMessages.length + ' pesan cocok · "' + q + '"';
      }
    }
  }

  function applyTextClamp(textEl) {
    if (!textEl) return;
    textEl.classList.remove("is-clamped", "is-expanded");
    const prevMore = textEl.parentElement && textEl.parentElement.querySelector(".chat-text-more");
    if (prevMore) prevMore.remove();
    requestAnimationFrame(() => {
      const lineH = parseFloat(getComputedStyle(textEl).lineHeight) || 18;
      const max4 = lineH * 4 + 2;
      if (textEl.scrollHeight > max4 + 4) {
        textEl.classList.add("is-clamped");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chat-text-more";
        btn.textContent = "Baca selengkapnya";
        btn.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (textEl.classList.contains("is-expanded")) {
            textEl.classList.remove("is-expanded");
            textEl.classList.add("is-clamped");
            btn.textContent = "Baca selengkapnya";
          } else {
            textEl.classList.remove("is-clamped");
            textEl.classList.add("is-expanded");
            btn.textContent = "Tutup";
          }
        });
        textEl.insertAdjacentElement("afterend", btn);
      }
    });
  }

  function appendBubble(m, q, depth) {
    const div = document.createElement("div");
    div.className = "chat-bubble" + (depth ? " chat-depth-" + Math.min(depth, 2) : "");
    div.dataset.id = m.id || "";
    if (m.reply_to) div.dataset.replyTo = m.reply_to;
    const t = m.created_at ? new Date(m.created_at).toLocaleString("id-ID") : "";
    const ec = editCountOf(m);
    const edited =
      ec > 0 || (m.updated_at && m.created_at && String(m.updated_at) !== String(m.created_at))
        ? ' <button type="button" class="chat-edited-btn" data-act="hist" title="Lihat histori edit">(diedit' +
          (ec ? " " + ec + "×" : "") +
          ")</button>"
        : "";
    const av = m.avatar_emoji || "💬";
    const voice = parseVoiceBody(m.body);
    let bodyHtml = "";
    if (voice) {
      const knownDur = voice.duration != null ? voice.duration : null;
      const durLabel = knownDur != null ? fmtVoiceClock(knownDur) : "--:--";
      bodyHtml =
        '<div class="chat-voice-msg">' +
        '<div class="chat-voice-player"' +
        (knownDur != null ? ' data-duration="' + knownDur + '"' : "") +
        ">" +
        '<button type="button" class="chat-voice-play" data-voice-play title="Putar/jeda">▶</button>' +
        '<span class="chat-voice-time" data-voice-time>00:00 / ' +
        durLabel +
        "</span>" +
        '<audio class="chat-voice-audio" preload="metadata" src="' +
        esc(voice.url).replace(/"/g, "&quot;") +
        '"></audio>' +
        "</div>" +
        '<small class="chat-voice-ttl">Pesan suara · hapus otomatis: ' +
        esc(voiceRetentionLabel(voice.ttl)) +
        "</small></div>";
    } else {
      const bodyEsc = esc(m.body);
      bodyHtml = linkifyAndMedia(highlight(bodyEsc, q || ""), q);
    }
    let parentHtml = "";
    if (m.reply_to) {
      const parent = msgById(m.reply_to);
      if (parent) {
        let snip = messageSnippet(parent, 80);
        if (/__voice__/i.test(snip)) snip = "🎤 Pesan suara";
        parentHtml =
          '<div class="chat-reply-ref">↩ ' +
          esc(parent.author_name || "Anonim") +
          ": " +
          esc(snip) +
          "</div>";
      } else {
        parentHtml = '<div class="chat-reply-ref">↩ balasan</div>';
      }
    }
    let actions = '<div class="chat-actions">';
    if (canReplyTo(m)) {
      actions +=
        '<button type="button" class="chat-act chat-act-reply" data-act="reply" title="Balas">Balas</button>';
    }
    if (canShowActions(m)) {
      if (canEditMessage(m)) {
        actions +=
          '<button type="button" class="chat-act chat-act-edit" data-act="edit" title="Ubah">Ubah</button>';
      }
      actions +=
        '<button type="button" class="chat-act chat-act-del" data-act="del" title="Hapus">Hapus</button>';
    }
    // Histori bisa dilihat SEMUA orang (termasuk penerima balasan)
    if (editCountOf(m) > 0 || (m.edit_history && m.edit_history.length)) {
      actions +=
        '<button type="button" class="chat-act chat-act-hist" data-act="hist" title="Lihat versi sebelumnya">Histori (' +
        editCountOf(m) +
        ")</button>";
    }
    actions += "</div>";
    if (!canReplyTo(m) && !canShowActions(m) && !(editCountOf(m) > 0 || (m.edit_history && m.edit_history.length))) {
      actions = "";
    }
    div.innerHTML =
      '<div class="chat-av">' +
      esc(av) +
      "</div>" +
      '<div class="chat-body"><strong>' +
      esc(m.author_name) +
      "</strong> <small>" +
      esc(t) +
      "</small>" +
      edited +
      parentHtml +
      '<div class="chat-text' + (voice ? " chat-text-voice" : "") + '">' +
      bodyHtml +
      "</div>" +
      actions +
      '<button type="button" class="chat-copy-btn" data-act="copy" title="Salin pesan" aria-label="Salin pesan">⧉</button>' +
      "</div>";
    log.appendChild(div);
    if (!voice) applyTextClamp(div.querySelector(".chat-text"));
    else wireVoicePlayer(div);
  }

    function wireVoicePlayer(root) {
    if (!root) return;
    root.querySelectorAll(".chat-voice-player").forEach(function (wrap) {
      if (wrap.dataset.wired) return;
      wrap.dataset.wired = "1";
      const audio = wrap.querySelector("audio");
      const btn = wrap.querySelector("[data-voice-play]");
      const timeEl = wrap.querySelector("[data-voice-time]");
      if (!audio || !btn || !timeEl) return;
      let known = parseFloat(wrap.getAttribute("data-duration") || "");
      if (!isFinite(known)) known = null;
      function totalDur() {
        if (known != null) return known;
        const d = audio.duration;
        if (isFinite(d) && d > 0 && d !== Infinity) return d;
        return null;
      }
      function renderTime() {
        const dur = totalDur();
        const cur = audio.currentTime || 0;
        timeEl.textContent = fmtVoiceClock(cur) + " / " + (dur != null ? fmtVoiceClock(dur) : "--:--");
      }
      audio.addEventListener("loadedmetadata", function () {
        const d = audio.duration;
        if (known == null && isFinite(d) && d > 0 && d !== Infinity) known = d;
        renderTime();
      });
      audio.addEventListener("durationchange", renderTime);
      audio.addEventListener("timeupdate", renderTime);
      audio.addEventListener("ended", function () {
        btn.textContent = "▶";
        renderTime();
      });
      btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (audio.paused) {
          if (log) {
            log.querySelectorAll("audio.chat-voice-audio").forEach(function (a) {
              if (a !== audio) {
                try { a.pause(); } catch (e) {}
              }
            });
            log.querySelectorAll("[data-voice-play]").forEach(function (b) {
              if (b !== btn) b.textContent = "▶";
            });
          }
          audio.play().then(function () {
            btn.textContent = "❚❚";
          }).catch(function () {
            btn.textContent = "▶";
          });
        } else {
          audio.pause();
          btn.textContent = "▶";
        }
      });
      if (known == null && audio.src) {
        fetch(audio.src, { mode: "cors" })
          .then(function (r) { return r.ok ? r.blob() : null; })
          .then(function (blob) {
            if (!blob) return;
            const obj = URL.createObjectURL(blob);
            const probe = new Audio();
            probe.preload = "metadata";
            probe.src = obj;
            probe.onloadedmetadata = function () {
              if (isFinite(probe.duration) && probe.duration > 0 && probe.duration !== Infinity) {
                known = probe.duration;
                wrap.setAttribute("data-duration", String(known));
                audio.src = obj;
                renderTime();
              }
            };
          })
          .catch(function () {});
      }
      try { audio.load(); } catch (e) {}
      renderTime();
    });
  }
  function upsertLocal(m) {
    const i = allMessages.findIndex((x) => x.id === m.id);
    if (i >= 0) allMessages[i] = Object.assign({}, allMessages[i], m);
    else allMessages.push(m);
  }

  function removeLocal(id) {
    allMessages = allMessages.filter((x) => x.id !== id);
  }

  function addMsg(m) {
    const isNew = !allMessages.some((x) => x.id === m.id);
    upsertLocal(m);
    const q = getSearchQ();
    if (msgMatches(m, q)) {
      const existing =
        log && m.id && log.querySelector('.chat-bubble[data-id="' + String(m.id).replace(/"/g, "") + '"]');
      if (existing) renderMessages();
      else {
        appendBubble(m, q);
        log.scrollTop = log.scrollHeight;
        enrichVideoCards(divLast());
      }
    }
    if (q && status) {
      const n = allMessages.filter((x) => msgMatches(x, q)).length;
      status.textContent = n + " dari " + allMessages.length + ' pesan cocok · "' + q + '"';
    }
    // Notification sound for incoming messages (not own)
    if (isNew && m && m.id) {
      const ownerId = m.user_id ? String(m.user_id) : "";
      const isMine = myUserId && ownerId && ownerId === myUserId;
      if (!isMine) {
        let isReplyToMe = false;
        if (m.reply_to) {
          const parent = msgById(m.reply_to);
          if (parent) {
            const pOwner = parent.user_id ? String(parent.user_id) : "";
            if (myUserId && pOwner && pOwner === myUserId) isReplyToMe = true;
            else if (!pOwner && parent.author_name && resolveAuthorName() &&
              String(parent.author_name).toLowerCase() === resolveAuthorName().toLowerCase()) {
              isReplyToMe = true;
            }
          }
        }
        if (isReplyToMe) playReplyToMeSound();
        else playNotifSound();
      }
    }
  }

  function divLast() {
    return log ? log.lastElementChild : null;
  }

  function onUpdateMsg(m) {
    upsertLocal(m);
    renderMessages();
  }

  function onDeleteMsg(oldRow) {
    if (!oldRow || !oldRow.id) return;
    removeLocal(oldRow.id);
    renderMessages();
  }

  function resolveAuthorName() {
    const typed = nameInput ? nameInput.value.trim() : "";
    if (typed) return typed;
    if (loginDisplayName) return loginDisplayName;
    return "Anonim";
  }

  function saveProfile() {
    if (nameInput) localStorage.setItem(LS_NAME, nameInput.value.trim());
    localStorage.setItem(LS_AV, selectedAvatar);
  }

  function setAvatar(emoji, opts) {
    selectedAvatar = emoji || "💬";
    if (avatarPicker) {
      avatarPicker.querySelectorAll(".chat-av-btn").forEach((btn) => {
        btn.classList.toggle("is-selected", btn.dataset.emoji === selectedAvatar);
      });
    }
    const cur = $("#chatAvatarCurrent");
    if (cur) cur.textContent = selectedAvatar;
    saveProfile();
    if (typingCtl) bindTyping();
    // auto-collapse after pick (unless silent)
    if (!opts || !opts.keepOpen) setAvatarExpanded(false);
  }

  function setAvatarExpanded(open) {
    const toggle = $("#chatAvatarToggle");
    if (!avatarPicker) return;
    if (open) {
      avatarPicker.hidden = false;
      avatarPicker.classList.remove("is-collapsed");
      if (toggle) toggle.setAttribute("aria-expanded", "true");
    } else {
      avatarPicker.hidden = true;
      avatarPicker.classList.add("is-collapsed");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    }
  }

  function buildAvatarPicker() {
    if (!avatarPicker) return;
    avatarPicker.innerHTML = "";
    AVATARS.forEach((em) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chat-av-btn" + (em === selectedAvatar ? " is-selected" : "");
      btn.dataset.emoji = em;
      btn.setAttribute("aria-label", "Avatar " + em);
      btn.textContent = em;
      btn.addEventListener("click", () => setAvatar(em));
      avatarPicker.appendChild(btn);
    });
    const cur = $("#chatAvatarCurrent");
    if (cur) cur.textContent = selectedAvatar;
    // default: folded
    setAvatarExpanded(false);
    const toggle = $("#chatAvatarToggle");
    if (toggle && !toggle.dataset.bound) {
      toggle.dataset.bound = "1";
      toggle.addEventListener("click", () => {
        const open = toggle.getAttribute("aria-expanded") === "true";
        setAvatarExpanded(!open);
      });
    }
  }

  /** Compress image via canvas → JPEG Blob */
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (!w || !h) {
          reject(new Error("Gambar tidak valid"));
          return;
        }
        const scale = Math.min(1, IMG_MAX_EDGE / Math.max(w, h));
        w = Math.round(w * scale);
        h = Math.round(h * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (!blob) reject(new Error("Gagal kompres gambar"));
            else resolve(blob);
          },
          "image/jpeg",
          IMG_JPEG_Q
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Gagal memuat gambar"));
      };
      img.src = url;
    });
  }

  async function sendImageFile(file) {
    if (!file || !String(file.type || "").startsWith("image/")) return;
    if (!GalleryDB.enabled()) {
      status.textContent = "Database belum dikonfigurasi.";
      return;
    }
    if (uploading) return;
    uploading = true;
    status.textContent = "Mengompres & mengunggah gambar…";
    try {
      const blob = await compressImage(file);
      const publicUrl = await GalleryDB.uploadChatImage(blob);
      if (!publicUrl) throw new Error("Upload gagal");
      const caption = (chatInput && chatInput.value.trim()) || "";
      const body = caption ? caption + "\n" + publicUrl : publicUrl;
      const row = await GalleryDB.sendChat({
        angkatanId: room.value || null,
        authorName: resolveAuthorName(),
        body,
        avatarEmoji: selectedAvatar,
        replyTo: replyToId,
      });
      if (chatInput) {
        chatInput.value = "";
        autoResizeInput();
      }
      clearReplyTarget();
      if (typingCtl) typingCtl.setTyping(false);
      if (row && row.id && !allMessages.some((m) => m.id === row.id)) addMsg(row);
      status.textContent = "Gambar terkirim (otomatis hapus ~24 jam)";
    } catch (e) {
      status.textContent = e.message || String(e);
    } finally {
      uploading = false;
    }
  }

  async function resolveSessionContext() {
    loginDisplayName = "";
    myUserId = null;
    iAmStaff = false;
    try {
      if (!window.GalleryDB || !GalleryDB.enabled()) return;
      const session = await GalleryDB.getSession();
      if (!session || !session.user) return;
      myUserId = session.user.id;
      const u = session.user;
      const meta = u.user_metadata || {};
      let name = "";
      try {
        const prof = await GalleryDB.getMyProfile();
        if (prof) {
          name =
            (prof.linked_student_name && String(prof.linked_student_name).trim()) ||
            (prof.display_name && String(prof.display_name).trim()) ||
            "";
          iAmAdmin = !!prof.is_admin;
          iAmStaff = !!(
            prof.is_admin ||
            /^(teacher|pengajar|guru)$/i.test(String(prof.role || ""))
          );
        }
      } catch (e) {}
      try {
        if (!iAmStaff && typeof GalleryDB.isCurrentUserStaff === "function") {
          iAmStaff = await GalleryDB.isCurrentUserStaff();
        }
      } catch (e) {}
      try {
        if (!iAmAdmin && typeof GalleryDB.isCurrentUserAdmin === "function") {
          iAmAdmin = await GalleryDB.isCurrentUserAdmin();
          if (iAmAdmin) iAmStaff = true;
        }
      } catch (e) {}
      if (!name) name = meta.full_name || meta.name || "";
      if (!name && u.email) name = String(u.email).split("@")[0];
      loginDisplayName = String(name || "").trim().slice(0, 40);
      if (nameInput && !nameInput.value.trim() && loginDisplayName) {
        nameInput.placeholder = loginDisplayName + " (dari akun login)";
      }
    } catch (e) {}
  }

  async function loadRooms() {
    room.innerHTML = '<option value="">Lintas angkatan (global)</option>';
    if (!GalleryDB.enabled()) {
      status.textContent = "Database belum dikonfigurasi.";
      return;
    }
    try {
      const list = await GalleryDB.listAngkatan();
      list.forEach((a) => {
        const opt = document.createElement("option");
        opt.value = a.id;
        opt.textContent = a.label;
        room.appendChild(opt);
      });
    } catch (e) {
      status.textContent = e.message || String(e);
    }
  }

  function bindTyping() {
    if (typingCtl) typingCtl.leave();
    const angkatanId = room.value || null;
    const roomKey = angkatanId || "global";
    typingCtl = GalleryDB.joinTypingChannel({
      roomKey,
      userName: resolveAuthorName(),
      avatarEmoji: selectedAvatar,
      onSync(people) {
        const me = resolveAuthorName().toLowerCase();
        const typing = people.filter((p) => p.typing && String(p.name || "").toLowerCase() !== me);
        if (!typing.length) {
          typingLine.textContent = "";
          return;
        }
        if (typing.length === 1) {
          typingLine.textContent = (typing[0].avatar || "") + " " + typing[0].name + " sedang mengetik…";
        } else {
          typingLine.textContent = typing.length + " orang sedang mengetik…";
        }
      },
    });
  }

  async function joinRoom() {
    if (unsub) unsub();
    allMessages = [];
    log.innerHTML = "";
    typingLine.textContent = "";
    if (searchInput) searchInput.value = "";
    if (!GalleryDB.enabled()) return;
    const angkatanId = room.value || null;
    status.textContent = "Memuat pesan...";
    try {
      const rows = await GalleryDB.listChat({ angkatanId, limit: 150 });
      allMessages = rows || [];
      renderMessages();
      status.textContent = angkatanId ? "Ruang angkatan" : "Ruang lintas angkatan · realtime aktif";
      unsub = GalleryDB.subscribeChat({
        angkatanId,
        onInsert: addMsg,
        onUpdate: onUpdateMsg,
        onDelete: onDeleteMsg,
      });
      bindTyping();
    } catch (e) {
      status.textContent = "Gagal: " + (e.message || e);
    }
  }

  const CHAT_BODY_MAX = 8000;

  function closeAllInlineComposers(exceptBubble) {
    if (!log) return;
    log.querySelectorAll(".chat-inline-composer").forEach((el) => {
      if (exceptBubble && exceptBubble.contains(el)) return;
      el.remove();
    });
    log.querySelectorAll(".chat-bubble.is-editing").forEach((b) => {
      if (exceptBubble && b === exceptBubble) return;
      b.classList.remove("is-editing");
      const te = b.querySelector(".chat-text");
      if (te) te.hidden = false;
      const more = b.querySelector(".chat-text-more");
      if (more) more.hidden = false;
    });
  }

  function autoResizeEl(ta, maxLines) {
    if (!ta) return;
    ta.style.height = "auto";
    const lineH = parseFloat(getComputedStyle(ta).lineHeight) || 20;
    const maxH = lineH * (maxLines || 4) + 12;
    const h = Math.min(ta.scrollHeight, maxH);
    ta.style.height = h + "px";
    ta.style.overflowY = ta.scrollHeight > maxH ? "auto" : "hidden";
  }

  async function handleEdit(msg, bubble) {
    if (!canEditMessage(msg)) {
      if (editCountOf(msg) >= 3) status.textContent = "Batas edit tercapai (maks. 3×)";
      return;
    }
    if (!bubble) bubble = log && log.querySelector('.chat-bubble[data-id="' + String(msg.id).replace(/"/g, "") + '"]');
    if (!bubble) return;
    closeAllInlineComposers(bubble);
    if (bubble.classList.contains("is-editing")) return;
    bubble.classList.add("is-editing");
    const textEl = bubble.querySelector(".chat-text");
    const moreBtn = bubble.querySelector(".chat-text-more");
    const actions = bubble.querySelector(".chat-actions");
    if (textEl) textEl.hidden = true;
    if (moreBtn) moreBtn.hidden = true;

    const left = 3 - editCountOf(msg);
    const wrap = document.createElement("div");
    wrap.className = "chat-inline-composer chat-inline-edit";
    wrap.innerHTML =
      '<textarea class="chat-inline-ta" maxlength="' + CHAT_BODY_MAX + '" rows="1"></textarea>' +
      '<div class="chat-inline-tools">' +
      '<label class="chat-inline-tool chat-inline-tool-btn" title="Gambar / screenshot"><input type="file" accept="image/*" class="chat-inline-file" hidden>🖼 Gambar</label>' +
      '<button type="button" class="chat-inline-tool chat-inline-tool-btn chat-inline-voice" title="Ganti dengan pesan suara">🎤 Suara</button>' +
      '<span class="muted chat-inline-hint">Sisa edit: ' + left + "× · tempel (Ctrl+V)</span>" +
      "</div>" +
      '<div class="chat-voice-bar chat-inline-voice-bar" hidden>' +
      '<span class="chat-voice-dot"></span><span class="chat-inline-voice-timer">00:00</span>' +
      '<button type="button" class="chat-act chat-inline-voice-send">Simpan sebagai suara</button>' +
      '<button type="button" class="chat-act chat-inline-voice-cancel">Batal rekam</button>' +
      "</div>" +
      '<div class="chat-inline-actions">' +
      '<button type="button" class="btn btn-primary chat-inline-save">Simpan teks</button>' +
      '<button type="button" class="chat-act chat-inline-cancel">Batal</button>' +
      "</div>";
    const ta = wrap.querySelector(".chat-inline-ta");
    ta.value = String(msg.body || "");
    if (actions) actions.insertAdjacentElement("beforebegin", wrap);
    else bubble.querySelector(".chat-body").appendChild(wrap);
    autoResizeEl(ta, 8);
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);

    async function attachImageFile(file) {
      if (!file || !/^image\//.test(file.type)) return;
      if (!GalleryDB.uploadChatImage) {
        status.textContent = "Upload gambar belum tersedia";
        return;
      }
      status.textContent = "Mengunggah gambar…";
      try {
        const url = await GalleryDB.uploadChatImage(file);
        if (!url) throw new Error("Upload gagal");
        const cur = String(ta.value || "").trim();
        ta.value = cur ? cur + "\n" + url : url;
        autoResizeEl(ta, 8);
        status.textContent = "Gambar ditambahkan";
      } catch (e) {
        status.textContent = e.message || String(e);
      }
    }
    wrap.querySelector(".chat-inline-file").addEventListener("change", function (ev) {
      const f = ev.target.files && ev.target.files[0];
      if (f) attachImageFile(f);
      ev.target.value = "";
    });
    ta.addEventListener("paste", function (ev) {
      const items = ev.clipboardData && ev.clipboardData.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf("image") === 0) {
          const f = items[i].getAsFile();
          if (f) {
            ev.preventDefault();
            attachImageFile(f);
          }
          break;
        }
      }
    });
    ta.addEventListener("input", function () { autoResizeEl(ta, 8); });
    // Rekam suara saat edit (mengganti isi pesan)
    (function bindEditVoice() {
      let localRec = null, localChunks = [], localStream = null, localTimer = null, localStarted = 0;
      const voiceBar = wrap.querySelector(".chat-inline-voice-bar");
      const voiceTimerEl = wrap.querySelector(".chat-inline-voice-timer");
      const voiceBtn = wrap.querySelector(".chat-inline-voice");
      if (!voiceBtn) return;
      function stopRec(send) {
        return new Promise(function (resolve) {
          if (!localRec) { resolve(null); return; }
          const rec = localRec;
          const type = rec.mimeType || "audio/webm";
          rec.onstop = function () {
            const blob = localChunks.length ? new Blob(localChunks, { type: type }) : null;
            localChunks = []; localRec = null;
            if (localStream) { try { localStream.getTracks().forEach(function (tr) { tr.stop(); }); } catch (e) {} localStream = null; }
            if (localTimer) clearInterval(localTimer); localTimer = null;
            if (voiceBar) voiceBar.hidden = true;
            resolve(send ? blob : null);
          };
          try { if (rec.state !== "inactive") rec.stop(); else rec.onstop(); } catch (e) { resolve(null); }
        });
      }
      async function startRec() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          status.textContent = "Browser tidak mendukung rekaman"; return;
        }
        try {
          localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
        } catch (e) { status.textContent = "Izin mikrofon ditolak"; return; }
        localChunks = [];
        let mime = "";
        ["audio/webm;codecs=opus", "audio/webm"].forEach(function (c) {
          if (!mime && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) mime = c;
        });
        try { localRec = mime ? new MediaRecorder(localStream, { mimeType: mime }) : new MediaRecorder(localStream); }
        catch (e) { status.textContent = "Gagal mulai rekaman"; return; }
        localRec.ondataavailable = function (ev) { if (ev.data && ev.data.size) localChunks.push(ev.data); };
        localRec.start(250);
        localStarted = Date.now();
        if (voiceBar) voiceBar.hidden = false;
        if (voiceTimerEl) voiceTimerEl.textContent = "00:00";
        if (localTimer) clearInterval(localTimer);
        localTimer = setInterval(function () {
          const s = Math.floor((Date.now() - localStarted) / 1000);
          if (voiceTimerEl) voiceTimerEl.textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
          if (s >= 180) wrap.querySelector(".chat-inline-voice-send").click();
        }, 250);
        status.textContent = "Merekam… (akan mengganti isi pesan)";
      }
      voiceBtn.addEventListener("click", function () {
        if (localRec && localRec.state === "recording") stopRec(false); else startRec();
      });
      wrap.querySelector(".chat-inline-voice-cancel").addEventListener("click", function () {
        stopRec(false); status.textContent = "Rekaman dibatalkan";
      });
      wrap.querySelector(".chat-inline-voice-send").addEventListener("click", async function () {
        const elapsed = localStarted ? Date.now() - localStarted : 0;
        const blob = await stopRec(true);
        if (!blob || blob.size < 800) { status.textContent = "Rekaman terlalu pendek"; return; }
        if (!GalleryDB.uploadChatAudio) { status.textContent = "Upload suara belum tersedia"; return; }
        status.textContent = "Mengunggah suara…";
        try {
          const url = await GalleryDB.uploadChatAudio(blob);
          const body = encodeVoiceBody(url, myVoiceTtl(), elapsed > 300 ? elapsed / 1000 : null);
          const updated = await GalleryDB.updateChat({ id: msg.id, body: body });
          upsertLocal(updated);
          renderMessages();
          status.textContent = "Diganti pesan suara (" + editCountOf(updated) + "/3 edit)";
        } catch (e) { status.textContent = e.message || String(e); }
      });
      const cancelBtn = wrap.querySelector(".chat-inline-cancel");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", function () { stopRec(false); }, true);
      }
    })();

    wrap.querySelector(".chat-inline-cancel").addEventListener("click", () => {
      wrap.remove();
      bubble.classList.remove("is-editing");
      if (textEl) textEl.hidden = false;
      if (moreBtn) moreBtn.hidden = false;
    });
    wrap.querySelector(".chat-inline-save").addEventListener("click", async () => {
      const text = String(ta.value || "").trim();
      if (!text) {
        status.textContent = "Pesan tidak boleh kosong";
        return;
      }
      if (text === String(msg.body || "")) {
        wrap.remove();
        bubble.classList.remove("is-editing");
        if (textEl) textEl.hidden = false;
        if (moreBtn) moreBtn.hidden = false;
        return;
      }
      status.textContent = "Menyimpan…";
      try {
        const updated = await GalleryDB.updateChat({ id: msg.id, body: text.slice(0, CHAT_BODY_MAX) });
        upsertLocal(updated);
        renderMessages();
        status.textContent = "Pesan diperbarui (" + editCountOf(updated) + "/3 edit)";
      } catch (e) {
        status.textContent = e.message || String(e);
      }
    });
  }

  async function handleDelete(msg) {
    if (!window.confirm("Hapus pesan ini?")) return;
    status.textContent = "Menghapus…";
    try {
      await GalleryDB.deleteChat({ id: msg.id });
      removeLocal(msg.id);
      renderMessages();
      status.textContent = "Pesan dihapus";
    } catch (e) {
      status.textContent = e.message || String(e);
    }
  }

  function openInlineReply(msg, bubble) {
    if (!bubble) return;
    if (!canReplyTo(msg)) {
      status.textContent = "Balasan maksimal 3 level";
      return;
    }
    closeAllInlineComposers(bubble);
    // remove existing reply composer on this bubble
    const existing = bubble.querySelector(".chat-inline-reply");
    if (existing) existing.remove();

    replyToId = msg.id;
    replyToMeta = { author_name: msg.author_name, body: msg.body };

    const wrap = document.createElement("div");
    wrap.className = "chat-inline-composer chat-inline-reply";
    wrap.innerHTML =
      '<textarea class="chat-inline-ta" maxlength="' + CHAT_BODY_MAX + '" rows="1" placeholder="Tulis balasan… (bisa tempel screenshot)"></textarea>' +
      '<div class="chat-inline-tools">' +
      '<label class="chat-inline-tool chat-inline-tool-btn" title="Gambar / screenshot"><input type="file" accept="image/*" class="chat-inline-file" hidden>🖼 Gambar</label>' +
      '<button type="button" class="chat-inline-tool chat-inline-tool-btn chat-inline-voice" title="Pesan suara">🎤 Suara</button>' +
      '<span class="muted chat-inline-hint">atau tempel screenshot (Ctrl+V)</span>' +
      "</div>" +
      '<div class="chat-voice-bar chat-inline-voice-bar" hidden>' +
      '<span class="chat-voice-dot"></span><span class="chat-inline-voice-timer">00:00</span>' +
      '<button type="button" class="chat-act chat-inline-voice-send">Kirim suara</button>' +
      '<button type="button" class="chat-act chat-inline-voice-cancel">Batal rekam</button>' +
      "</div>" +
      '<div class="chat-inline-actions">' +
      '<button type="button" class="btn btn-primary chat-inline-send">Kirim teks</button>' +
      '<button type="button" class="chat-act chat-inline-cancel">Batal</button>' +
      "</div>";
    const actions = bubble.querySelector(".chat-actions");
    if (actions) actions.insertAdjacentElement("afterend", wrap);
    else bubble.querySelector(".chat-body").appendChild(wrap);
    const ta = wrap.querySelector(".chat-inline-ta");
    autoResizeEl(ta, 4);
    ta.focus();

    async function attachImageFile(file) {
      if (!file || !/^image\//.test(file.type)) return;
      if (!GalleryDB.uploadChatImage) {
        status.textContent = "Upload gambar belum tersedia";
        return;
      }
      status.textContent = "Mengunggah gambar…";
      try {
        const url = await GalleryDB.uploadChatImage(file);
        if (!url) throw new Error("Upload gagal");
        const cur = String(ta.value || "").trim();
        ta.value = cur ? cur + "\n" + url : url;
        autoResizeEl(ta, 4);
        status.textContent = "Gambar ditambahkan";
      } catch (e) {
        status.textContent = e.message || String(e);
      }
    }
    wrap.querySelector(".chat-inline-file").addEventListener("change", function (ev) {
      const f = ev.target.files && ev.target.files[0];
      if (f) attachImageFile(f);
      ev.target.value = "";
    });
    ta.addEventListener("paste", function (ev) {
      const items = ev.clipboardData && ev.clipboardData.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf("image") === 0) {
          const f = items[i].getAsFile();
          if (f) {
            ev.preventDefault();
            attachImageFile(f);
          }
          break;
        }
      }
    });

    // Voice for reply (reuse global recorder helpers if available)
    let localRec = null;
    let localChunks = [];
    let localStream = null;
    let localTimer = null;
    let localStarted = 0;
    const voiceBar = wrap.querySelector(".chat-inline-voice-bar");
    const voiceTimerEl = wrap.querySelector(".chat-inline-voice-timer");
    function stopLocalRec(send) {
      return new Promise(function (resolve) {
        if (!localRec) {
          resolve(null);
          return;
        }
        const rec = localRec;
        const type = rec.mimeType || "audio/webm";
        rec.onstop = function () {
          const blob = localChunks.length ? new Blob(localChunks, { type: type }) : null;
          localChunks = [];
          localRec = null;
          if (localStream) {
            try { localStream.getTracks().forEach(function (tr) { tr.stop(); }); } catch (e) {}
            localStream = null;
          }
          if (localTimer) clearInterval(localTimer);
          localTimer = null;
          if (voiceBar) voiceBar.hidden = true;
          resolve(send ? blob : null);
        };
        try {
          if (rec.state !== "inactive") rec.stop();
          else rec.onstop();
        } catch (e) {
          resolve(null);
        }
      });
    }
    async function startLocalRec() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        status.textContent = "Browser tidak mendukung rekaman";
        return;
      }
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
        });
      } catch (e) {
        status.textContent = "Izin mikrofon ditolak";
        return;
      }
      localChunks = [];
      let mime = "";
      ["audio/webm;codecs=opus", "audio/webm"].forEach(function (c) {
        if (!mime && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) mime = c;
      });
      try {
        localRec = mime ? new MediaRecorder(localStream, { mimeType: mime }) : new MediaRecorder(localStream);
      } catch (e) {
        status.textContent = "Gagal mulai rekaman";
        return;
      }
      localRec.ondataavailable = function (ev) {
        if (ev.data && ev.data.size) localChunks.push(ev.data);
      };
      localRec.start(250);
      localStarted = Date.now();
      if (voiceBar) voiceBar.hidden = false;
      if (voiceTimerEl) voiceTimerEl.textContent = "00:00";
      if (localTimer) clearInterval(localTimer);
      localTimer = setInterval(function () {
        const s = Math.floor((Date.now() - localStarted) / 1000);
        if (voiceTimerEl) {
          voiceTimerEl.textContent =
            String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
        }
        if (s >= 180) wrap.querySelector(".chat-inline-voice-send").click();
      }, 250);
      status.textContent = "Merekam balasan suara…";
    }
    wrap.querySelector(".chat-inline-voice").addEventListener("click", function () {
      if (localRec && localRec.state === "recording") stopLocalRec(false);
      else startLocalRec();
    });
    wrap.querySelector(".chat-inline-voice-cancel").addEventListener("click", function () {
      stopLocalRec(false);
      status.textContent = "Rekaman dibatalkan";
    });
    wrap.querySelector(".chat-inline-voice-send").addEventListener("click", async function () {
      const elapsed = localStarted ? Date.now() - localStarted : 0;
      const blob = await stopLocalRec(true);
      if (!blob || blob.size < 800) {
        status.textContent = "Rekaman terlalu pendek";
        return;
      }
      if (!GalleryDB.uploadChatAudio) {
        status.textContent = "Upload suara belum tersedia";
        return;
      }
      status.textContent = "Mengunggah suara…";
      try {
        const url = await GalleryDB.uploadChatAudio(blob);
        const body = encodeVoiceBody(url, myVoiceTtl(), elapsed > 300 ? elapsed / 1000 : null);
        const row = await GalleryDB.sendChat({
          angkatanId: room.value || null,
          authorName: resolveAuthorName(),
          body: body,
          avatarEmoji: selectedAvatar,
          replyTo: msg.id,
        });
        wrap.remove();
        clearReplyTarget();
        if (row && row.id && !allMessages.some(function (m) { return m.id === row.id; })) addMsg(row);
        status.textContent = "Balasan suara terkirim";
      } catch (e) {
        status.textContent = e.message || String(e);
      }
    });

    ta.addEventListener("input", () => {
      autoResizeEl(ta, 4);
      if (typingCtl) {
        typingCtl.setTyping(true);
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => typingCtl && typingCtl.setTyping(false), 1200);
      }
    });
    ta.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        wrap.querySelector(".chat-inline-send").click();
      }
    });
    wrap.querySelector(".chat-inline-cancel").addEventListener("click", () => {
      stopLocalRec(false);
      wrap.remove();
      clearReplyTarget();
    });
    wrap.querySelector(".chat-inline-send").addEventListener("click", async () => {
      const body = String(ta.value || "").trim();
      if (!body) return;
      try {
        const row = await GalleryDB.sendChat({
          angkatanId: room.value || null,
          authorName: resolveAuthorName(),
          body: body.slice(0, CHAT_BODY_MAX),
          avatarEmoji: selectedAvatar,
          replyTo: msg.id,
        });
        wrap.remove();
        clearReplyTarget();
        if (typingCtl) typingCtl.setTyping(false);
        if (row && row.id && !allMessages.some((m) => m.id === row.id)) addMsg(row);
        status.textContent = "Balasan terkirim";
      } catch (e) {
        status.textContent = e.message || String(e);
      }
    });
  }

  function showEditHistory(msg) {
    let hist = [];
    try {
      if (Array.isArray(msg.edit_history)) hist = msg.edit_history;
      else if (typeof msg.edit_history === "string") hist = JSON.parse(msg.edit_history) || [];
    } catch (e) {
      hist = [];
    }
    if (!hist.length) {
      status.textContent = "Belum ada histori edit tersimpan";
      return;
    }
    let prev = document.getElementById("chatHistModal");
    if (prev) prev.remove();
    const m = document.createElement("div");
    m.id = "chatHistModal";
    m.className = "chat-hist-modal";
    const items = hist
      .slice()
      .reverse()
      .map(function (h, i) {
        const at = h.at ? new Date(h.at).toLocaleString("id-ID") : "";
        let body = String(h.body || "");
        if (/__voice__/i.test(body)) body = "🎤 Pesan suara";
        else if (body.length > 400) body = body.slice(0, 400) + "…";
        return (
          '<div class="chat-hist-item"><div class="chat-hist-meta">Versi lama · ' +
          esc(at) +
          '</div><pre class="chat-hist-body">' +
          esc(body) +
          "</pre></div>"
        );
      })
      .join("");
    m.innerHTML =
      '<div class="chat-hist-backdrop" data-close="1"></div>' +
      '<div class="chat-hist-panel" role="dialog">' +
      "<header><strong>Histori edit</strong> <span class=\"muted\">" +
      editCountOf(msg) +
      "/3</span>" +
      '<button type="button" data-close="1" aria-label="Tutup">✕</button></header>' +
      '<div class="chat-hist-list">' +
      items +
      "</div></div>";
    document.body.appendChild(m);
    m.addEventListener("click", function (ev) {
      if (ev.target && ev.target.getAttribute("data-close") === "1") m.remove();
    });
  }


  if (log) {
    log.addEventListener("click", (ev) => {
      // Klik avatar → tampil/sembunyi tombol Balas/Ubah/Hapus
      const av = ev.target.closest(".chat-av");
      if (av && log.contains(av)) {
        const bubble = av.closest(".chat-bubble");
        if (bubble) {
          const open = bubble.classList.contains("show-actions");
          log.querySelectorAll(".chat-bubble.show-actions").forEach(function (b) {
            if (b !== bubble) b.classList.remove("show-actions");
          });
          bubble.classList.toggle("show-actions", !open);
        }
        return;
      }
      const btn = ev.target.closest("[data-act]");
      if (!btn) return;
      const bubble = btn.closest(".chat-bubble");
      if (!bubble) return;
      const id = bubble.dataset.id;
      const msg = allMessages.find((m) => m.id === id);
      if (!msg) return;
      if (btn.dataset.act === "copy") {
        const text = plainTextFromMessage(msg);
        const done = function () {
          btn.classList.add("is-copied");
          btn.title = "Tersalin";
          setTimeout(function () {
            btn.classList.remove("is-copied");
            btn.title = "Salin pesan";
          }, 1200);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(function () {
            try {
              const ta = document.createElement("textarea");
              ta.value = text;
              document.body.appendChild(ta);
              ta.select();
              document.execCommand("copy");
              ta.remove();
              done();
            } catch (e) {
              status.textContent = "Gagal menyalin";
            }
          });
        } else {
          status.textContent = "Salin tidak didukung browser ini";
        }
        return;
      }
      if (btn.dataset.act === "edit") {
        if (isVoiceMessage(msg)) {
          status.textContent = "Pesan suara tidak bisa diubah";
          return;
        }
        handleEdit(msg, bubble);
      } else if (btn.dataset.act === "del") handleDelete(msg);
      else if (btn.dataset.act === "reply") openInlineReply(msg, bubble);
      else if (btn.dataset.act === "hist") showEditHistory(msg);
    });
  }

  if (nameInput) nameInput.value = localStorage.getItem(LS_NAME) || "";
  const savedAv = localStorage.getItem(LS_AV);
  if (savedAv && AVATARS.includes(savedAv)) selectedAvatar = savedAv;
  buildAvatarPicker();

  if (searchInput) {
    let searchTimer = null;
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(renderMessages, 120);
    });
  }

  if (nameInput) {
    nameInput.addEventListener("change", () => {
      saveProfile();
      bindTyping();
    });
    nameInput.addEventListener("input", () => {
      saveProfile();
    });
  }

  if (chatInput) {
    chatInput.addEventListener("input", () => {
      autoResizeInput();
      saveProfile();
      if (!typingCtl) return;
      typingCtl.setTyping(true);
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => typingCtl && typingCtl.setTyping(false), 1200);
    });
    // Enter kirim, Shift+Enter baris baru
    chatInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        if (chatForm) chatForm.requestSubmit();
      }
    });
    chatInput.addEventListener("paste", (ev) => {
      const items = ev.clipboardData && ev.clipboardData.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.type && it.type.startsWith("image/")) {
          ev.preventDefault();
          const file = it.getAsFile();
          if (file) sendImageFile(file);
          return;
        }
      }
      // after text paste, resize
      setTimeout(autoResizeInput, 0);
    });
    // initial size
    autoResizeInput();
  }

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      const f = fileInput.files && fileInput.files[0];
      if (f) sendImageFile(f);
      fileInput.value = "";
    });
  }

  // --- Voice messages (quality + live meter) ---
  function formatVoiceTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
  }

  function setVoiceBar(on) {
    const bar = $("#chatVoiceBar");
    if (!bar) return;
    bar.hidden = !on;
  }

  function stopVoiceMeter() {
    if (voiceMeterRaf) {
      cancelAnimationFrame(voiceMeterRaf);
      voiceMeterRaf = 0;
    }
    try {
      if (voiceSourceNode) voiceSourceNode.disconnect();
    } catch (e) {}
    voiceSourceNode = null;
    voiceAnalyser = null;
    if (voiceAudioCtx) {
      try {
        voiceAudioCtx.close();
      } catch (e) {}
      voiceAudioCtx = null;
    }
    const canvas = $("#chatVoiceMeter");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  function startVoiceMeter(stream) {
    stopVoiceMeter();
    const canvas = $("#chatVoiceMeter");
    if (!canvas || !stream) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      voiceAudioCtx = new AC();
      if (voiceAudioCtx.state === "suspended") voiceAudioCtx.resume();
      voiceSourceNode = voiceAudioCtx.createMediaStreamSource(stream);
      voiceAnalyser = voiceAudioCtx.createAnalyser();
      voiceAnalyser.fftSize = 256;
      voiceAnalyser.smoothingTimeConstant = 0.75;
      voiceSourceNode.connect(voiceAnalyser);
      const data = new Uint8Array(voiceAnalyser.frequencyBinCount);
      const ctx = canvas.getContext("2d");
      const bars = 24;

      function draw() {
        voiceMeterRaf = requestAnimationFrame(draw);
        if (!voiceAnalyser || !ctx) return;
        voiceAnalyser.getByteFrequencyData(data);
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const gap = 2;
        const bw = (w - gap * (bars - 1)) / bars;
        for (let i = 0; i < bars; i++) {
          // fokus ke frekuensi suara bicara (skip bin paling bawah yang noisy)
          const idx = Math.min(data.length - 1, 4 + Math.floor(i * (data.length * 0.45) / bars));
          const v = data[idx] / 255;
          const bh = Math.max(2, v * (h - 2));
          const x = i * (bw + gap);
          const y = (h - bh) / 2;
          const g = ctx.createLinearGradient(0, y + bh, 0, y);
          g.addColorStop(0, "rgba(125,227,255,0.35)");
          g.addColorStop(1, "rgba(125,227,255,0.95)");
          ctx.fillStyle = g;
          ctx.fillRect(x, y, bw, bh);
        }
      }
      draw();
    } catch (e) {
      // meter opsional — rekaman tetap jalan
    }
  }

  function stopVoiceTracks() {
    stopVoiceMeter();
    if (mediaStream) {
      try {
        mediaStream.getTracks().forEach(function (t) {
          t.stop();
        });
      } catch (e) {}
      mediaStream = null;
    }
  }

  function cancelVoiceRecord() {
    try {
      if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    } catch (e) {}
    mediaRecorder = null;
    mediaChunks = [];
    stopVoiceTracks();
    if (voiceTimer) {
      clearInterval(voiceTimer);
      voiceTimer = null;
    }
    setVoiceBar(false);
    const vb = $("#chatVoiceBtn");
    if (vb) vb.classList.remove("is-recording");
  }

  async function startVoiceRecord() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      status.textContent = "Browser tidak mendukung rekaman suara";
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      status.textContent = "MediaRecorder tidak tersedia";
      return;
    }
    if (uploading) return;
    try {
      // Kualitas lebih jernih: echo/noise off default browser sering membuat "geresek"
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
      });
    } catch (e1) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        status.textContent = "Izin mikrofon ditolak / tidak tersedia";
        return;
      }
    }
    mediaChunks = [];
    let mime = "";
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    for (let i = 0; i < candidates.length; i++) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(candidates[i])) {
        mime = candidates[i];
        break;
      }
    }
    // bitrate lebih tinggi = lebih jernih (masih jauh di bawah limit 3MB untuk 2 menit)
    const recOpts = { audioBitsPerSecond: 128000 };
    if (mime) recOpts.mimeType = mime;
    try {
      mediaRecorder = new MediaRecorder(mediaStream, recOpts);
    } catch (e) {
      try {
        mediaRecorder = mime
          ? new MediaRecorder(mediaStream, { mimeType: mime })
          : new MediaRecorder(mediaStream);
      } catch (e2) {
        stopVoiceTracks();
        status.textContent = "Gagal memulai rekaman";
        return;
      }
    }
    mediaRecorder.ondataavailable = function (ev) {
      if (ev.data && ev.data.size) mediaChunks.push(ev.data);
    };
    mediaRecorder.onstop = function () {};
    // timeslice lebih kecil agar data tidak "putus-putus" di beberapa browser
    mediaRecorder.start(250);
    voiceStartedAt = Date.now();
    setVoiceBar(true);
    startVoiceMeter(mediaStream);
    const timerEl = $("#chatVoiceTimer");
    if (timerEl) timerEl.textContent = "0:00";
    if (voiceTimer) clearInterval(voiceTimer);
    voiceTimer = setInterval(function () {
      if (timerEl) timerEl.textContent = formatVoiceTime(Date.now() - voiceStartedAt);
      if (Date.now() - voiceStartedAt > 120000) {
        stopVoiceRecord(true);
      }
    }, 250);
    const vb = $("#chatVoiceBtn");
    if (vb) vb.classList.add("is-recording");
    status.textContent = "Merekam… lihat gelombang · Kirim suara / Batal";
  }

  async function stopVoiceRecord(shouldSend) {
    if (!mediaRecorder) {
      cancelVoiceRecord();
      return;
    }
    const recordedMs = voiceStartedAt ? Date.now() - voiceStartedAt : 0;
    const rec = mediaRecorder;
    const type = rec.mimeType || "audio/webm";
    await new Promise(function (resolve) {
      rec.onstop = function () {
        resolve();
      };
      try {
        if (rec.state !== "inactive") rec.stop();
        else resolve();
      } catch (e) {
        resolve();
      }
    });
    stopVoiceTracks();
    if (voiceTimer) {
      clearInterval(voiceTimer);
      voiceTimer = null;
    }
    setVoiceBar(false);
    const vb = $("#chatVoiceBtn");
    if (vb) vb.classList.remove("is-recording");
    mediaRecorder = null;
    if (!shouldSend) {
      mediaChunks = [];
      status.textContent = "Rekaman dibatalkan";
      return;
    }
    if (!mediaChunks.length) {
      status.textContent = "Rekaman kosong";
      return;
    }
    const blob = new Blob(mediaChunks, { type: type });
    mediaChunks = [];
    if (blob.size < 800) {
      status.textContent = "Rekaman terlalu pendek";
      return;
    }
    if (!GalleryDB.enabled() || !GalleryDB.uploadChatAudio) {
      status.textContent = "Upload suara belum tersedia";
      return;
    }
    if (uploading) return;
    uploading = true;
    status.textContent = "Mengunggah pesan suara…";
    try {
      const url = await GalleryDB.uploadChatAudio(blob);
      if (!url) throw new Error("Upload gagal");
      let durSec = null;
      try {
        const tmp = document.createElement("audio");
        tmp.preload = "metadata";
        const obj = URL.createObjectURL(blob);
        tmp.src = obj;
        await new Promise(function (res) {
          tmp.onloadedmetadata = function () { res(); };
          tmp.onerror = function () { res(); };
          setTimeout(res, 2000);
        });
        if (isFinite(tmp.duration) && tmp.duration > 0 && tmp.duration !== Infinity) durSec = tmp.duration;
        URL.revokeObjectURL(obj);
      } catch (e) {}
      if (durSec == null && recordedMs > 300) durSec = recordedMs / 1000;
      const body = encodeVoiceBody(url, myVoiceTtl(), durSec);
      const row = await GalleryDB.sendChat({
        angkatanId: room.value || null,
        authorName: resolveAuthorName(),
        body,
        avatarEmoji: selectedAvatar,
        replyTo: replyToId,
      });
      clearReplyTarget();
      if (typingCtl) typingCtl.setTyping(false);
      if (row && row.id && !allMessages.some((m) => m.id === row.id)) addMsg(row);
      status.textContent =
        "Pesan suara terkirim · hapus otomatis: " + voiceRetentionLabel(myVoiceTtl());
    } catch (e) {
      status.textContent = e.message || String(e);
    } finally {
      uploading = false;
    }
  }

  const voiceBtn = $("#chatVoiceBtn");
  if (voiceBtn) {
    voiceBtn.addEventListener("click", function () {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        stopVoiceRecord(true);
      } else {
        startVoiceRecord();
      }
    });
  }
  const voiceStop = $("#chatVoiceStop");
  if (voiceStop) {
    voiceStop.addEventListener("click", function () {
      stopVoiceRecord(true);
    });
  }
  const voiceCancel = $("#chatVoiceCancel");
  if (voiceCancel) {
    voiceCancel.addEventListener("click", function () {
      cancelVoiceRecord();
    });
  }

  // purge suara kedaluwarsa tiap 2 menit
  setInterval(function () {
    const before = allMessages.length;
    purgeExpiredVoiceLocal();
    if (allMessages.length !== before) renderMessages();
  }, 120000);

  if (chatForm) {
    chatForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      saveProfile();
      const body = chatInput ? chatInput.value : "";
      if (!String(body || "").trim()) return;
      try {
        const row = await GalleryDB.sendChat({
          angkatanId: room.value || null,
          authorName: resolveAuthorName(),
          body,
          avatarEmoji: selectedAvatar,
          replyTo: replyToId,
        });
        if (chatInput) {
          chatInput.value = "";
          autoResizeInput();
        }
        clearReplyTarget();
        if (typingCtl) typingCtl.setTyping(false);
        if (row && row.id && !allMessages.some((m) => m.id === row.id)) addMsg(row);
      } catch (e) {
        status.textContent = e.message || String(e);
      }
    });
  }

  room.addEventListener("change", joinRoom);

  resolveSessionContext().then(() => {
    loadRooms().then(joinRoom);
  });


  // --- Floating window: dock / float / max / min ---
  (function initChatWindow() {
    const win = $("#chatWin");
    const bar = $("#chatWinBar");
    if (!win || !bar) return;
    const LS_MODE = "sh_chat_win_mode";
    const LS_POS = "sh_chat_win_pos";
    const inEmbed =
      (typeof URLSearchParams !== "undefined" &&
        new URLSearchParams(location.search).get("embed") === "1") ||
      window.self !== window.top;
    if (inEmbed) {
      document.documentElement.classList.add("chat-embed");
      document.body.classList.add("chat-embed");
    }
    // Jika datang dari halaman lain dengan niat restore, jangan tetap di min
    try {
      if (sessionStorage.getItem("sh_chat_restore") === "1") {
        sessionStorage.removeItem("sh_chat_restore");
        localStorage.setItem(LS_MODE, window.innerWidth < 720 ? "dock" : "float");
      }
    } catch (e) {}
    let mode = localStorage.getItem(LS_MODE) || "dock";
    // Di dalam iframe embed, paksa tampilan float (parent yang pegang chrome)
    if (inEmbed && (mode === "dock" || mode === "min")) mode = "float";
    let dragging = false;
    let ox = 0, oy = 0;

    // Ensure restore FAB exists and is attached to <body> (not trapped in main stacking)
    let restore = $("#chatWinRestore");
    if (!restore) {
      restore = document.createElement("button");
      restore.type = "button";
      restore.id = "chatWinRestore";
      restore.className = "chat-win-restore";
      restore.title = "Buka kembali chat";
      restore.textContent = "💬 Chat";
      restore.setAttribute("hidden", "");
    }
    if (restore.parentElement !== document.body) {
      document.body.appendChild(restore);
    }

    function restoreTarget() {
      return window.innerWidth < 720 ? "dock" : "float";
    }

    function setRestoreVisible(on) {
      if (!restore) return;
      if (on) {
        restore.classList.add("is-visible");
        restore.removeAttribute("hidden");
        restore.setAttribute("aria-hidden", "false");
        restore.style.display = "inline-flex";
      } else {
        restore.classList.remove("is-visible");
        restore.setAttribute("hidden", "");
        restore.setAttribute("aria-hidden", "true");
        restore.style.display = "none";
      }
    }

    function applyMode(m) {
      if (!m || !["dock", "float", "max", "min"].includes(m)) m = "dock";
      mode = m;
      win.classList.remove("mode-dock", "mode-float", "mode-max", "mode-min");
      win.classList.add("mode-" + m);
      win.dataset.mode = m;
      try { localStorage.setItem(LS_MODE, m); } catch (e) {}
      document.body.classList.toggle("chat-is-min", m === "min");
      setRestoreVisible(m === "min");
      if (m === "float") {
        try {
          const pos = JSON.parse(localStorage.getItem(LS_POS) || "null");
          if (pos && typeof pos.left === "number") {
            win.style.left = pos.left + "px";
            win.style.top = pos.top + "px";
          } else {
            win.style.left = "12px";
            win.style.top = "64px";
          }
        } catch (e) {}
      }
      if (m === "dock" || m === "max") {
        win.style.left = "";
        win.style.top = "";
      }
    }

    bar.querySelectorAll("[data-win]").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const next = btn.getAttribute("data-win");
        // Di embed iframe: dock/max → buka halaman penuh; min → parent minimize
        if (inEmbed) {
          try {
            localStorage.setItem(LS_MODE, next === "min" ? "min" : next === "dock" || next === "max" ? next : "float");
          } catch (e) {}
          if (next === "min") {
            try {
              window.parent.postMessage({ type: "sh-chat-mode", mode: "min" }, "*");
            } catch (e) {}
            return;
          }
          if (next === "dock" || next === "max") {
            try {
              window.top.location.href = "chat.html";
            } catch (e) {
              location.href = "chat.html";
            }
            return;
          }
        }
        applyMode(next);
      });
    });

    function doRestore(ev) {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      if (mode !== "min") return;
      applyMode(restoreTarget());
    }
    restore.addEventListener("click", doRestore);
    restore.addEventListener("touchend", doRestore, { passive: false });

    bar.addEventListener("pointerdown", (ev) => {
      if (mode !== "float") return;
      if (ev.target.closest("[data-win]")) return;
      dragging = true;
      const rect = win.getBoundingClientRect();
      ox = ev.clientX - rect.left;
      oy = ev.clientY - rect.top;
      try { bar.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    bar.addEventListener("pointermove", (ev) => {
      if (!dragging) return;
      const left = Math.max(0, Math.min(window.innerWidth - 80, ev.clientX - ox));
      const top = Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - oy));
      win.style.left = left + "px";
      win.style.top = top + "px";
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      try {
        localStorage.setItem(
          LS_POS,
          JSON.stringify({ left: parseInt(win.style.left, 10) || 0, top: parseInt(win.style.top, 10) || 0 })
        );
      } catch (e) {}
    }
    bar.addEventListener("pointerup", endDrag);
    bar.addEventListener("pointercancel", endDrag);

    const cancelBtn = $("#chatReplyCancel");
    if (cancelBtn) cancelBtn.addEventListener("click", clearReplyTarget);

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && mode === "min") applyMode("dock");
    });

    // Safety: if stuck in min with no visible restore, force dock after load
    applyMode(mode);
    if (mode === "min") {
      requestAnimationFrame(() => {
        const r = restore.getBoundingClientRect();
        if (!r.width || !r.height || restore.offsetParent === null) {
          // still not painted — force visible again
          setRestoreVisible(true);
        }
      });
    }
  })();

})();