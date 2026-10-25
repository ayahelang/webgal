/**
 * SHAudioMixer — multi-track (max 8)
 * Master timeline + playhead, volume & reverb per track,
 * overdub offset, panel draggable, Simpan WAV/WebM + Kirim (WebM ke chat).
 */
(function (global) {
  "use strict";
  var MAX_TRACKS = 8;

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) return "0:00";
    sec = Math.floor(sec);
    return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
  }

  /** Parse "m:ss", "mm:ss", "ss", or number → seconds (float). Invalid → NaN */
  function parseTime(str) {
    if (str == null) return NaN;
    str = String(str).trim().replace(",", ".");
    if (!str) return NaN;
    if (/^\d+(\.\d+)?$/.test(str)) return Math.max(0, parseFloat(str));
    var m = str.match(/^(\d+)\s*:\s*(\d{1,2})(?:\s*:\s*(\d{1,2}(?:\.\d+)?))?$/);
    if (m) {
      if (m[3] != null) {
        // h:m:s
        return Math.max(0, (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]));
      }
      return Math.max(0, (+m[1]) * 60 + (+m[2]));
    }
    return NaN;
  }

  function encodeWav(audioBuffer) {
    var numCh = audioBuffer.numberOfChannels;
    var sampleRate = audioBuffer.sampleRate;
    var samples = audioBuffer.length;
    var bytesPerSample = 2;
    var blockAlign = numCh * bytesPerSample;
    var dataSize = samples * blockAlign;
    var buffer = new ArrayBuffer(44 + dataSize);
    var view = new DataView(buffer);
    function str(o, s) {
      for (var i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
    }
    str(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    str(8, "WAVE");
    str(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numCh, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    str(36, "data");
    view.setUint32(40, dataSize, true);
    var offset = 44;
    var chData = [];
    for (var c = 0; c < numCh; c++) chData.push(audioBuffer.getChannelData(c));
    for (var i = 0; i < samples; i++) {
      for (var c = 0; c < numCh; c++) {
        var s = Math.max(-1, Math.min(1, chData[c][i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
      }
    }
    return new Blob([buffer], { type: "audio/wav" });
  }

  /** Impulse response sederhana untuk reverb (tanpa file eksternal) */
  function makeImpulse(ctx, seconds, decay) {
    var rate = ctx.sampleRate;
    var len = Math.floor(rate * (seconds || 1.8));
    var impulse = ctx.createBuffer(2, len, rate);
    decay = decay || 2.2;
    for (var c = 0; c < 2; c++) {
      var data = impulse.getChannelData(c);
      for (var i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return impulse;
  }


  function floatTo16(ch) {
    var out = new Int16Array(ch.length);
    for (var i = 0; i < ch.length; i++) {
      var s = Math.max(-1, Math.min(1, ch[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  /** Encode AudioBuffer → MP3 via lamejs (vendor/lame.min.js) */
  function encodeMp3(audioBuffer, kbps) {
    if (typeof lamejs === "undefined" || !lamejs.Mp3Encoder) {
      throw new Error("lamejs belum dimuat — muat js/vendor/lame.min.js");
    }
    kbps = kbps || 128;
    var numCh = audioBuffer.numberOfChannels >= 2 ? 2 : 1;
    var sr = audioBuffer.sampleRate;
    var enc = new lamejs.Mp3Encoder(numCh, sr, kbps);
    var left = floatTo16(audioBuffer.getChannelData(0));
    var right =
      numCh > 1
        ? floatTo16(audioBuffer.getChannelData(1))
        : null;
    var block = 1152;
    var parts = [];
    for (var i = 0; i < left.length; i += block) {
      var l = left.subarray(i, i + block);
      var buf;
      if (numCh === 1) {
        buf = enc.encodeBuffer(l);
      } else {
        var r = right.subarray(i, i + block);
        buf = enc.encodeBuffer(l, r);
      }
      if (buf && buf.length) parts.push(buf);
    }
    var end = enc.flush();
    if (end && end.length) parts.push(end);
    return new Blob(parts, { type: "audio/mpeg" });
  }

  /**
   * Render AudioBuffer → WebM/Opus lewat MediaRecorder (cocok untuk chat, jauh lebih kecil dari WAV).
   * Browser tidak punya encoder MP3 native tanpa library.
   */
  function bufferToCompressed(audioBuffer) {
    return new Promise(function (resolve, reject) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        var ctx = new AC();
        var dest = ctx.createMediaStreamDestination();
        var src = ctx.createBufferSource();
        src.buffer = audioBuffer;
        src.connect(dest);
        // beberapa browser butuh juga ke destination agar clock jalan
        var silent = ctx.createGain();
        silent.gain.value = 0;
        src.connect(silent);
        silent.connect(ctx.destination);

        var mime = "";
        var candidates = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/ogg;codecs=opus",
        ];
        for (var i = 0; i < candidates.length; i++) {
          try {
            if (MediaRecorder.isTypeSupported(candidates[i])) {
              mime = candidates[i];
              break;
            }
          } catch (e) {}
        }
        var chunks = [];
        var rec = mime
          ? new MediaRecorder(dest.stream, { mimeType: mime, audioBitsPerSecond: 128000 })
          : new MediaRecorder(dest.stream);
        rec.ondataavailable = function (ev) {
          if (ev.data && ev.data.size) chunks.push(ev.data);
        };
        rec.onerror = function (e) {
          try {
            ctx.close();
          } catch (err) {}
          reject(e.error || e);
        };
        rec.onstop = function () {
          var type = rec.mimeType || mime || "audio/webm";
          var blob = new Blob(chunks, { type: type });
          try {
            ctx.close();
          } catch (err) {}
          var ext = /mp4|m4a/i.test(type) ? "m4a" : /ogg/i.test(type) ? "ogg" : "webm";
          resolve({ blob: blob, mime: type, ext: ext });
        };
        rec.start(200);
        src.start(0);
        var durMs = Math.ceil(audioBuffer.duration * 1000) + 120;
        setTimeout(function () {
          try {
            if (rec.state !== "inactive") rec.stop();
          } catch (e) {
            reject(e);
          }
        }, durMs);
      } catch (e) {
        reject(e);
      }
    });
  }

  function decodeBlob(ctx, blob) {
    return blob.arrayBuffer().then(function (ab) {
      return ctx.decodeAudioData(ab.slice(0));
    });
  }

  function open(opts) {
    opts = opts || {};
    var onExport = opts.onExport || null;
    var context = opts.context || (onExport ? "chat" : "generic");
    var sendLabel =
      context === "announce"
        ? "Kirim ke pengumuman"
        : context === "chat"
          ? "Kirim ke chat"
          : onExport
            ? "Kirim hasil mix"
            : null;

    var root = document.getElementById("shAudioMixerRoot");
    if (root) {
      try {
        root.remove();
      } catch (e) {}
      root = null;
    }
    root = document.createElement("div");
    root.id = "shAudioMixerRoot";
    root.className = "amx-root";
    root.innerHTML =
      '<div class="amx-backdrop" data-amx="close"></div>' +
      '<div class="amx-panel" data-amx-panel role="dialog" aria-label="Audio Mixer">' +
      '  <header class="amx-head amx-drag" data-amx-drag>' +
      "    <strong>Audio Mixer</strong>" +
      '    <span class="muted amx-sub">Max 8 · geser judul untuk pindah</span>' +
      '    <a class="btn btn-ghost amx-sm amx-promo" href="https://mixer.silverhawk.web.id" target="_blank" rel="noopener noreferrer" data-amx="promo" title="Buka Silverhawk Audio Mixer — aplikasi web full (multi-track, efek, export pro). Pengembangan lanjut dari panel ini.">🎛 Full Mixer</a>' +
      '    <button type="button" class="btn btn-ghost amx-x" data-amx="close" title="Tutup">✕</button>' +
      "  </header>" +
      '  <div class="amx-toolbar">' +
      '    <button type="button" class="btn amx-sm amx-btn-rec" data-amx="rec" title="Rekam / Stop">● Rekam</button>' +
      '    <button type="button" class="btn btn-ghost amx-sm" data-amx="stop-rec" hidden>■ Stop</button>' +
      '    <label class="btn btn-ghost amx-sm amx-upload">⬆ File<input type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm" hidden data-amx="file"></label>' +
      '    <label class="amx-master-lab" title="Master / Gain — dorong di atas 100% untuk lebih nyaring">' +
      '      <span>Master</span>' +
      '      <input type="range" min="0" max="300" value="100" data-amx="master">' +
      '      <span data-amx="master-val">100%</span>' +
      "    </label>" +
      '    <button type="button" class="btn btn-ghost amx-sm amx-icon-btn" data-amx="mute-all" title="Mute semua track — senyapkan semua track" aria-label="Mute semua track">🔇</button>' +
      '    <button type="button" class="btn btn-ghost amx-sm amx-icon-btn" data-amx="unmute-all" title="Unmute semua track — aktifkan suara semua track" aria-label="Unmute semua track">🔊</button>' +
      "  </div>" +
      '  <div class="amx-transport">' +
      '    <button type="button" class="btn btn-ghost amx-nav" data-amx="to-start" title="Awal">⏮</button>' +
      '    <button type="button" class="btn btn-ghost amx-nav" data-amx="skip-back" title="-5 dtk">⏪</button>' +
      '    <button type="button" class="btn btn-ghost amx-nav amx-nav-play" data-amx="play" title="Play">▶</button>' +
      '    <button type="button" class="btn btn-ghost amx-nav" data-amx="stop" title="Stop">■</button>' +
      '    <button type="button" class="btn btn-ghost amx-nav" data-amx="skip-fwd" title="+5 dtk">⏩</button>' +
      '    <button type="button" class="btn btn-ghost amx-nav" data-amx="to-end" title="Akhir">⏭</button>' +
      '    <div class="amx-rec-compact" data-amx="recbar" hidden title="Level mic saat rekam">' +
      '      <span class="chat-voice-dot amx-dot" aria-hidden="true"></span>' +
      '      <span class="amx-timer" data-amx="timer">00:00</span>' +
      '      <canvas class="amx-meter" data-amx="meter" width="56" height="14" aria-hidden="true"></canvas>' +
      '      <span class="amx-rec-offset muted" data-amx="recoffset"></span>' +
      "    </div>" +
      "  </div>" +
      '  <div class="amx-region-tools">' +
      '    <button type="button" class="btn btn-ghost amx-xs" data-amx="mark-in" title="Set titik awal export di playhead">Mark In</button>' +
      '    <button type="button" class="btn btn-ghost amx-xs" data-amx="mark-out" title="Set titik akhir export di playhead">Mark Out</button>' +
      '    <button type="button" class="btn btn-ghost amx-xs" data-amx="region-reset" title="Reset region ke seluruh durasi">Reset</button>' +
      '    <span class="muted amx-region-label" data-amx="region-label">Region: penuh</span>' +
      "  </div>" +
      '  <div class="amx-scrub-row">' +
      '    <span class="amx-clock" data-amx="clock">0:00</span>' +
      '    <div class="amx-timeline amx-timeline-wide" data-amx="timeline" title="Klik/geser seek · tarik pegangan In/Out">' +
      '      <div class="amx-region" data-amx="region"></div>' +
      '      <div class="amx-timeline-fill" data-amx="tfill"></div>' +
      '      <div class="amx-handle amx-handle-in" data-amx="handle-in" title="Awal region"></div>' +
      '      <div class="amx-handle amx-handle-out" data-amx="handle-out" title="Akhir region"></div>' +
      '      <div class="amx-timeline-head" data-amx="thead"></div>' +
      "    </div>" +
      '    <span class="amx-clock amx-clock-end" data-amx="clock-end">0:00</span>' +
      "  </div>" +
      '  <div class="amx-status muted" data-amx="status">Rekam / unggah track.</div>' +
      '  <div class="amx-tracks" data-amx="tracks"></div>' +
      '  <footer class="amx-foot">' +
      '    <button type="button" class="btn btn-ghost amx-sm" data-amx="close">Batal</button>' +
      '    <button type="button" class="btn btn-ghost amx-sm" data-amx="download-wav" title="Kualitas penuh">⬇ WAV</button>' +
      '    <button type="button" class="btn btn-ghost amx-sm" data-amx="download-mp3" title="MP3 128kbps (lamejs)">⬇ MP3</button>' +
      '    <button type="button" class="btn btn-ghost amx-sm" data-amx="download-webm" title="WebM/Opus kompres">⬇ WebM</button>' +
      '    <button type="button" class="btn btn-primary amx-sm" data-amx="export" hidden>Kirim</button>' +
      "  </footer>" +
      "</div>";
    document.body.appendChild(root);

    var tracks = [];
    var audioCtx = null;
    var playing = [];
    var liveGains = []; // {gain, wetGain?} for live volume while playing
    var masterGainNode = null;
    var masterGain = 1; // 1 = 100%; boleh >1 (boost/gain)
    var mediaRec = null;
    var mediaStream = null;
    var recChunks = [];
    var statusEl = root.querySelector("[data-amx=status]");
    var listEl = root.querySelector("[data-amx=tracks]");
    var btnRec = root.querySelector('[data-amx="rec"]');
    var btnStopRec = root.querySelector('[data-amx="stop-rec"]');
    var btnExport = root.querySelector('[data-amx="export"]');
    var recBar = root.querySelector("[data-amx=recbar]");
    var timerEl = root.querySelector("[data-amx=timer]");
    var recOffsetEl = root.querySelector("[data-amx=recoffset]");
    var canvas = root.querySelector("[data-amx=meter]");
    var clockEl = root.querySelector("[data-amx=clock]");
    var clockEndEl = root.querySelector("[data-amx=clock-end]");
    var timelineEl = root.querySelector("[data-amx=timeline]");
    var tfillEl = root.querySelector("[data-amx=tfill]");
    var theadEl = root.querySelector("[data-amx=thead]");
    var panelEl = root.querySelector("[data-amx-panel]");
    var regionLabelEl = root.querySelector("[data-amx=region-label]");
    var regionEl = root.querySelector("[data-amx=region]");
    var handleInEl = root.querySelector("[data-amx=handle-in]");
    var handleOutEl = root.querySelector("[data-amx=handle-out]");
    var meterRaf = 0;
    var meterAnalyser = null;
    var meterSource = null;
    var recTimer = null;
    var recStartedAt = 0;
    var transportRaf = 0;
    var playhead = 0;
    var isPlaying = false;
    var playStartedAtCtx = 0;
    var playStartedAtHead = 0;
    var isRecording = false;
    var recOffsetSec = 0;
    // Region export (In/Out) — default seluruh durasi
    // (regionLabelEl / regionEl / handle* sudah di-query di atas)
    var regionIn = 0;
    var regionOut = null; // null = maxDur()
    // Chat: target kecil & encode offline cepat (bukan MediaRecorder real-time)
    var CHAT_SR = 22050;
    var CHAT_KBPS = 48;
    var CHAT_MAX_SEC = 120; // ~48kbps mono ≈ 0.7 MB / 2 mnt
    var CHAT_MAX_BYTES = 1.8 * 1024 * 1024;
    var sharedConvolver = null;
    var sharedImpulse = null;

    if (btnExport) {
      if (sendLabel && onExport) {
        btnExport.hidden = false;
        btnExport.textContent = sendLabel;
      } else {
        btnExport.hidden = true;
      }
    }
    // Indikator rekam harus diam sampai user tekan Rekam
    if (recBar) {
      recBar.hidden = true;
      recBar.setAttribute("hidden", "");
    }
    if (btnStopRec) btnStopRec.hidden = true;
    if (btnRec) {
      btnRec.hidden = false;
      btnRec.textContent = "● Rekam";
      btnRec.classList.add("amx-btn-rec");
      btnRec.classList.remove("is-recording");
    }

    function ensureCtx() {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC();
      }
      if (audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    }

    function ensureReverb() {
      ensureCtx();
      if (!sharedConvolver) {
        sharedConvolver = audioCtx.createConvolver();
        sharedImpulse = makeImpulse(audioCtx, 1.6, 2.4);
        sharedConvolver.buffer = sharedImpulse;
        sharedConvolver.connect(ensureMasterGain());
      }
      return sharedConvolver;
    }

    function setStatus(t) {
      if (statusEl) statusEl.textContent = t;
    }

    function maxDur() {
      var m = 0;
      tracks.forEach(function (t) {
        if (!t.buffer) return;
        var end = (t.offset || 0) + t.buffer.duration;
        if (end > m) m = end;
      });
      return m;
    }

    function anySolo() {
      for (var i = 0; i < tracks.length; i++) {
        if (tracks[i].solo) return true;
      }
      return false;
    }

    /** Track aktif untuk play/mix: hormati mute + solo */
    function isTrackActive(tr) {
      if (!tr || !tr.buffer) return false;
      if (tr.muted) return false;
      if (anySolo()) return !!tr.solo;
      return true;
    }

    function stopMeter() {
      if (meterRaf) cancelAnimationFrame(meterRaf);
      meterRaf = 0;
      try {
        if (meterSource) meterSource.disconnect();
      } catch (e) {}
      meterSource = null;
      meterAnalyser = null;
      if (canvas) {
        try {
          var c = canvas.getContext("2d");
          if (c) c.clearRect(0, 0, canvas.width, canvas.height);
        } catch (e) {}
      }
    }

    function startMeter(stream) {
      stopMeter();
      if (!canvas || !stream) return;
      try {
        var ctx = ensureCtx();
        meterSource = ctx.createMediaStreamSource(stream);
        meterAnalyser = ctx.createAnalyser();
        meterAnalyser.fftSize = 256;
        meterAnalyser.smoothingTimeConstant = 0.75;
        meterSource.connect(meterAnalyser);
        var data = new Uint8Array(meterAnalyser.frequencyBinCount);
        var g = canvas.getContext("2d");
        var bars = 22;
        function draw() {
          meterRaf = requestAnimationFrame(draw);
          if (!meterAnalyser || !g) return;
          meterAnalyser.getByteFrequencyData(data);
          var w = canvas.width;
          var h = canvas.height;
          g.clearRect(0, 0, w, h);
          var gap = 2;
          var bw = (w - gap * (bars - 1)) / bars;
          for (var i = 0; i < bars; i++) {
            var idx = Math.floor((i / bars) * data.length);
            var v = data[idx] / 255;
            var bh = Math.max(2, v * (h - 2));
            var x = i * (bw + gap);
            var y = (h - bh) / 2;
            g.fillStyle = "rgba(94,200,255," + (0.35 + v * 0.65) + ")";
            g.fillRect(x, y, bw, bh);
          }
        }
        draw();
      } catch (e) {}
    }

    function startRecTimer() {
      stopRecTimer();
      recStartedAt = Date.now();
      if (timerEl) timerEl.textContent = "00:00";
      recTimer = setInterval(function () {
        var ms = Date.now() - recStartedAt;
        var s = Math.floor(ms / 1000);
        var m = Math.floor(s / 60);
        var r = s % 60;
        if (timerEl)
          timerEl.textContent =
            String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
      }, 200);
    }

    function stopRecTimer() {
      if (recTimer) clearInterval(recTimer);
      recTimer = null;
    }

    function currentPlayhead() {
      if (!isPlaying || !audioCtx) return playhead;
      var elapsed = audioCtx.currentTime - playStartedAtCtx;
      return Math.max(0, playStartedAtHead + elapsed);
    }

    function getRegion() {
      var total = maxDur();
      var a = Math.max(0, regionIn || 0);
      var b = regionOut == null ? total : regionOut;
      if (b == null || !isFinite(b) || b <= 0) b = total;
      if (b > total) b = total;
      if (a > b) {
        var t = a;
        a = b;
        b = t;
      }
      if (b - a < 0.05 && total > 0.05) b = Math.min(total, a + 0.05);
      return { start: a, end: b, dur: Math.max(0, b - a), total: total };
    }

    function updateTransportUI() {
      var total = maxDur();
      var cur = currentPlayhead();
      if (total > 0 && cur > total) cur = total;
      playhead = isPlaying ? cur : playhead;
      if (clockEl) clockEl.textContent = fmt(playhead);
      if (clockEndEl) clockEndEl.textContent = fmt(total);
      var pct = total > 0 ? Math.min(1, playhead / total) : 0;
      if (tfillEl) tfillEl.style.width = pct * 100 + "%";
      if (theadEl) theadEl.style.left = pct * 100 + "%";
      // region overlay
      var reg = getRegion();
      if (total > 0 && regionEl) {
        regionEl.style.left = (reg.start / total) * 100 + "%";
        regionEl.style.width = (reg.dur / total) * 100 + "%";
      }
      if (total > 0 && handleInEl) handleInEl.style.left = (reg.start / total) * 100 + "%";
      if (total > 0 && handleOutEl) handleOutEl.style.left = (reg.end / total) * 100 + "%";
      if (regionLabelEl) {
        regionLabelEl.textContent =
          "In " +
          fmt(reg.start) +
          " · Out " +
          fmt(reg.end) +
          " · " +
          fmt(reg.dur) +
          (reg.dur >= reg.total - 0.05 ? " (penuh)" : "");
      }

      var bars = listEl ? listEl.querySelectorAll("[data-amx-prog]") : [];
      for (var i = 0; i < bars.length; i++) {
        var el = bars[i];
        var idx = Number(el.getAttribute("data-amx-prog"));
        var tr = tracks[idx];
        if (!tr || !tr.buffer) {
          el.style.width = "0%";
          continue;
        }
        var off = tr.offset || 0;
        var local = playhead - off;
        var p = 0;
        if (local <= 0) p = 0;
        else if (local >= tr.buffer.duration) p = 1;
        else p = local / tr.buffer.duration;
        el.style.width = p * 100 + "%";
      }
    }

    function startTransportLoop() {
      stopTransportLoop();
      function tick() {
        transportRaf = requestAnimationFrame(tick);
        updateTransportUI();
        var total = maxDur();
        if (isPlaying && !isRecording && total > 0 && currentPlayhead() >= total + 0.05) {
          stopPlayback(true);
        }
      }
      transportRaf = requestAnimationFrame(tick);
    }

    function stopTransportLoop() {
      if (transportRaf) cancelAnimationFrame(transportRaf);
      transportRaf = 0;
    }

    function stopPlayback(keepHead) {
      playing.forEach(function (n) {
        try {
          n.stop();
        } catch (e) {}
      });
      playing = [];
      liveGains = [];
      if (isPlaying) {
        playhead = currentPlayhead();
        isPlaying = false;
      }
      updateTransportUI();
    }

    function ensureMasterGain() {
      ensureCtx();
      if (!masterGainNode) {
        masterGainNode = audioCtx.createGain();
        masterGainNode.gain.value = masterGain;
        masterGainNode.connect(audioCtx.destination);
      }
      return masterGainNode;
    }

    function setMasterGain(v) {
      masterGain = Math.max(0, Math.min(3, Number(v) || 0));
      if (masterGainNode) {
        try {
          masterGainNode.gain.value = masterGain;
        } catch (e) {}
      }
      var lab = root.querySelector("[data-amx=master-val]");
      if (lab) lab.textContent = Math.round(masterGain * 100) + "%";
      var range = root.querySelector("[data-amx=master]");
      if (range) range.value = String(Math.round(masterGain * 100));
    }

    /** Hubungkan buffer source dengan gain + reverb send → master */
    function connectTrackLive(src, tr) {
      ensureCtx();
      var dest = ensureMasterGain();
      var vol = typeof tr.volume === "number" ? tr.volume : 1;
      var rev = typeof tr.reverb === "number" ? tr.reverb : 0;
      var dry = audioCtx.createGain();
      dry.gain.value = vol;
      src.connect(dry);
      dry.connect(dest);
      var wetGain = null;
      if (rev > 0.01) {
        ensureReverb();
        wetGain = audioCtx.createGain();
        wetGain.gain.value = vol * rev;
        src.connect(wetGain);
        wetGain.connect(sharedConvolver);
      }
      liveGains.push({ dry: dry, wet: wetGain, track: tr });
    }

    function applyLiveVolumes() {
      liveGains.forEach(function (g) {
        if (!g.track) return;
        var vol = typeof g.track.volume === "number" ? g.track.volume : 1;
        var rev = typeof g.track.reverb === "number" ? g.track.reverb : 0;
        try {
          if (g.dry) g.dry.gain.value = vol;
          if (g.wet) g.wet.gain.value = vol * rev;
        } catch (e) {}
      });
      if (masterGainNode) {
        try {
          masterGainNode.gain.value = masterGain;
        } catch (e) {}
      }
    }

    function scheduleTrack(tr, head, t0) {
      if (!isTrackActive(tr)) return null;
      var off = tr.offset || 0;
      var bufDur = tr.buffer.duration;
      if (head >= off + bufDur) return null;
      var when = t0;
      var offsetInBuffer = 0;
      if (head > off) {
        offsetInBuffer = head - off;
      } else {
        when = t0 + (off - head);
        offsetInBuffer = 0;
      }
      var remaining = bufDur - offsetInBuffer;
      if (remaining <= 0.001) return null;
      var src = audioCtx.createBufferSource();
      src.buffer = tr.buffer;
      connectTrackLive(src, tr);
      try {
        src.start(when, offsetInBuffer, remaining);
      } catch (e) {
        try {
          src.start(when, offsetInBuffer);
        } catch (e2) {}
      }
      return src;
    }

    function playAll() {
      if (isRecording) return;
      stopPlayback(true);
      if (!tracks.length) {
        setStatus("Belum ada track.");
        return;
      }
      ensureCtx();
      var head = playhead;
      var total = maxDur();
      if (total <= 0) return;
      if (head >= total) head = 0;
      playhead = head;
      playStartedAtHead = head;
      playStartedAtCtx = audioCtx.currentTime + 0.03;
      isPlaying = true;

      tracks.forEach(function (tr) {
        var src = scheduleTrack(tr, head, playStartedAtCtx);
        if (src) playing.push(src);
      });
      startTransportLoop();
      setStatus("Play dari " + fmt(head) + " / " + fmt(total));
    }

    function seekTo(sec) {
      var total = maxDur();
      var t = Math.max(0, Math.min(total || 0, sec));
      var wasPlaying = isPlaying && !isRecording;
      stopPlayback(true);
      playhead = t;
      updateTransportUI();
      if (wasPlaying) playAll();
    }

    function renderTracks() {
      listEl.innerHTML = "";
      if (!tracks.length) {
        listEl.innerHTML = '<p class="muted amx-empty">Belum ada track.</p>';
        updateTransportUI();
        return;
      }
      tracks.forEach(function (tr, idx) {
        var row = document.createElement("div");
        row.className = "amx-track" + (tr.muted ? " is-muted" : "") + (tr.solo ? " is-solo" : "");
        row.setAttribute("data-track-i", String(idx));
        var offSec = Math.max(0, tr.offset || 0);
        var offLabel =
          offSec > 0.05 ? " @" + fmt(offSec) : "";
        var vol = typeof tr.volume === "number" ? tr.volume : 1;
        var rev = typeof tr.reverb === "number" ? tr.reverb : 0;
        // Slider max: at least timeline length, current offset, 60s
        var offMax = Math.max(60, Math.ceil(maxDur() || 0), Math.ceil(offSec) + 30);
        if (offMax < 1) offMax = 60;
        row.innerHTML =
          '<div class="amx-track-main">' +
          '<span class="amx-track-idx">T' +
          (idx + 1) +
          "</span>" +
          '<div class="amx-track-meta">' +
          '<span class="amx-track-name" title="' +
          (tr.name || "") +
          '">' +
          (String(tr.name || "Track " + (idx + 1)).replace(/\s*@\d+:\d{2}\s*$/, "").trim() ||
            "Track " + (idx + 1)) +
          "</span>" +
          '<span class="amx-track-dur">' +
          fmt(tr.buffer ? tr.buffer.duration : 0) +
          offLabel +
          "</span>" +
          '<div class="amx-track-bar"><div class="amx-track-bar-fill" data-amx-prog="' +
          idx +
          '"></div></div>' +
          '<div class="amx-sliders">' +
          '<label class="amx-slider-lab amx-offset-lab" title="Waktu mulai track di timeline (geser atau ketik m:ss)">' +
          'Start <input type="range" min="0" max="' +
          offMax +
          '" step="0.1" value="' +
          offSec.toFixed(1) +
          '" data-act="off" data-i="' +
          idx +
          '">' +
          '<input type="text" class="amx-off-input" data-act="off-text" data-i="' +
          idx +
          '" value="' +
          fmt(offSec) +
          '" inputmode="numeric" aria-label="Waktu mulai track" title="Ketik m:ss lalu Enter">' +
          "</label>" +
          '<label class="amx-slider-lab" title="Volume">Vol <input type="range" min="0" max="150" value="' +
          Math.round(vol * 100) +
          '" data-act="vol" data-i="' +
          idx +
          '"><span data-amx-volval="' +
          idx +
          '">' +
          Math.round(vol * 100) +
          "%</span></label>" +
          '<label class="amx-slider-lab" title="Reverb">Rev <input type="range" min="0" max="100" value="' +
          Math.round(rev * 100) +
          '" data-act="rev" data-i="' +
          idx +
          '"><span data-amx-revval="' +
          idx +
          '">' +
          Math.round(rev * 100) +
          "%</span></label>" +
          "</div>" +
          "</div></div>" +
          '<div class="amx-track-acts">' +
          '<button type="button" class="btn btn-ghost amx-xs" data-act="trk-start" data-i="' +
          idx +
          '" title="Awal track">⏮</button>' +
          '<button type="button" class="btn btn-ghost amx-xs" data-act="trk-end" data-i="' +
          idx +
          '" title="Akhir track">⏭</button>' +
          '<button type="button" class="btn btn-ghost amx-xs' +
          (tr.solo ? " is-solo" : "") +
          '" data-act="solo" data-i="' +
          idx +
          '" title="Solo (track lain di-mute di play/mix)">' +
          (tr.solo ? "S●" : "S") +
          "</button>" +
          '<button type="button" class="btn btn-ghost amx-xs" data-act="mute" data-i="' +
          idx +
          '" title="' +
          (tr.muted ? "Unmute" : "Mute") +
          '">' +
          (tr.muted ? "M●" : "M") +
          "</button>" +
          '<button type="button" class="btn btn-ghost amx-xs" data-act="solo-play" data-i="' +
          idx +
          '" title="Putar track ini saja">▶</button>' +
          '<button type="button" class="btn btn-ghost amx-xs" data-act="del" data-i="' +
          idx +
          '">✕</button>' +
          "</div>";
        listEl.appendChild(row);
      });
      setStatus(tracks.length + "/" + MAX_TRACKS + " · total " + fmt(maxDur()));
      updateTransportUI();
    }

    function addBuffer(buffer, name, offsetSec) {
      if (tracks.length >= MAX_TRACKS) {
        setStatus("Maks. " + MAX_TRACKS + " track.");
        return false;
      }
      tracks.push({
        id: "t" + Date.now() + Math.random().toString(36).slice(2, 6),
        name: name || "Track " + (tracks.length + 1),
        buffer: buffer,
        muted: false,
        solo: false,
        offset: Math.max(0, offsetSec || 0),
        volume: 1,
        reverb: 0,
      });
      renderTracks();
      return true;
    }

    async function startRec() {
      if (tracks.length >= MAX_TRACKS) {
        setStatus("Maks. " + MAX_TRACKS + " track.");
        return;
      }
      try {
        ensureCtx();
        var headNow = currentPlayhead();
        stopPlayback(true);
        playhead = headNow;
        recOffsetSec = headNow;

        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });

        var t0 = audioCtx.currentTime + 0.08;
        playStartedAtHead = headNow;
        playStartedAtCtx = t0;
        isPlaying = true;
        isRecording = true;

        tracks.forEach(function (tr) {
          var src = scheduleTrack(tr, headNow, t0);
          if (src) playing.push(src);
        });
        startTransportLoop();

        recChunks = [];
        var mime = "";
        try {
          if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))
            mime = "audio/webm;codecs=opus";
          else if (MediaRecorder.isTypeSupported("audio/webm")) mime = "audio/webm";
        } catch (e) {}
        mediaRec = mime
          ? new MediaRecorder(mediaStream, { mimeType: mime })
          : new MediaRecorder(mediaStream);
        mediaRec.ondataavailable = function (ev) {
          if (ev.data && ev.data.size) recChunks.push(ev.data);
        };
        mediaRec.onstop = async function () {
          var savedOffset = recOffsetSec;
          stopPlayback(true);
          stopMeter();
          stopRecTimer();
          setRecUi(false);
          try {
            mediaStream.getTracks().forEach(function (t) {
              t.stop();
            });
          } catch (e) {}
          mediaStream = null;
          var blob = new Blob(recChunks, {
            type: mediaRec.mimeType || "audio/webm",
          });
          try {
            var buf = await decodeBlob(ensureCtx(), blob);
            var label = "Rekam " + (tracks.length + 1);
            var ok = addBuffer(buf, label, savedOffset);
            if (ok && tracks.length) {
              // Rekaman mic biasanya lebih pelan dari file upload — boost default
              tracks[tracks.length - 1].volume = 1.35;
              renderTracks();
            }
            setStatus(
              "Track ditambah" +
                (savedOffset > 0.05
                  ? " mulai dari " + fmt(savedOffset)
                  : "") +
                " · vol mic 135%."
            );
          } catch (e) {
            setStatus("Gagal decode: " + (e.message || e));
          }
          setRecUi(false);
          mediaRec = null;
          if (recOffsetEl) recOffsetEl.textContent = "";
        };
        mediaRec.start(200);
        startMeter(mediaStream);
        startRecTimer();
        setRecUi(true);
        if (recOffsetEl) {
          recOffsetEl.textContent =
            recOffsetSec > 0.05 ? "mulai @" + fmt(recOffsetSec) : "mulai @0:00";
        }
        setStatus(
          "Merekam dari " + fmt(recOffsetSec) + "… (headset untuk overdub)"
        );
      } catch (e) {
        setRecUi(false);
        setStatus("Mic: " + (e.message || e));
      }
    }

    function setRecUi(on) {
      isRecording = !!on;
      if (recBar) {
        if (on) {
          recBar.hidden = false;
          recBar.removeAttribute("hidden");
          recBar.setAttribute("aria-hidden", "false");
        } else {
          recBar.hidden = true;
          recBar.setAttribute("hidden", "");
          recBar.setAttribute("aria-hidden", "true");
        }
      }
      // Satu tombol: Rekam (merah) ↔ Stop (kedip merah)
      if (btnRec) {
        btnRec.hidden = false;
        if (on) {
          btnRec.textContent = "■ Stop";
          btnRec.classList.add("is-recording");
          btnRec.setAttribute("title", "Stop rekam");
        } else {
          btnRec.textContent = "● Rekam";
          btnRec.classList.remove("is-recording");
          btnRec.setAttribute("title", "Rekam");
        }
      }
      // stop-rec tetap ada di DOM (fallback), disembunyikan dari UI
      if (btnStopRec) btnStopRec.hidden = true;
      if (!on && timerEl) timerEl.textContent = "00:00";
    }

    function stopRec() {
      if (mediaRec && mediaRec.state !== "inactive") {
        try {
          mediaRec.stop();
        } catch (e) {}
      }
      // Paksa UI diam meskipun onstop belum jalan
      stopRecTimer();
      setRecUi(false);
    }

    /** Set start offset (detik) untuk track i; sinkronkan label + slider + teks */
    function applyOffset(i, sec, opts) {
      opts = opts || {};
      if (!tracks[i]) return;
      sec = Math.max(0, Number(sec) || 0);
      if (!isFinite(sec)) return;
      // hindari jitter float
      sec = Math.round(sec * 10) / 10;
      tracks[i].offset = sec;

      var row = listEl.querySelector('.amx-track[data-track-i="' + i + '"]');
      var durEl = row
        ? row.querySelector(".amx-track-dur")
        : listEl.querySelectorAll(".amx-track-dur")[i];
      if (durEl && tracks[i].buffer) {
        var lab = sec > 0.05 ? " @" + fmt(sec) : "";
        durEl.textContent = fmt(tracks[i].buffer.duration) + lab;
      }
      // Bersihkan @lama di nama rekaman agar tidak bentrok dengan offset baru
      var nameEl = row ? row.querySelector(".amx-track-name") : null;
      if (nameEl && tracks[i].name) {
        var clean = String(tracks[i].name).replace(/\s*@\d+:\d{2}\s*$/, "").trim();
        if (clean !== tracks[i].name) {
          tracks[i].name = clean;
          nameEl.textContent = clean;
          nameEl.setAttribute("title", clean);
        }
      }
      var range = row
        ? row.querySelector('input[data-act="off"]')
        : listEl.querySelector('input[data-act="off"][data-i="' + i + '"]');
      if (range) {
        var mx = Number(range.max) || 60;
        if (sec > mx) range.max = String(Math.ceil(sec) + 30);
        if (!opts.fromRange) range.value = String(sec);
        else range.value = String(sec); // tetap sinkron saat geser
      }
      var text = row
        ? row.querySelector('input[data-act="off-text"]')
        : listEl.querySelector('input[data-act="off-text"][data-i="' + i + '"]');
      if (text && document.activeElement !== text) {
        text.value = fmt(sec);
      } else if (text && !opts.fromText && document.activeElement !== text) {
        text.value = fmt(sec);
      } else if (text && opts.fromRange) {
        text.value = fmt(sec);
      }
      updateTransportUI();
      if (isPlaying && !isRecording && !opts.skipRestart) {
        var head = currentPlayhead();
        stopPlayback(true);
        playhead = head;
        playAll();
      }
      if (opts.status !== false) {
        setStatus("T" + (i + 1) + " mulai @" + fmt(sec));
      }
    }

    async function addFile(file) {
      if (!file) return;
      if (tracks.length >= MAX_TRACKS) {
        setStatus("Maks. " + MAX_TRACKS + " track.");
        return;
      }
      try {
        ensureCtx();
        var buf = await decodeBlob(audioCtx, file);
        var off = currentPlayhead();
        var ok = addBuffer(buf, file.name || "Upload", off > 0.05 ? off : 0);
        if (ok && tracks.length) {
          tracks[tracks.length - 1].volume = 0.85;
          renderTracks();
        }
        setStatus(
          "File: " +
            (file.name || "audio") +
            (off > 0.05 ? " @" + fmt(off) : "") +
            " · vol 85% (atur slider bila perlu)"
        );
      } catch (e) {
        setStatus("File gagal: " + (e.message || e));
      }
    }

    /**
     * Offline mix. opts:
     *  - region: gunakan Mark In/Out (default true)
     *  - mono: 1 channel
     *  - sampleRate: target rate (downsample via OfflineAudioContext)
     *  - tail: reverb tail detik
     *  - maxSec: potong durasi region
     */
    async function mixToBuffer(opts) {
      opts = opts || {};
      var useRegion = opts.region !== false;
      var active = tracks.filter(function (t) {
        return isTrackActive(t);
      });
      if (!active.length) {
        setStatus("Tidak ada track aktif.");
        return null;
      }
      setStatus("Mixing…");
      ensureCtx();
      var reg = useRegion ? getRegion() : { start: 0, end: maxDur(), dur: maxDur(), total: maxDur() };
      var start = reg.start;
      var end = reg.end;
      if (opts.maxSec && end - start > opts.maxSec) {
        end = start + opts.maxSec;
      }
      var dur = Math.max(0.05, end - start);
      var sr = opts.sampleRate || audioCtx.sampleRate;
      var ch = opts.mono ? 1 : 2;
      var tail = opts.tail != null ? opts.tail : opts.mono ? 0.3 : 1.2;
      var frames = Math.ceil((dur + tail) * sr) || 1;
      var offline = new OfflineAudioContext(ch, frames, sr);
      var master = offline.createGain();
      master.gain.value = masterGain;
      master.connect(offline.destination);
      var conv = null;
      if (!opts.mono && tail > 0.2) {
        var impulse = makeImpulse(offline, 1.4, 2.4);
        conv = offline.createConvolver();
        conv.buffer = impulse;
        conv.connect(master);
      }

      active.forEach(function (t) {
        var off = t.offset || 0;
        var bufDur = t.buffer.duration;
        var trackStart = off;
        var trackEnd = off + bufDur;
        // irisan dengan [start, end]
        var playStart = Math.max(trackStart, start);
        var playEnd = Math.min(trackEnd, end);
        if (playEnd - playStart < 0.01) return;
        var when = playStart - start; // posisi di buffer offline
        var offsetInBuffer = playStart - off;
        var len = playEnd - playStart;
        var src = offline.createBufferSource();
        src.buffer = t.buffer;
        var vol = typeof t.volume === "number" ? t.volume : 1;
        var rev = typeof t.reverb === "number" ? t.reverb : 0;
        var dry = offline.createGain();
        dry.gain.value = vol;
        src.connect(dry);
        dry.connect(master);
        if (conv && rev > 0.01) {
          var wet = offline.createGain();
          wet.gain.value = vol * rev;
          src.connect(wet);
          wet.connect(conv);
        }
        try {
          src.start(when, offsetInBuffer, len);
        } catch (e) {
          try {
            src.start(when, offsetInBuffer);
          } catch (e2) {}
        }
      });
      return await offline.startRendering();
    }

    /** Mix khusus chat: mono 22.05kHz → MP3 48kbps (offline, cepat, kecil) */
    async function mixToChatBlob() {
      var reg = getRegion();
      if (reg.dur > CHAT_MAX_SEC) {
        setStatus(
          "Region " +
            fmt(reg.dur) +
            " > " +
            CHAT_MAX_SEC +
            " dtk — dipotong otomatis dari Mark In. Perpendek region bila perlu."
        );
      }
      var rendered = await mixToBuffer({
        region: true,
        mono: true,
        sampleRate: CHAT_SR,
        tail: 0.25,
        maxSec: CHAT_MAX_SEC,
      });
      if (!rendered) return null;
      setStatus("Encode MP3 chat (offline, cepat)…");
      var blob = encodeMp3(rendered, CHAT_KBPS);
      return {
        blob: blob,
        duration: rendered.duration,
        mime: "audio/mpeg",
        filename: "mix-" + Date.now() + ".mp3",
      };
    }

    async function mixToWav() {
      var rendered = await mixToBuffer();
      if (!rendered) return null;
      var wav = encodeWav(rendered);
      return {
        blob: wav,
        duration: rendered.duration,
        mime: "audio/wav",
        filename: "mix-" + Date.now() + ".wav",
      };
    }

    async function mixToCompressed() {
      var rendered = await mixToBuffer();
      if (!rendered) return null;
      setStatus("Kompres audio…");
      var comp = await bufferToCompressed(rendered);
      return {
        blob: comp.blob,
        duration: rendered.duration,
        mime: comp.mime,
        filename: "mix-" + Date.now() + "." + comp.ext,
      };
    }

    function triggerDownload(result) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(result.blob);
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        try {
          URL.revokeObjectURL(a.href);
        } catch (e) {}
        a.remove();
      }, 2000);
    }

    async function doDownloadWav() {
      try {
        var result = await mixToWav();
        if (!result) return;
        triggerDownload(result);
        setStatus(
          "WAV disimpan · " +
            fmt(result.duration) +
            " · " +
            Math.round(result.blob.size / 1024) +
            " KB"
        );
      } catch (e) {
        setStatus("Gagal simpan WAV: " + (e.message || e));
      }
    }

    async function doDownloadMp3() {
      try {
        var rendered = await mixToBuffer();
        if (!rendered) return;
        setStatus("Encode MP3…");
        var blob = encodeMp3(rendered, 128);
        var name = "mix-" + Date.now();
        try {
          var asked = window.prompt("Nama file MP3 (tanpa ekstensi):", name);
          if (asked == null) {
            setStatus("Unduh MP3 dibatalkan.");
            return;
          }
          name = String(asked).trim().replace(/[\\/:*?"<>|]+/g, "-") || name;
        } catch (e) {}
        triggerDownload({
          blob: blob,
          filename: name + ".mp3",
        });
        setStatus(
          "MP3 disimpan · " +
            fmt(rendered.duration) +
            " · " +
            Math.round(blob.size / 1024) +
            " KB"
        );
      } catch (e) {
        setStatus("Gagal MP3: " + (e.message || e));
      }
    }

    async function doDownloadWebm() {
      try {
        var result = await mixToCompressed();
        if (!result) return;
        triggerDownload(result);
        setStatus(
          "WebM disimpan · " +
            fmt(result.duration) +
            " · " +
            Math.round(result.blob.size / 1024) +
            " KB (kompres; MP3 butuh library ekstra)"
        );
      } catch (e) {
        setStatus("Gagal simpan WebM: " + (e.message || e));
      }
    }

    async function doExport() {
      if (!onExport) {
        setStatus("Tidak ada target kirim.");
        return;
      }
      try {
        setStatus("Mix region → MP3 mono 48kbps (offline)…");
        var result = await mixToChatBlob();
        if (!result) return;
        if (result.blob.size < 400) {
          setStatus("Hasil mix terlalu pendek.");
          return;
        }
        if (result.blob.size > CHAT_MAX_BYTES) {
          setStatus(
            "Masih " +
              Math.round(result.blob.size / 1024) +
              " KB (batas ~" +
              Math.round(CHAT_MAX_BYTES / 1024) +
              " KB). Pendekkan region (Mark In/Out)."
          );
          return;
        }
        setStatus(
          "Mengirim… " +
            Math.round(result.blob.size / 1024) +
            " KB · " +
            fmt(result.duration)
        );
        await onExport(result);
        setStatus("Terkirim.");
        close();
      } catch (e) {
        var msg = (e && e.message) || String(e);
        if (/maximum allowed size|exceeded|413|payload/i.test(msg)) {
          setStatus(
            "Storage menolak (file terlalu besar). Pendekkan region Mark In/Out, lalu kirim lagi."
          );
        } else {
          setStatus("Gagal kirim: " + msg);
        }
      }
    }

    function close() {
      stopRec();
      stopPlayback(true);
      stopMeter();
      stopRecTimer();
      stopTransportLoop();
      isRecording = false;
      isPlaying = false;
      try {
        if (mediaStream)
          mediaStream.getTracks().forEach(function (t) {
            t.stop();
          });
      } catch (e) {}
      root.classList.remove("is-open");
      try {
        root.remove();
      } catch (e) {}
    }

    // --- Drag panel ---
    (function bindDrag() {
      var handle = root.querySelector("[data-amx-drag]");
      if (!handle || !panelEl) return;
      var dragging = false;
      var ox = 0;
      var oy = 0;
      handle.addEventListener("pointerdown", function (ev) {
        if (ev.target && ev.target.closest && ev.target.closest("[data-amx=close]"))
          return;
        dragging = true;
        panelEl.classList.add("is-dragging");
        var rect = panelEl.getBoundingClientRect();
        // switch to fixed left/top positioning
        panelEl.style.position = "fixed";
        panelEl.style.left = rect.left + "px";
        panelEl.style.top = rect.top + "px";
        panelEl.style.right = "auto";
        panelEl.style.bottom = "auto";
        panelEl.style.margin = "0";
        ox = ev.clientX - rect.left;
        oy = ev.clientY - rect.top;
        try {
          handle.setPointerCapture(ev.pointerId);
        } catch (e) {}
        ev.preventDefault();
      });
      handle.addEventListener("pointermove", function (ev) {
        if (!dragging) return;
        var x = ev.clientX - ox;
        var y = ev.clientY - oy;
        var maxX = window.innerWidth - panelEl.offsetWidth - 4;
        var maxY = window.innerHeight - 40;
        x = Math.max(4, Math.min(maxX, x));
        y = Math.max(4, Math.min(maxY, y));
        panelEl.style.left = x + "px";
        panelEl.style.top = y + "px";
      });
      function endDrag(ev) {
        if (!dragging) return;
        dragging = false;
        panelEl.classList.remove("is-dragging");
        try {
          handle.releasePointerCapture(ev.pointerId);
        } catch (e) {}
      }
      handle.addEventListener("pointerup", endDrag);
      handle.addEventListener("pointercancel", endDrag);
    })();

    if (timelineEl) {
      var scrubbing = false;
      var dragHandle = null; // "in" | "out" | null
      function posFromEvent(ev) {
        var rect = timelineEl.getBoundingClientRect();
        var x = (ev.clientX - rect.left) / Math.max(1, rect.width);
        return Math.max(0, Math.min(1, x));
      }
      function scrubFromEvent(ev) {
        seekTo(posFromEvent(ev) * maxDur());
      }
      function applyHandle(ev) {
        var total = maxDur();
        if (total <= 0) return;
        var t = posFromEvent(ev) * total;
        if (dragHandle === "in") {
          regionIn = t;
          if (regionOut != null && regionIn > regionOut) regionOut = regionIn;
        } else if (dragHandle === "out") {
          regionOut = t;
          if (regionOut < regionIn) regionIn = regionOut;
        }
        updateTransportUI();
      }
      timelineEl.addEventListener("pointerdown", function (ev) {
        if (isRecording) return;
        var t = ev.target;
        var hEl = t && t.closest ? t.closest("[data-amx^=handle-]") : null;
        if (hEl) {
          var h = hEl.getAttribute("data-amx");
          dragHandle = h === "handle-in" ? "in" : h === "handle-out" ? "out" : null;
        } else {
          dragHandle = null;
        }
        scrubbing = true;
        timelineEl.classList.add("is-scrubbing");
        try {
          timelineEl.setPointerCapture(ev.pointerId);
        } catch (e) {}
        if (dragHandle) applyHandle(ev);
        else scrubFromEvent(ev);
        ev.preventDefault();
        ev.stopPropagation();
      });
      timelineEl.addEventListener("pointermove", function (ev) {
        if (!scrubbing) return;
        if (dragHandle) applyHandle(ev);
        else scrubFromEvent(ev);
      });
      function endScrub(ev) {
        if (!scrubbing) return;
        scrubbing = false;
        dragHandle = null;
        timelineEl.classList.remove("is-scrubbing");
        try {
          timelineEl.releasePointerCapture(ev.pointerId);
        } catch (e) {}
      }
      timelineEl.addEventListener("pointerup", endScrub);
      timelineEl.addEventListener("pointercancel", endScrub);
    }

    root.onclick = function (ev) {
      var t = ev.target;
      if (!t) return;
      var amx =
        t.getAttribute("data-amx") ||
        (t.closest &&
          t.closest("[data-amx]") &&
          t.closest("[data-amx]").getAttribute("data-amx"));
      if (t.matches && t.matches('input[data-amx="file"]')) return;
      if (t.matches && t.matches('input[type="range"]')) return;
      if (t.matches && t.matches('input[type="text"]')) return;
      if (t.closest && t.closest("[data-amx=promo]")) return;
      if (amx === "close") close();
      else if (amx === "rec") {
        if (isRecording) stopRec();
        else startRec();
      } else if (amx === "stop-rec") stopRec();
      else if (amx === "play") playAll();
      else if (amx === "stop") {
        stopPlayback(true);
        setStatus("Stop @ " + fmt(playhead));
      } else if (amx === "download-wav") doDownloadWav();
      else if (amx === "download-mp3") doDownloadMp3();
      else if (amx === "download-webm") doDownloadWebm();
      else if (amx === "export") doExport();
      else if (amx === "to-start") seekTo(0);
      else if (amx === "to-end") seekTo(maxDur());
      else if (amx === "skip-back") seekTo(Math.max(0, currentPlayhead() - 5));
      else if (amx === "skip-fwd") seekTo(Math.min(maxDur(), currentPlayhead() + 5));
      else if (amx === "mute-all") {
        tracks.forEach(function (tr) {
          tr.muted = true;
        });
        renderTracks();
        setStatus("Semua di-mute.");
      } else if (amx === "unmute-all") {
        tracks.forEach(function (tr) {
          tr.muted = false;
          tr.solo = false;
        });
        renderTracks();
        setStatus("Semua unmute · solo dibersihkan.");
      } else if (amx === "mark-in") {
        regionIn = Math.max(0, currentPlayhead());
        if (regionOut != null && regionIn > regionOut) {
          regionOut = Math.min(maxDur(), regionIn + 0.5);
        }
        updateTransportUI();
        setStatus("Mark In @ " + fmt(regionIn) + " (Out tetap " + fmt(getRegion().end) + ")");
      } else if (amx === "mark-out") {
        regionOut = Math.max(0, currentPlayhead());
        if (regionOut < regionIn) {
          regionIn = Math.max(0, regionOut - 0.5);
        }
        updateTransportUI();
        setStatus("Mark Out @ " + fmt(regionOut) + " (In tetap " + fmt(regionIn) + ")");
      } else if (amx === "region-reset") {
        regionIn = 0;
        regionOut = null;
        updateTransportUI();
        setStatus("Region direset · In 0:00 · Out " + fmt(maxDur()));
      }

      var act = t.getAttribute("data-act");
      if (act === "mute") {
        var i = Number(t.getAttribute("data-i"));
        if (tracks[i]) {
          tracks[i].muted = !tracks[i].muted;
          renderTracks();
        }
      } else if (act === "solo") {
        var si = Number(t.getAttribute("data-i"));
        if (tracks[si]) {
          tracks[si].solo = !tracks[si].solo;
          if (tracks[si].solo) tracks[si].muted = false;
          renderTracks();
          setStatus(
            tracks[si].solo
              ? "Solo T" + (si + 1) + " — track lain diabaikan di play/mix"
              : "Solo off T" + (si + 1)
          );
        }
      } else if (act === "trk-start") {
        var ti = Number(t.getAttribute("data-i"));
        if (tracks[ti]) seekTo(tracks[ti].offset || 0);
      } else if (act === "trk-end") {
        var te = Number(t.getAttribute("data-i"));
        if (tracks[te] && tracks[te].buffer) {
          seekTo((tracks[te].offset || 0) + tracks[te].buffer.duration);
        }
      } else if (act === "del") {
        var j = Number(t.getAttribute("data-i"));
        tracks.splice(j, 1);
        renderTracks();
      } else if (act === "solo-play") {
        var k = Number(t.getAttribute("data-i"));
        if (isRecording) return;
        stopPlayback(true);
        if (tracks[k] && tracks[k].buffer) {
          ensureCtx();
          var tr = tracks[k];
          playhead = tr.offset || 0;
          playStartedAtHead = playhead;
          playStartedAtCtx = audioCtx.currentTime + 0.02;
          isPlaying = true;
          var src = audioCtx.createBufferSource();
          src.buffer = tr.buffer;
          connectTrackLive(src, tr);
          src.start(playStartedAtCtx);
          playing.push(src);
          startTransportLoop();
        }
      }
    };

    // Volume / reverb sliders (input event — live)
    root.addEventListener("input", function (ev) {
      var t = ev.target;
      if (!t || !t.getAttribute) return;
      var act = t.getAttribute("data-act");
      var i = Number(t.getAttribute("data-i"));
      if (!tracks[i] && act !== "off-text") return;
      if (act === "vol") {
        tracks[i].volume = Number(t.value) / 100;
        var lab = root.querySelector('[data-amx-volval="' + i + '"]');
        if (lab) lab.textContent = Math.round(tracks[i].volume * 100) + "%";
        applyLiveVolumes();
      } else if (act === "rev") {
        tracks[i].reverb = Number(t.value) / 100;
        var lab2 = root.querySelector('[data-amx-revval="' + i + '"]');
        if (lab2) lab2.textContent = Math.round(tracks[i].reverb * 100) + "%";
        applyLiveVolumes();
        // jika reverb baru diaktifkan saat play, live graph mungkin belum punya wet — restart play
        if (isPlaying && !isRecording && tracks[i].reverb > 0.01) {
          var head = currentPlayhead();
          stopPlayback(true);
          playhead = head;
          playAll();
        }
      } else if (act === "off") {
        applyOffset(i, Number(t.value), {
          fromRange: true,
          status: false,
          skipRestart: true,
        });
      }
    });

    // Restart play setelah user selesai geser Start (change)
    root.addEventListener("change", function (ev) {
      var t = ev.target;
      if (!t || !t.getAttribute) return;
      if (t.getAttribute("data-act") === "off") {
        var i = Number(t.getAttribute("data-i"));
        if (!tracks[i]) return;
        applyOffset(i, Number(t.value), { fromRange: true, status: true });
      }
    });

    // Master gain slider
    var masterRange = root.querySelector("[data-amx=master]");
    if (masterRange) {
      masterRange.addEventListener("input", function () {
        setMasterGain(Number(masterRange.value) / 100);
      });
    }

    // Offset teks: Enter / blur → parse m:ss
    root.addEventListener("change", function (ev) {
      var t = ev.target;
      if (!t || !t.getAttribute) return;
      if (t.getAttribute("data-act") !== "off-text") return;
      var i = Number(t.getAttribute("data-i"));
      if (!tracks[i]) return;
      var sec = parseTime(t.value);
      if (!isFinite(sec)) {
        t.value = fmt(tracks[i].offset || 0);
        setStatus("Format waktu: m:ss atau detik (contoh 0:03 / 3)");
        return;
      }
      applyOffset(i, sec, { fromText: true });
    });
    root.addEventListener("keydown", function (ev) {
      var t = ev.target;
      if (!t || !t.getAttribute) return;
      if (t.getAttribute("data-act") !== "off-text") return;
      if (ev.key === "Enter") {
        ev.preventDefault();
        t.blur(); // trigger change
      }
    });

    var fileInput = root.querySelector('input[data-amx="file"]');
    if (fileInput) {
      fileInput.onchange = function () {
        var f = fileInput.files && fileInput.files[0];
        addFile(f);
        fileInput.value = "";
      };
    }

    renderTracks();
    root.classList.add("is-open");
    setStatus("Siap · max " + MAX_TRACKS + " · vol/reverb per track · geser judul.");
  }

  global.SHAudioMixer = { open: open, MAX_TRACKS: MAX_TRACKS };
})(typeof window !== "undefined" ? window : this);
