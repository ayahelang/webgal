/**
 * SHVoice — standar rekam & putar pesan suara (shared)
 * Rekam: timer + gelombang | Putar: play/pause/stop + seek + unduh
 */
(function (global) {
  "use strict";

  function formatClock(sec) {
    if (!isFinite(sec) || sec < 0) return "--:--";
    sec = Math.floor(sec);
    return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
  }

  function pickMime() {
    var cands = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
    for (var i = 0; i < cands.length; i++) {
      try {
        if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(cands[i])) {
          return cands[i];
        }
      } catch (e) {}
    }
    return "";
  }

  function createRecorder(opts) {
    opts = opts || {};
    var bar = opts.bar;
    var timerEl = opts.timerEl;
    var canvas = opts.canvas;
    var maxMs = opts.maxMs != null ? opts.maxMs : 180000;
    var rec = null;
    var chunks = [];
    var stream = null;
    var timer = null;
    var startedAt = 0;
    var audioCtx = null;
    var analyser = null;
    var meterRaf = 0;
    var recording = false;

    function stopMeter() {
      if (meterRaf) cancelAnimationFrame(meterRaf);
      meterRaf = 0;
      if (audioCtx) {
        try { audioCtx.close(); } catch (e) {}
        audioCtx = null;
      }
      analyser = null;
      if (canvas) {
        try {
          var ctx = canvas.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        } catch (e) {}
      }
    }

    function startMeter(mediaStream) {
      stopMeter();
      if (!canvas || !mediaStream) return;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC();
        if (audioCtx.state === "suspended") audioCtx.resume();
        var src = audioCtx.createMediaStreamSource(mediaStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        var data = new Uint8Array(analyser.frequencyBinCount);
        var ctx = canvas.getContext("2d");
        var bars = 22;
        function draw() {
          meterRaf = requestAnimationFrame(draw);
          if (!analyser) return;
          analyser.getByteFrequencyData(data);
          var w = canvas.width, h = canvas.height;
          ctx.clearRect(0, 0, w, h);
          var gap = 2;
          var bw = (w - gap * (bars - 1)) / bars;
          for (var i = 0; i < bars; i++) {
            var idx = Math.min(data.length - 1, 4 + Math.floor((i * data.length * 0.45) / bars));
            var v = data[idx] / 255;
            var bh = Math.max(2, v * (h - 2));
            ctx.fillStyle = "rgba(125,227,255,0.85)";
            ctx.fillRect(i * (bw + gap), (h - bh) / 2, bw, bh);
          }
        }
        draw();
      } catch (e) {}
    }

    function setTimer(ms) {
      if (timerEl) timerEl.textContent = formatClock(ms / 1000);
      if (opts.onTick) opts.onTick(ms);
    }

    function cleanupStream() {
      if (stream) {
        try { stream.getTracks().forEach(function (tr) { tr.stop(); }); } catch (e) {}
        stream = null;
      }
    }

    async function start() {
      if (recording) return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (opts.onError) opts.onError(new Error("Browser tidak mendukung rekaman"));
        return;
      }
      if (typeof MediaRecorder === "undefined") {
        if (opts.onError) opts.onError(new Error("MediaRecorder tidak tersedia"));
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        });
      } catch (e) {
        if (opts.onError) opts.onError(new Error("Izin mikrofon ditolak"));
        return;
      }
      chunks = [];
      var mime = pickMime();
      try {
        rec = mime
          ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 128000 })
          : new MediaRecorder(stream);
      } catch (e) {
        try { rec = new MediaRecorder(stream); } catch (e2) {
          cleanupStream();
          if (opts.onError) opts.onError(new Error("Gagal mulai rekaman"));
          return;
        }
      }
      rec.ondataavailable = function (ev) {
        if (ev.data && ev.data.size) chunks.push(ev.data);
      };
      rec.start(250);
      recording = true;
      startedAt = Date.now();
      if (bar) bar.hidden = false;
      setTimer(0);
      if (timer) clearInterval(timer);
      timer = setInterval(function () {
        var elapsed = Date.now() - startedAt;
        setTimer(elapsed);
        if (elapsed >= maxMs) stop(true);
      }, 200);
      startMeter(stream);
    }

    function stop(send) {
      return new Promise(function (resolve) {
        if (!rec) {
          recording = false;
          if (bar) bar.hidden = true;
          stopMeter();
          resolve(null);
          return;
        }
        var r = rec;
        var type = r.mimeType || "audio/webm";
        var elapsed = startedAt ? Date.now() - startedAt : 0;
        r.onstop = function () {
          var blob = chunks.length ? new Blob(chunks, { type: type }) : null;
          chunks = [];
          rec = null;
          recording = false;
          cleanupStream();
          if (timer) clearInterval(timer);
          timer = null;
          stopMeter();
          if (bar) bar.hidden = true;
          var durSec = elapsed > 300 ? elapsed / 1000 : null;
          if (send && blob && blob.size >= 800) {
            if (opts.onStop) opts.onStop(blob, durSec);
            resolve({ blob: blob, durationSec: durSec });
          } else {
            resolve(null);
          }
        };
        try {
          if (r.state !== "inactive") r.stop();
          else r.onstop();
        } catch (e) {
          resolve(null);
        }
      });
    }

    return {
      start: start,
      stop: function () { return stop(true); },
      cancel: function () { return stop(false); },
      isRecording: function () { return recording; },
      destroy: function () { stop(false); },
      formatClock: formatClock,
    };
  }

  function playerHtml(opts) {
    opts = opts || {};
    var url = String(opts.url || "").replace(/"/g, "&quot;");
    var known = opts.duration != null && isFinite(opts.duration) ? Number(opts.duration) : null;
    var durLabel = known != null ? formatClock(known) : "--:--";
    var ttl = opts.ttlLabel ? String(opts.ttlLabel) : "";
    var dl = opts.downloadable !== false;
    return (
      '<div class="sh-voice-player"' +
      (known != null ? ' data-duration="' + known + '"' : "") +
      ' data-voice-url="' + url + '">' +
      '<button type="button" class="sh-voice-play" data-voice-play title="Putar/jeda">▶</button>' +
      '<button type="button" class="sh-voice-stop" data-voice-stop title="Stop">⏹</button>' +
      '<div class="sh-voice-track">' +
      '<span class="sh-voice-time" data-voice-time>00:00 / ' + durLabel + "</span>" +
      '<input type="range" class="sh-voice-seek" min="0" max="1000" value="0" step="1" aria-label="Posisi audio" />' +
      "</div>" +
      (dl ? '<button type="button" class="sh-voice-dl" data-voice-dl title="Unduh suara">⬇</button>' : "") +
      '<audio class="sh-voice-audio" preload="auto" src="' + url + '" playsinline></audio>' +
      (ttl ? '<small class="sh-voice-ttl">' + ttl + "</small>" : "") +
      "</div>"
    );
  }

  /**
   * Wire semua player di root. Aman dipanggil berulang (idempotent per elemen).
   */
  function wirePlayers(root) {
    if (!root) return;
    var nodes = root.querySelectorAll(".sh-voice-player, .chat-voice-player, .ann-voice-block");
    for (var n = 0; n < nodes.length; n++) {
      wireOne(nodes[n], root);
    }
  }

  function wireOne(wrap, root) {
    if (!wrap || wrap.getAttribute("data-sh-wired") === "3") return;
    wrap.setAttribute("data-sh-wired", "3");
    wrap.classList.add("sh-voice-player");

    var audio = wrap.querySelector("audio");
    var btn = wrap.querySelector("[data-voice-play], .sh-voice-play, .chat-voice-play");
    var stopBtn = wrap.querySelector("[data-voice-stop], .sh-voice-stop");
    var timeEl = wrap.querySelector("[data-voice-time], .sh-voice-time, .chat-voice-time");
    var seek = wrap.querySelector(".sh-voice-seek");
    var dlBtn = wrap.querySelector("[data-voice-dl], .sh-voice-dl");
    var srcUrl = wrap.getAttribute("data-voice-url") || "";

    if (!audio) {
      if (!srcUrl) return;
      audio = document.createElement("audio");
      audio.className = "sh-voice-audio";
      audio.preload = "auto";
      audio.setAttribute("playsinline", "");
      audio.src = srcUrl;
      wrap.appendChild(audio);
    } else {
      audio.preload = "auto";
      audio.setAttribute("playsinline", "");
      if (!srcUrl) srcUrl = audio.getAttribute("src") || audio.src || "";
    }

    // Pastikan struktur track + seek
    if (!seek || !timeEl) {
      var track = wrap.querySelector(".sh-voice-track");
      if (!track) {
        track = document.createElement("div");
        track.className = "sh-voice-track";
        if (btn && btn.nextSibling) wrap.insertBefore(track, btn.nextSibling);
        else wrap.appendChild(track);
      }
      if (!timeEl) {
        timeEl = document.createElement("span");
        timeEl.className = "sh-voice-time";
        timeEl.setAttribute("data-voice-time", "");
        track.insertBefore(timeEl, track.firstChild);
      }
      if (!seek) {
        seek = document.createElement("input");
        seek.type = "range";
        seek.className = "sh-voice-seek";
        seek.min = "0";
        seek.max = "1000";
        seek.value = "0";
        seek.step = "1";
        track.appendChild(seek);
      }
    }

    if (!stopBtn) {
      stopBtn = document.createElement("button");
      stopBtn.type = "button";
      stopBtn.className = "sh-voice-stop";
      stopBtn.setAttribute("data-voice-stop", "");
      stopBtn.title = "Stop";
      stopBtn.textContent = "⏹";
      if (btn && btn.nextSibling) wrap.insertBefore(stopBtn, btn.nextSibling);
      else wrap.appendChild(stopBtn);
    }

    if (!dlBtn && srcUrl) {
      dlBtn = document.createElement("button");
      dlBtn.type = "button";
      dlBtn.className = "sh-voice-dl";
      dlBtn.setAttribute("data-voice-dl", "");
      dlBtn.title = "Unduh suara";
      dlBtn.textContent = "⬇";
      wrap.appendChild(dlBtn);
    }

    var known = parseFloat(wrap.getAttribute("data-duration") || "");
    if (!isFinite(known) || known <= 0) known = null;
    var seeking = false;
    var pollTimer = null;

    function totalDur() {
      var d = audio.duration;
      if (isFinite(d) && d > 0 && d !== Infinity) return d;
      if (known != null && known > 0) return known;
      return null;
    }

    function setPlayIcon(playing) {
      if (!btn) return;
      btn.textContent = playing ? "❚❚" : "▶";
      btn.classList.toggle("is-playing", !!playing);
      btn.setAttribute("aria-label", playing ? "Jeda" : "Putar");
    }

    function renderTime() {
      var dur = totalDur();
      var cur = 0;
      try { cur = audio.currentTime || 0; } catch (e) { cur = 0; }
      if (!isFinite(cur)) cur = 0;
      if (timeEl) {
        timeEl.textContent = formatClock(cur) + " / " + (dur != null ? formatClock(dur) : "--:--");
      }
      if (seek && !seeking && dur != null && dur > 0) {
        var v = Math.round((cur / dur) * 1000);
        if (v < 0) v = 0;
        if (v > 1000) v = 1000;
        seek.value = String(v);
      }
    }

    function startPoll() {
      stopPoll();
      pollTimer = setInterval(function () {
        renderTime();
        if (audio.paused || audio.ended) {
          setPlayIcon(false);
          stopPoll();
        }
      }, 100);
    }

    function stopPoll() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    function pauseOthers() {
      var scope = root || document;
      var list = scope.querySelectorAll("audio.sh-voice-audio, audio.chat-voice-audio");
      for (var i = 0; i < list.length; i++) {
        if (list[i] !== audio) {
          try { list[i].pause(); } catch (e) {}
        }
      }
      var btns = scope.querySelectorAll("[data-voice-play], .sh-voice-play, .chat-voice-play");
      for (var j = 0; j < btns.length; j++) {
        if (btns[j] !== btn) {
          btns[j].textContent = "▶";
          btns[j].classList.remove("is-playing");
        }
      }
    }

    audio.addEventListener("loadedmetadata", function () {
      var d = audio.duration;
      if (isFinite(d) && d > 0 && d !== Infinity) {
        known = d;
        wrap.setAttribute("data-duration", String(known));
      }
      renderTime();
    });
    audio.addEventListener("durationchange", renderTime);
    audio.addEventListener("timeupdate", renderTime);
    audio.addEventListener("play", function () {
      setPlayIcon(true);
      startPoll();
    });
    audio.addEventListener("pause", function () {
      if (!audio.ended) setPlayIcon(false);
      stopPoll();
      renderTime();
    });
    audio.addEventListener("ended", function () {
      setPlayIcon(false);
      stopPoll();
      try { audio.currentTime = 0; } catch (e) {}
      renderTime();
    });
    audio.addEventListener("seeking", renderTime);
    audio.addEventListener("seeked", renderTime);

    if (btn) {
      btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (audio.paused) {
          pauseOthers();
          var p = audio.play();
          setPlayIcon(true);
          startPoll();
          if (p && p.then) {
            p.catch(function () {
              setPlayIcon(false);
              stopPoll();
            });
          }
        } else {
          audio.pause();
          setPlayIcon(false);
          stopPoll();
        }
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) {}
        setPlayIcon(false);
        stopPoll();
        renderTime();
      });
    }

    function applySeekFromInput() {
      var dur = totalDur();
      if (dur == null || dur <= 0 || !seek) return;
      var t = (Number(seek.value) / 1000) * dur;
      if (!isFinite(t)) return;
      try {
        audio.currentTime = Math.max(0, Math.min(dur, t));
      } catch (e) {}
      renderTime();
    }

    if (seek) {
      seek.addEventListener("pointerdown", function () { seeking = true; });
      seek.addEventListener("mousedown", function () { seeking = true; });
      seek.addEventListener("touchstart", function () { seeking = true; }, { passive: true });
      seek.addEventListener("input", function () {
        seeking = true;
        applySeekFromInput();
      });
      seek.addEventListener("change", function () {
        seeking = false;
        applySeekFromInput();
      });
      seek.addEventListener("pointerup", function () {
        seeking = false;
        applySeekFromInput();
      });
      seek.addEventListener("mouseup", function () {
        seeking = false;
        applySeekFromInput();
      });
      seek.addEventListener("touchend", function () {
        seeking = false;
        applySeekFromInput();
      });
    }

    if (dlBtn) {
      dlBtn.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var url = srcUrl || audio.src;
        if (!url) return;
        dlBtn.disabled = true;
        // Coba unduh sebagai file (webm/ogg — browser tidak merekam MP3 native)
        fetch(url, { mode: "cors", credentials: "omit" })
          .then(function (r) {
            if (!r.ok) throw new Error("fail");
            return r.blob();
          })
          .then(function (blob) {
            var type = blob.type || "audio/webm";
            var ext = "webm";
            if (type.indexOf("ogg") >= 0) ext = "ogg";
            else if (type.indexOf("mp4") >= 0 || type.indexOf("m4a") >= 0) ext = "m4a";
            else if (type.indexOf("mpeg") >= 0 || type.indexOf("mp3") >= 0) ext = "mp3";
            var obj = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.style.display = "none";
            a.href = obj;
            a.download = "pesan-suara." + ext;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
              a.remove();
              URL.revokeObjectURL(obj);
            }, 1500);
          })
          .catch(function () {
            // Fallback: buka tab (CORS storage belum mengizinkan fetch)
            var a = document.createElement("a");
            a.href = url;
            a.target = "_blank";
            a.rel = "noopener";
            a.download = "pesan-suara.webm";
            document.body.appendChild(a);
            a.click();
            a.remove();
          })
          .finally(function () {
            dlBtn.disabled = false;
          });
      });
    }

    try { audio.load(); } catch (e) {}
    renderTime();
  }

  function recorderBarHtml() {
    return (
      '<div class="sh-voice-rec-bar chat-voice-bar" hidden data-sh-voice-bar="1">' +
      '<span class="chat-voice-dot sh-voice-dot" aria-hidden="true"></span>' +
      '<span class="sh-voice-timer chat-voice-timer" data-sh-voice-timer="1">00:00</span>' +
      '<canvas class="sh-voice-meter chat-voice-meter" width="140" height="28" data-sh-voice-meter="1" aria-hidden="true"></canvas>' +
      '<button type="button" class="chat-act sh-voice-rec-stop" data-sh-voice-stop="1">Selesai</button>' +
      '<button type="button" class="chat-act sh-voice-rec-cancel" data-sh-voice-cancel="1">Batal</button>' +
      "</div>"
    );
  }

  function bindRecorderBar(bar, handlers) {
    handlers = handlers || {};
    if (!bar) return null;
    var timerEl = bar.querySelector("[data-sh-voice-timer], .sh-voice-timer, .chat-voice-timer");
    var canvas = bar.querySelector("[data-sh-voice-meter], .sh-voice-meter, .chat-voice-meter");
    var ctl = createRecorder({
      bar: bar,
      timerEl: timerEl,
      canvas: canvas,
      onStop: handlers.onStop,
      onError: handlers.onError,
      maxMs: handlers.maxMs,
    });
    var stopBtn = bar.querySelector("[data-sh-voice-stop], .sh-voice-rec-stop");
    var cancelBtn = bar.querySelector("[data-sh-voice-cancel], .sh-voice-rec-cancel");
    if (stopBtn) stopBtn.addEventListener("click", function () { ctl.stop(); });
    if (cancelBtn) cancelBtn.addEventListener("click", function () {
      ctl.cancel();
      if (handlers.onCancel) handlers.onCancel();
    });
    return ctl;
  }

  global.SHVoice = {
    formatClock: formatClock,
    createRecorder: createRecorder,
    playerHtml: playerHtml,
    wirePlayers: wirePlayers,
    recorderBarHtml: recorderBarHtml,
    bindRecorderBar: bindRecorderBar,
  };
})(typeof window !== "undefined" ? window : this);
