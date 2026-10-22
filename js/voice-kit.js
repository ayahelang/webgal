/**
 * SHVoice — standar rekam & putar pesan suara (shared)
 * - Rekam: timer MM:SS + waveform meter
 * - Putar: play/pause, seek slider, unduh
 */
(function (global) {
  "use strict";

  function formatClock(sec) {
    if (!isFinite(sec) || sec < 0) return "--:--";
    sec = Math.floor(sec);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function pickMime() {
    const cands = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
    for (let i = 0; i < cands.length; i++) {
      try {
        if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(cands[i])) {
          return cands[i];
        }
      } catch (e) {}
    }
    return "";
  }

  /**
   * Recorder controller bound to existing bar elements.
   * @param {object} opts
   * @param {HTMLElement} opts.bar - container (shown/hidden)
   * @param {HTMLElement} [opts.timerEl]
   * @param {HTMLCanvasElement} [opts.canvas]
   * @param {number} [opts.maxMs=180000]
   * @param {function} [opts.onTick]
   * @param {function} [opts.onStop] - (blob, durationSec)
   * @param {function} [opts.onError]
   */
  function createRecorder(opts) {
    opts = opts || {};
    const bar = opts.bar;
    const timerEl = opts.timerEl;
    const canvas = opts.canvas;
    const maxMs = opts.maxMs != null ? opts.maxMs : 180000;

    let rec = null;
    let chunks = [];
    let stream = null;
    let timer = null;
    let startedAt = 0;
    let audioCtx = null;
    let analyser = null;
    let meterRaf = 0;
    let recording = false;

    function stopMeter() {
      if (meterRaf) cancelAnimationFrame(meterRaf);
      meterRaf = 0;
      if (audioCtx) {
        try {
          audioCtx.close();
        } catch (e) {}
        audioCtx = null;
      }
      analyser = null;
      if (canvas) {
        try {
          const ctx = canvas.getContext("2d");
          ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);
        } catch (e) {}
      }
    }

    function startMeter(mediaStream) {
      stopMeter();
      if (!canvas || !mediaStream) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC();
        if (audioCtx.state === "suspended") audioCtx.resume();
        const src = audioCtx.createMediaStreamSource(mediaStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const ctx = canvas.getContext("2d");
        const bars = 22;
        function draw() {
          meterRaf = requestAnimationFrame(draw);
          if (!analyser) return;
          analyser.getByteFrequencyData(data);
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);
          const gap = 2;
          const bw = (w - gap * (bars - 1)) / bars;
          for (let i = 0; i < bars; i++) {
            const idx = Math.min(data.length - 1, 4 + Math.floor((i * data.length * 0.45) / bars));
            const v = data[idx] / 255;
            const bh = Math.max(2, v * (h - 2));
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
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
      } catch (e) {
        if (opts.onError) opts.onError(new Error("Izin mikrofon ditolak"));
        return;
      }
      chunks = [];
      const mime = pickMime();
      try {
        rec = mime
          ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 128000 })
          : new MediaRecorder(stream);
      } catch (e) {
        try {
          rec = new MediaRecorder(stream);
        } catch (e2) {
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
        const elapsed = Date.now() - startedAt;
        setTimer(elapsed);
        if (elapsed >= maxMs) stop(true);
      }, 200);
      startMeter(stream);
    }

    function cleanupStream() {
      if (stream) {
        try {
          stream.getTracks().forEach(function (tr) {
            tr.stop();
          });
        } catch (e) {}
        stream = null;
      }
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
        const r = rec;
        const type = r.mimeType || "audio/webm";
        const elapsed = startedAt ? Date.now() - startedAt : 0;
        r.onstop = function () {
          const blob = chunks.length ? new Blob(chunks, { type: type }) : null;
          chunks = [];
          rec = null;
          recording = false;
          cleanupStream();
          if (timer) clearInterval(timer);
          timer = null;
          stopMeter();
          if (bar) bar.hidden = true;
          const durSec = elapsed > 300 ? elapsed / 1000 : null;
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

    function cancel() {
      return stop(false);
    }

    function isRecording() {
      return recording;
    }

    function destroy() {
      cancel();
    }

    return {
      start: start,
      stop: function () {
        return stop(true);
      },
      cancel: cancel,
      isRecording: isRecording,
      destroy: destroy,
      formatClock: formatClock,
    };
  }

  /**
   * HTML standar player
   */
  function playerHtml(opts) {
    opts = opts || {};
    const url = String(opts.url || "").replace(/"/g, "&quot;");
    const known = opts.duration != null && isFinite(opts.duration) ? Number(opts.duration) : null;
    const durLabel = known != null ? formatClock(known) : "--:--";
    const ttl = opts.ttlLabel ? String(opts.ttlLabel) : "";
    const dl = opts.downloadable !== false;
    return (
      '<div class="sh-voice-player"' +
      (known != null ? ' data-duration="' + known + '"' : "") +
      ' data-voice-url="' +
      url +
      '">' +
      '<button type="button" class="sh-voice-play" data-voice-play title="Putar/jeda">▶</button>' +
      '<div class="sh-voice-track">' +
      '<span class="sh-voice-time" data-voice-time>00:00 / ' +
      durLabel +
      "</span>" +
      '<input type="range" class="sh-voice-seek" min="0" max="1000" value="0" step="1" aria-label="Posisi audio" />' +
      "</div>" +
      (dl
        ? '<a class="sh-voice-dl" href="' +
          url +
          '" download="pesan-suara" title="Unduh suara" target="_blank" rel="noopener">⬇</a>'
        : "") +
      '<audio class="sh-voice-audio" preload="metadata" src="' +
      url +
      '"></audio>' +
      (ttl ? '<small class="sh-voice-ttl">' + ttl + "</small>" : "") +
      "</div>"
    );
  }

  /**
   * Wire all .sh-voice-player and legacy .chat-voice-player under root
   */
  function wirePlayers(root) {
    if (!root) return;
    const nodes = root.querySelectorAll(".sh-voice-player, .chat-voice-player, .ann-voice-block");
    nodes.forEach(function (wrap) {
      if (wrap.dataset.shVoiceWired) return;
      wrap.dataset.shVoiceWired = "1";

      let audio = wrap.querySelector("audio");
      let btn = wrap.querySelector("[data-voice-play], .sh-voice-play, .chat-voice-play");
      let timeEl = wrap.querySelector("[data-voice-time], .sh-voice-time, .chat-voice-time");
      let seek = wrap.querySelector(".sh-voice-seek");
      const srcUrl = wrap.getAttribute("data-voice-url") || (audio && audio.getAttribute("src")) || "";

      // Upgrade legacy player DOM if missing seek
      if (audio && !seek) {
        const track = document.createElement("div");
        track.className = "sh-voice-track";
        if (timeEl) track.appendChild(timeEl);
        else {
          timeEl = document.createElement("span");
          timeEl.className = "sh-voice-time";
          timeEl.setAttribute("data-voice-time", "");
          timeEl.textContent = "00:00 / --:--";
          track.appendChild(timeEl);
        }
        seek = document.createElement("input");
        seek.type = "range";
        seek.className = "sh-voice-seek";
        seek.min = "0";
        seek.max = "1000";
        seek.value = "0";
        seek.step = "1";
        seek.setAttribute("aria-label", "Posisi audio");
        track.appendChild(seek);
        if (btn && btn.nextSibling) wrap.insertBefore(track, btn.nextSibling);
        else wrap.appendChild(track);

        if (!wrap.querySelector(".sh-voice-dl") && srcUrl) {
          const a = document.createElement("a");
          a.className = "sh-voice-dl";
          a.href = srcUrl;
          a.download = "pesan-suara";
          a.title = "Unduh suara";
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = "⬇";
          wrap.appendChild(a);
        }
        wrap.classList.add("sh-voice-player");
      }

      if (!audio) return;
      // legacy plain audio only
      if (!btn) {
        audio.controls = true;
        audio.style.display = "block";
        return;
      }

      let known = parseFloat(wrap.getAttribute("data-duration") || "");
      if (!isFinite(known)) known = null;
      let seeking = false;

      function totalDur() {
        if (known != null) return known;
        const d = audio.duration;
        if (isFinite(d) && d > 0 && d !== Infinity) return d;
        return null;
      }

      function renderTime() {
        const dur = totalDur();
        const cur = audio.currentTime || 0;
        if (timeEl) timeEl.textContent = formatClock(cur) + " / " + (dur != null ? formatClock(dur) : "--:--");
        if (seek && !seeking && dur != null && dur > 0) {
          seek.value = String(Math.round((cur / dur) * 1000));
        }
      }

      audio.addEventListener("loadedmetadata", function () {
        const d = audio.duration;
        if (known == null && isFinite(d) && d > 0 && d !== Infinity) {
          known = d;
          wrap.setAttribute("data-duration", String(known));
        }
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
          // pause others in same root/document
          const scope = root || document;
          scope.querySelectorAll("audio.sh-voice-audio, audio.chat-voice-audio").forEach(function (a) {
            if (a !== audio) {
              try {
                a.pause();
              } catch (e) {}
            }
          });
          scope.querySelectorAll("[data-voice-play], .sh-voice-play, .chat-voice-play").forEach(function (b) {
            if (b !== btn) b.textContent = "▶";
          });
          audio
            .play()
            .then(function () {
              btn.textContent = "❚❚";
            })
            .catch(function () {
              btn.textContent = "▶";
            });
        } else {
          audio.pause();
          btn.textContent = "▶";
        }
      });

      if (seek) {
        seek.addEventListener("pointerdown", function () {
          seeking = true;
        });
        seek.addEventListener("pointerup", function () {
          seeking = false;
        });
        seek.addEventListener("input", function () {
          const dur = totalDur();
          if (dur == null || dur <= 0) return;
          const t = (Number(seek.value) / 1000) * dur;
          try {
            audio.currentTime = t;
          } catch (e) {}
          renderTime();
        });
      }

      try {
        audio.load();
      } catch (e) {}
      renderTime();
    });
  }

  /** Standard recorder bar HTML */
  function recorderBarHtml(idPrefix) {
    const p = idPrefix || "shv";
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
    const timerEl = bar.querySelector("[data-sh-voice-timer], .sh-voice-timer, .chat-voice-timer");
    const canvas = bar.querySelector("[data-sh-voice-meter], .sh-voice-meter, .chat-voice-meter");
    const ctl = createRecorder({
      bar: bar,
      timerEl: timerEl,
      canvas: canvas,
      onStop: handlers.onStop,
      onError: handlers.onError,
      maxMs: handlers.maxMs,
    });
    const stopBtn = bar.querySelector("[data-sh-voice-stop], .sh-voice-rec-stop");
    const cancelBtn = bar.querySelector("[data-sh-voice-cancel], .sh-voice-rec-cancel");
    if (stopBtn)
      stopBtn.addEventListener("click", function () {
        ctl.stop();
      });
    if (cancelBtn)
      cancelBtn.addEventListener("click", function () {
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
