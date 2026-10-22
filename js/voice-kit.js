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
  function playerHtml(opts) {
    opts = opts || {};
    var url = String(opts.url || "").replace(/"/g, "&quot;");
    var known = opts.duration != null && isFinite(Number(opts.duration)) ? Number(opts.duration) : null;
    var durLabel = known != null ? formatClock(known) : "0:00";
    var ttl = opts.ttlLabel ? String(opts.ttlLabel) : "";
    var dl = opts.downloadable !== false;
    return (
      '<div class="sh-audio" data-voice-url="' + url + '"' +
      (known != null ? ' data-duration="' + known + '"' : "") +
      ">" +
      '<div class="sh-audio-row">' +
      '<button type="button" class="sh-audio-btn sh-audio-play" data-voice-play title="Putar / jeda">▶</button>' +
      '<button type="button" class="sh-audio-btn sh-audio-stop" data-voice-stop title="Stop">⏹</button>' +
      '<div class="sh-audio-main">' +
      '<div class="sh-audio-times"><span data-voice-cur>0:00</span> / <span data-voice-dur>' + durLabel + "</span></div>" +
      '<input type="range" class="sh-audio-seek" data-voice-seek min="0" max="' +
      (known != null ? known : 1) +
      '" value="0" step="any" />' +
      "</div>" +
      (dl
        ? '<button type="button" class="sh-audio-btn sh-audio-dl" data-voice-dl title="Unduh">⬇</button>'
        : "") +
      "</div>" +
      '<audio preload="metadata" playsinline src="' + url + '"></audio>' +
      (ttl ? '<div class="sh-audio-ttl">' + ttl + "</div>" : "") +
      "</div>"
    );
  }

  function fmtClockSimple(sec) {
    if (!isFinite(sec) || sec < 0) return "0:00";
    sec = Math.floor(sec);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  /**
   * Wire player klasik di root.
   * Pola populer: seek.max = duration (detik), seek.value = currentTime.
   */
  function wirePlayers(root) {
    if (!root) return;
    var nodes = root.querySelectorAll(".sh-audio, .sh-voice-player, .chat-voice-player, .ann-voice-block");
    for (var i = 0; i < nodes.length; i++) {
      wireClassicPlayer(nodes[i], root);
    }
  }

  function wireClassicPlayer(box, root) {
    if (!box || box.getAttribute("data-sh-audio") === "1") return;
    box.setAttribute("data-sh-audio", "1");

    var audio = box.querySelector("audio");
    var url = box.getAttribute("data-voice-url") || "";
    if (!audio) {
      if (!url) return;
      audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.setAttribute("playsinline", "");
      audio.src = url;
      box.appendChild(audio);
    } else {
      if (!url) url = audio.getAttribute("src") || audio.src || "";
      audio.preload = "metadata";
      audio.setAttribute("playsinline", "");
    }

    // Upgrade struktur lama → .sh-audio jika perlu
    var playBtn = box.querySelector("[data-voice-play], .sh-audio-play, .sh-voice-play, .chat-voice-play");
    var stopBtn = box.querySelector("[data-voice-stop], .sh-audio-stop, .sh-voice-stop");
    var seek = box.querySelector("[data-voice-seek], .sh-audio-seek, .sh-voice-seek");
    var curEl = box.querySelector("[data-voice-cur]");
    var durEl = box.querySelector("[data-voice-dur]");
    var timeLegacy = box.querySelector("[data-voice-time], .sh-voice-time, .chat-voice-time");
    var dlBtn = box.querySelector("[data-voice-dl], .sh-audio-dl, .sh-voice-dl");

    // Jika seek tidak ada (player lama), bangun ulang UI di dalam box
    if (!seek || !playBtn) {
      var known0 = parseFloat(box.getAttribute("data-duration") || "");
      if (!isFinite(known0) || known0 <= 0) known0 = null;
      var ttlNode = box.querySelector(".sh-voice-ttl, .sh-audio-ttl, .chat-voice-ttl");
      var ttlHtml = ttlNode ? ttlNode.outerHTML : "";
      box.className = "sh-audio";
      box.innerHTML =
        '<div class="sh-audio-row">' +
        '<button type="button" class="sh-audio-btn sh-audio-play" data-voice-play title="Putar / jeda">▶</button>' +
        '<button type="button" class="sh-audio-btn sh-audio-stop" data-voice-stop title="Stop">⏹</button>' +
        '<div class="sh-audio-main">' +
        '<div class="sh-audio-times"><span data-voice-cur>0:00</span> / <span data-voice-dur>' +
        (known0 != null ? fmtClockSimple(known0) : "0:00") +
        "</span></div>" +
        '<input type="range" class="sh-audio-seek" data-voice-seek min="0" max="' +
        (known0 != null ? known0 : 1) +
        '" value="0" step="any" />' +
        "</div>" +
        '<button type="button" class="sh-audio-btn sh-audio-dl" data-voice-dl title="Unduh">⬇</button>' +
        "</div>" +
        '<audio preload="metadata" playsinline src="' +
        String(url).replace(/"/g, "&quot;") +
        '"></audio>' +
        ttlHtml;
      audio = box.querySelector("audio");
      playBtn = box.querySelector("[data-voice-play]");
      stopBtn = box.querySelector("[data-voice-stop]");
      seek = box.querySelector("[data-voice-seek]");
      curEl = box.querySelector("[data-voice-cur]");
      durEl = box.querySelector("[data-voice-dur]");
      dlBtn = box.querySelector("[data-voice-dl]");
      timeLegacy = null;
    }

    var known = parseFloat(box.getAttribute("data-duration") || "");
    if (!isFinite(known) || known <= 0) known = null;
    var dragging = false;

    function duration() {
      var d = audio.duration;
      if (isFinite(d) && d > 0 && d !== Infinity) return d;
      if (known != null && known > 0) return known;
      return 0;
    }

    function paint() {
      var dur = duration();
      var cur = 0;
      try {
        cur = audio.currentTime || 0;
      } catch (e) {
        cur = 0;
      }
      if (!isFinite(cur)) cur = 0;
      if (dur > 0 && !dragging) {
        seek.min = 0;
        seek.max = dur;
        seek.value = cur;
      }
      var curTxt = fmtClockSimple(cur);
      var durTxt = dur > 0 ? fmtClockSimple(dur) : "0:00";
      if (curEl) curEl.textContent = curTxt;
      if (durEl) durEl.textContent = durTxt;
      if (timeLegacy) timeLegacy.textContent = curTxt + " / " + durTxt;
    }

    function setPlayingUi(on) {
      if (!playBtn) return;
      playBtn.textContent = on ? "❚❚" : "▶";
      playBtn.classList.toggle("is-playing", !!on);
    }

    // metadata → set max slider ke durasi nyata
    audio.addEventListener("loadedmetadata", function () {
      var d = audio.duration;
      if (isFinite(d) && d > 0 && d !== Infinity) {
        known = d;
        box.setAttribute("data-duration", String(d));
        seek.max = d;
      }
      paint();
    });
    audio.addEventListener("durationchange", function () {
      var d = audio.duration;
      if (isFinite(d) && d > 0 && d !== Infinity) {
        known = d;
        seek.max = d;
      }
      paint();
    });

    // inti real-time: timeupdate (standar semua player)
    audio.addEventListener("timeupdate", paint);

    audio.addEventListener("play", function () {
      setPlayingUi(true);
    });
    audio.addEventListener("pause", function () {
      setPlayingUi(false);
      paint();
    });
    audio.addEventListener("ended", function () {
      setPlayingUi(false);
      try {
        audio.currentTime = 0;
      } catch (e) {}
      paint();
    });

    // cadangan: interval saat playing (kalau timeupdate jarang di browser tertentu)
    var tick = null;
    function startTick() {
      stopTick();
      tick = setInterval(function () {
        if (!audio.paused && !audio.ended) paint();
        else stopTick();
      }, 200);
    }
    function stopTick() {
      if (tick) {
        clearInterval(tick);
        tick = null;
      }
    }
    audio.addEventListener("play", startTick);
    audio.addEventListener("pause", stopTick);
    audio.addEventListener("ended", stopTick);

    if (playBtn) {
      playBtn.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (audio.paused) {
          // jeda player lain di root
          var scope = root || document;
          var all = scope.querySelectorAll(".sh-audio audio, .sh-voice-player audio, .chat-voice-player audio, audio.sh-voice-audio");
          for (var i = 0; i < all.length; i++) {
            if (all[i] !== audio) {
              try {
                all[i].pause();
              } catch (e) {}
            }
          }
          var p = audio.play();
          setPlayingUi(true);
          if (p && p.catch) {
            p.catch(function () {
              setPlayingUi(false);
            });
          }
        } else {
          audio.pause();
          setPlayingUi(false);
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
        setPlayingUi(false);
        paint();
      });
    }

    // seek: input = geser real-time (pola standar)
    if (seek) {
      seek.addEventListener("pointerdown", function () {
        dragging = true;
      });
      seek.addEventListener("mousedown", function () {
        dragging = true;
      });
      seek.addEventListener("touchstart", function () {
        dragging = true;
      }, { passive: true });

      seek.addEventListener("input", function () {
        dragging = true;
        var t = parseFloat(seek.value);
        if (!isFinite(t)) return;
        try {
          audio.currentTime = t;
        } catch (e) {}
        // update angka segera saat digeser
        var dur = duration();
        var curTxt = fmtClockSimple(t);
        var durTxt = dur > 0 ? fmtClockSimple(dur) : "0:00";
        if (curEl) curEl.textContent = curTxt;
        if (durEl) durEl.textContent = durTxt;
        if (timeLegacy) timeLegacy.textContent = curTxt + " / " + durTxt;
      });

      function endDrag() {
        dragging = false;
        var t = parseFloat(seek.value);
        if (isFinite(t)) {
          try {
            audio.currentTime = t;
          } catch (e) {}
        }
        paint();
      }
      seek.addEventListener("pointerup", endDrag);
      seek.addEventListener("mouseup", endDrag);
      seek.addEventListener("touchend", endDrag);
      seek.addEventListener("change", endDrag);
    }

    if (dlBtn) {
      dlBtn.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var u = url || audio.src;
        if (!u) return;
        dlBtn.disabled = true;
        fetch(u, { mode: "cors", credentials: "omit" })
          .then(function (r) {
            if (!r.ok) throw new Error("fail");
            return r.blob();
          })
          .then(function (blob) {
            var type = blob.type || "audio/webm";
            var ext = "webm";
            if (type.indexOf("ogg") >= 0) ext = "ogg";
            else if (type.indexOf("mp4") >= 0) ext = "m4a";
            else if (type.indexOf("mpeg") >= 0) ext = "mp3";
            var obj = URL.createObjectURL(blob);
            var a = document.createElement("a");
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
            window.open(u, "_blank", "noopener");
          })
          .finally(function () {
            dlBtn.disabled = false;
          });
      });
    }

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
