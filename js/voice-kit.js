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

  function playerHtml(opts) {
    opts = opts || {};
    var url = String(opts.url || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
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
      '<input class="sh-ap-seek" type="range" min="0" max="' + (dur > 0 ? dur : 1) + '" value="0" step="0.01" />' +
      "</div>" +
      (showDl ? '<button type="button" class="sh-ap-dl" aria-label="Unduh">⬇</button>' : "") +
      '<audio class="sh-ap-audio" preload="auto" playsinline src="' + url + '"></audio>' +
      (ttl ? '<div class="sh-ap-meta">' + ttl + "</div>" : "") +
      "</div>"
    );
  }

  function wirePlayers(root) {
    root = root || document;
    var list = root.querySelectorAll(".sh-ap, .sh-audio, .sh-voice-player, .chat-voice-player, .ann-voice-block");
    for (var i = 0; i < list.length; i++) {
      wireOne(list[i], true);
    }
    ensureDelegate();
  }

  var _delegated = false;
  function ensureDelegate() {
    if (_delegated) return;
    _delegated = true;
    document.addEventListener(
      "click",
      function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var playBtn = t.closest(".sh-ap-play");
        var stopBtn = t.closest(".sh-ap-stop");
        var dlBtn = t.closest(".sh-ap-dl");
        if (!playBtn && !stopBtn && !dlBtn) return;
        var box = (playBtn || stopBtn || dlBtn).closest(".sh-ap, .sh-voice-player, .chat-voice-player, .ann-voice-block");
        if (!box) return;
        if (!box._shApCtl) wireOne(box, true);
        var ctl = box._shApCtl;
        if (!ctl) return;
        e.preventDefault();
        e.stopPropagation();
        if (playBtn) ctl.toggle();
        else if (stopBtn) ctl.stop();
        else if (dlBtn) ctl.download();
      },
      true
    );
  }

  function wireOne(el, force) {
    if (!el) return;
    if (el._shApCtl && !force) return;

    var src =
      el.getAttribute("data-src") ||
      el.getAttribute("data-voice-url") ||
      "";
    var audio0 = el.querySelector("audio");
    if (!src && audio0) src = audio0.getAttribute("src") || audio0.src || "";
    src = String(src || "").trim();
    var dur0 = parseFloat(el.getAttribute("data-dur") || el.getAttribute("data-duration") || "");
    if (!isFinite(dur0) || dur0 <= 0) dur0 = 0;

    // Pastikan struktur sh-ap
    if (!el.classList.contains("sh-ap") || !el.querySelector(".sh-ap-seek") || !el.querySelector(".sh-ap-play")) {
      var ttlEl = el.querySelector(".sh-ap-meta, .sh-voice-ttl, .chat-voice-ttl");
      var ttl = ttlEl ? ttlEl.textContent : "";
      el.className = "sh-ap";
      if (src) el.setAttribute("data-src", src);
      if (dur0) el.setAttribute("data-dur", String(dur0));
      el.innerHTML =
        '<button type="button" class="sh-ap-play" aria-label="Putar">▶</button>' +
        '<button type="button" class="sh-ap-stop" aria-label="Stop">■</button>' +
        '<div class="sh-ap-body">' +
        '<div class="sh-ap-time"><span class="sh-ap-cur">00:00</span><span class="sh-ap-sep"> / </span><span class="sh-ap-dur">' +
        (dur0 ? fmtTime(dur0) : "00:00") +
        "</span></div>" +
        '<input class="sh-ap-seek" type="range" min="0" max="' + (dur0 > 0 ? dur0 : 1) + '" value="0" step="0.01" />' +
        "</div>" +
        '<button type="button" class="sh-ap-dl" aria-label="Unduh">⬇</button>' +
        '<audio class="sh-ap-audio" preload="auto" playsinline src="' +
        String(src).replace(/"/g, "&quot;") +
        '"></audio>' +
        (ttl ? '<div class="sh-ap-meta"></div>' : "");
      if (ttl) {
        var m = el.querySelector(".sh-ap-meta");
        if (m) m.textContent = ttl;
      }
    }

    var audio = el.querySelector("audio");
    var btnPlay = el.querySelector(".sh-ap-play");
    var btnStop = el.querySelector(".sh-ap-stop");
    var btnDl = el.querySelector(".sh-ap-dl");
    var seek = el.querySelector(".sh-ap-seek");
    var curEl = el.querySelector(".sh-ap-cur");
    var durEl = el.querySelector(".sh-ap-dur");
    if (!audio || !btnPlay) return;

    if (src && (!audio.getAttribute("src") || audio.getAttribute("src") !== src)) {
      try {
        audio.setAttribute("src", src);
        audio.src = src;
      } catch (e) {}
    }
    audio.preload = "auto";
    audio.setAttribute("playsinline", "");
    // jangan display:none ketat — beberapa browser susah play
    audio.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;";

    var known = dur0;
    var hold = false;
    var iv = null;

    function duration() {
      var d = audio.duration;
      if (isFinite(d) && d > 0 && d !== Infinity) return d;
      return known > 0 ? known : 0;
    }

    function paint() {
      var d = duration();
      var t = 0;
      try {
        t = audio.currentTime || 0;
      } catch (e) {}
      if (!isFinite(t)) t = 0;
      if (seek && d > 0 && !hold) {
        seek.min = 0;
        seek.max = d;
        seek.value = String(t);
      }
      if (curEl) curEl.textContent = fmtTime(t);
      if (durEl) durEl.textContent = d > 0 ? fmtTime(d) : "00:00";
      if (btnPlay) btnPlay.textContent = audio.paused ? "▶" : "❚❚";
    }

    function tickOn() {
      tickOff();
      iv = setInterval(function () {
        if (!audio.paused) paint();
        else tickOff();
      }, 100);
    }
    function tickOff() {
      if (iv) {
        clearInterval(iv);
        iv = null;
      }
    }

    // remove old listeners by cloning buttons if re-wiring
    if (force && el._shApCtl) {
      // keep same elements; handlers via ctl object
    }

    audio.addEventListener("loadedmetadata", function () {
      var d = audio.duration;
      if (isFinite(d) && d > 0 && d !== Infinity) {
        known = d;
        el.setAttribute("data-dur", String(d));
        if (seek) seek.max = d;
      }
      paint();
    });
    audio.addEventListener("timeupdate", paint);
    audio.addEventListener("play", function () {
      paint();
      tickOn();
    });
    audio.addEventListener("pause", function () {
      paint();
      tickOff();
    });
    audio.addEventListener("ended", function () {
      try {
        audio.currentTime = 0;
      } catch (e) {}
      paint();
      tickOff();
    });

    if (seek && !seek._shApBound) {
      seek._shApBound = true;
      seek.addEventListener("input", function () {
        hold = true;
        var t = parseFloat(seek.value);
        if (!isFinite(t)) return;
        try {
          audio.currentTime = t;
        } catch (e) {}
        if (curEl) curEl.textContent = fmtTime(t);
      });
      seek.addEventListener("change", function () {
        hold = false;
        var t = parseFloat(seek.value);
        if (isFinite(t)) {
          try {
            audio.currentTime = t;
          } catch (e) {}
        }
        paint();
      });
    }

    function doPlay() {
      if (!audio.getAttribute("src") && src) {
        audio.src = src;
      }
      document.querySelectorAll(".sh-ap audio").forEach(function (a) {
        if (a !== audio) {
          try {
            a.pause();
          } catch (e) {}
        }
      });
      var p = audio.play();
      if (p && p.then) {
        p.then(function () {
          paint();
          tickOn();
        }).catch(function (err) {
          console.warn("[SHVoice] play gagal:", err && err.message ? err.message : err);
          if (btnPlay) btnPlay.title = "Gagal: " + (err && err.message ? err.message : "error");
          paint();
        });
      } else {
        paint();
        tickOn();
      }
    }

    function toggle() {
      if (audio.paused) {
        if (audio.readyState < 2) {
          try {
            audio.load();
          } catch (e) {}
          var done = false;
          var onReady = function () {
            if (done) return;
            done = true;
            audio.removeEventListener("canplay", onReady);
            doPlay();
          };
          audio.addEventListener("canplay", onReady);
          setTimeout(function () {
            if (!done) {
              done = true;
              doPlay();
            }
          }, 500);
        } else {
          doPlay();
        }
      } else {
        audio.pause();
        paint();
      }
    }

    function stop() {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (e) {}
      paint();
      tickOff();
    }

    function download() {
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
    }

    el._shApCtl = { toggle: toggle, stop: stop, download: download, paint: paint, audio: audio };
    el._shApWired = true;

    try {
      audio.load();
    } catch (e) {}
    paint();
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
