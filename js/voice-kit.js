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


  /**
   * Player HTML — pola klasik (play/pause, range ber-skala detik, stop, unduh)
   */

  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    sec = Math.floor(sec);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  /**
   * UI player bersih — class unik sh-ap-* (hindari bentrok CSS lama)
   */
  function playerHtml(opts) {
    opts = opts || {};
    var url = String(opts.url || "").replace(/"/g, "&quot;");
    var dur = opts.duration != null && isFinite(Number(opts.duration)) ? Number(opts.duration) : 0;
    var ttl = opts.ttlLabel ? String(opts.ttlLabel) : "";
    var showDl = opts.downloadable !== false;
    return (
      '<div class="sh-ap" data-src="' + url + '" data-dur="' + (dur || "") + '">' +
      '<button type="button" class="sh-ap-play" aria-label="Putar">▶</button>' +
      '<button type="button" class="sh-ap-stop" aria-label="Stop">■</button>' +
      '<div class="sh-ap-body">' +
      '<div class="sh-ap-time"><span class="sh-ap-cur">00:00</span><span class="sh-ap-sep"> / </span><span class="sh-ap-dur">' +
      (dur ? fmtTime(dur) : "00:00") +
      "</span></div>" +
      '<input class="sh-ap-seek" type="range" min="0" max="' +
      (dur > 0 ? dur : 1) +
      '" value="0" step="0.01" />' +
      "</div>" +
      (showDl ? '<button type="button" class="sh-ap-dl" aria-label="Unduh">⬇</button>' : "") +
      '<audio class="sh-ap-audio" preload="metadata" playsinline src="' + url + '"></audio>' +
      (ttl ? '<div class="sh-ap-meta">' + ttl + "</div>" : "") +
      "</div>"
    );
  }

  function wirePlayers(root) {
    if (!root) return;
    var list = root.querySelectorAll(".sh-ap, .sh-audio, .sh-voice-player, .chat-voice-player, .ann-voice-block");
    for (var i = 0; i < list.length; i++) {
      wireOne(list[i]);
    }
  }

  function wireOne(el) {
    if (!el || el._shApWired) return;

    // Jika bukan .sh-ap, rebuild ke struktur bersih
    var src =
      el.getAttribute("data-src") ||
      el.getAttribute("data-voice-url") ||
      "";
    var audio0 = el.querySelector("audio");
    if (!src && audio0) src = audio0.getAttribute("src") || audio0.src || "";
    var dur0 = parseFloat(el.getAttribute("data-dur") || el.getAttribute("data-duration") || "");
    if (!isFinite(dur0) || dur0 <= 0) dur0 = 0;
    var ttlEl = el.querySelector(".sh-ap-meta, .sh-audio-ttl, .sh-voice-ttl, .chat-voice-ttl");
    var ttl = ttlEl ? ttlEl.textContent : "";

    if (!el.classList.contains("sh-ap") || !el.querySelector(".sh-ap-seek")) {
      el.className = "sh-ap";
      el.setAttribute("data-src", src);
      if (dur0) el.setAttribute("data-dur", String(dur0));
      el.innerHTML =
        '<button type="button" class="sh-ap-play" aria-label="Putar">▶</button>' +
        '<button type="button" class="sh-ap-stop" aria-label="Stop">■</button>' +
        '<div class="sh-ap-body">' +
        '<div class="sh-ap-time"><span class="sh-ap-cur">00:00</span><span class="sh-ap-sep"> / </span><span class="sh-ap-dur">' +
        (dur0 ? fmtTime(dur0) : "00:00") +
        "</span></div>" +
        '<input class="sh-ap-seek" type="range" min="0" max="' +
        (dur0 > 0 ? dur0 : 1) +
        '" value="0" step="0.01" />' +
        "</div>" +
        '<button type="button" class="sh-ap-dl" aria-label="Unduh">⬇</button>' +
        '<audio class="sh-ap-audio" preload="metadata" playsinline src="' +
        String(src).replace(/"/g, "&quot;") +
        '"></audio>' +
        (ttl ? '<div class="sh-ap-meta"></div>' : "");
      if (ttl) el.querySelector(".sh-ap-meta").textContent = ttl;
    }

    el._shApWired = true;

    var audio = el.querySelector("audio.sh-ap-audio, audio");
    var btnPlay = el.querySelector(".sh-ap-play");
    var btnStop = el.querySelector(".sh-ap-stop");
    var btnDl = el.querySelector(".sh-ap-dl");
    var seek = el.querySelector(".sh-ap-seek");
    var curEl = el.querySelector(".sh-ap-cur");
    var durEl = el.querySelector(".sh-ap-dur");
    if (!audio || !seek || !btnPlay) return;

    var known = dur0;
    var hold = false; // user sedang drag

    function dur() {
      var d = audio.duration;
      if (isFinite(d) && d > 0 && d !== Infinity) return d;
      return known > 0 ? known : 0;
    }

    function ui() {
      var d = dur();
      var t = 0;
      try {
        t = audio.currentTime || 0;
      } catch (e) {}
      if (!isFinite(t)) t = 0;
      if (d > 0) {
        seek.min = 0;
        seek.max = d;
        if (!hold) seek.value = t;
      }
      if (curEl) curEl.textContent = fmtTime(t);
      if (durEl) durEl.textContent = d > 0 ? fmtTime(d) : "00:00";
      btnPlay.textContent = audio.paused ? "▶" : "❚❚";
    }

    audio.addEventListener("loadedmetadata", function () {
      var d = audio.duration;
      if (isFinite(d) && d > 0 && d !== Infinity) {
        known = d;
        el.setAttribute("data-dur", String(d));
        seek.max = d;
      }
      ui();
    });
    audio.addEventListener("timeupdate", ui);
    audio.addEventListener("durationchange", ui);
    audio.addEventListener("play", ui);
    audio.addEventListener("pause", ui);
    audio.addEventListener("ended", function () {
      try {
        audio.currentTime = 0;
      } catch (e) {}
      ui();
    });

    // interval cadangan saat play
    var iv = null;
    function tickOn() {
      tickOff();
      iv = setInterval(function () {
        if (!audio.paused) ui();
        else tickOff();
      }, 100);
    }
    function tickOff() {
      if (iv) {
        clearInterval(iv);
        iv = null;
      }
    }
    audio.addEventListener("play", tickOn);
    audio.addEventListener("pause", tickOff);
    audio.addEventListener("ended", tickOff);

    btnPlay.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (audio.paused) {
        // pause others
        document.querySelectorAll(".sh-ap audio").forEach(function (a) {
          if (a !== audio) {
            try {
              a.pause();
            } catch (err) {}
          }
        });
        var p = audio.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        audio.pause();
      }
      ui();
    });

    btnStop.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch (err) {}
      ui();
    });

    seek.addEventListener("input", function () {
      hold = true;
      var t = parseFloat(seek.value);
      if (!isFinite(t)) return;
      try {
        audio.currentTime = t;
      } catch (err) {}
      if (curEl) curEl.textContent = fmtTime(t);
    });
    seek.addEventListener("change", function () {
      hold = false;
      var t = parseFloat(seek.value);
      if (isFinite(t)) {
        try {
          audio.currentTime = t;
        } catch (err) {}
      }
      ui();
    });
    // lepaskan hold jika pointer selesai di luar
    seek.addEventListener("pointerup", function () {
      hold = false;
    });
    seek.addEventListener("touchend", function () {
      hold = false;
    });

    if (btnDl) {
      btnDl.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var u = src || audio.src;
        if (!u) return;
        fetch(u, { mode: "cors" })
          .then(function (r) {
            return r.blob();
          })
          .then(function (blob) {
            var a = document.createElement("a");
            var obj = URL.createObjectURL(blob);
            a.href = obj;
            a.download = "pesan-suara.webm";
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () {
              URL.revokeObjectURL(obj);
            }, 1000);
          })
          .catch(function () {
            window.open(u, "_blank", "noopener");
          });
      });
    }

    try {
      audio.load();
    } catch (e) {}
    ui();
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
