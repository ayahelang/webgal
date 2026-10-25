/**
 * SHAudioMixer — multi-track (max 8)
 * Master timeline + playhead, volume & reverb per track,
 * overdub offset, panel draggable, Simpan WAV/WebM + Kirim (WebM ke chat).
 */
(function (global) {
  "use strict";
  var MAX_TRACKS = 8;

  function escHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

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
      '<div class="amx-backdrop" data-amx="backdrop"></div>' +
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
      '    <button type="button" class="btn btn-ghost amx-nav amx-nav-skip" data-amx="skip-back" title="-5 dtk">◀◀</button>' +
      '    <button type="button" class="btn btn-ghost amx-nav amx-nav-play" data-amx="play" title="Play">▶</button>' +
      '    <button type="button" class="btn btn-ghost amx-nav amx-nav-stop" data-amx="stop" title="Stop">■</button>' +
      '    <button type="button" class="btn btn-ghost amx-nav amx-nav-skip" data-amx="skip-fwd" title="+5 dtk">▶▶</button>' +
      '    <button type="button" class="btn btn-ghost amx-nav" data-amx="to-end" title="Akhir">⏭</button>' +
      '    <div class="amx-level-bar" data-amx="levelbar" hidden title="Peak meter (hijau aman · kuning hati-hati · merah clipping)">' +
      '      <span class="chat-voice-dot amx-dot" data-amx="recdot" hidden aria-hidden="true"></span>' +
      '      <span class="amx-timer" data-amx="timer" hidden>00:00</span>' +
      '      <canvas class="amx-meter amx-peak-canvas" data-amx="meter" width="110" height="16" aria-hidden="true"></canvas>' +
      '      <span class="amx-rec-offset muted" data-amx="recoffset" hidden></span>' +
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
      '    <button type="button" class="btn btn-ghost amx-sm amx-hist-btn" data-amx="undo" title="Undo (kosong)" disabled>↶ Undo</button>' +
      '    <button type="button" class="btn btn-ghost amx-sm amx-hist-btn" data-amx="redo" title="Redo (kosong)" disabled>↷ Redo</button>' +
      '    <span class="amx-foot-spacer"></span>' +
      '    <button type="button" class="btn btn-ghost amx-sm" data-amx="close">Batal</button>' +
      '    <button type="button" class="btn btn-ghost amx-sm" data-amx="download-wav" title="Kualitas penuh">⬇ WAV</button>' +
      '    <button type="button" class="btn btn-ghost amx-sm" data-amx="download-mp3" title="MP3 128kbps (lamejs)">⬇ MP3</button>' +
      '    <button type="button" class="btn btn-ghost amx-sm" data-amx="download-webm" title="WebM/Opus kompres">⬇ WebM</button>' +
      '    <button type="button" class="btn btn-primary amx-sm" data-amx="export" hidden>Kirim</button>' +
      "  </footer>" +
      "</div>";
    document.body.appendChild(root);

    var tracks = [];
    var undoStack = [];
    var redoStack = [];
    var MAX_HISTORY = 5;
    var historySuspended = false;
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
    var levelBar = root.querySelector("[data-amx=levelbar]");
    var recBar = levelBar; // alias kompatibilitas
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
    var soloPlayIdx = -1; // track index for per-track play, -1 = mix play
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

    function cloneTracksState() {
      return tracks.map(function (tr) {
        return {
          buffer: tr.buffer,
          name: tr.name,
          muted: !!tr.muted,
          solo: !!tr.solo,
          offset: tr.offset || 0,
          volume: typeof tr.volume === "number" ? tr.volume : 1,
          reverb: typeof tr.reverb === "number" ? tr.reverb : 0,
          semitones: typeof tr.semitones === "number" ? tr.semitones : 0,
          refTrack: typeof tr.refTrack === "number" ? tr.refTrack : -1,
          expanded: !!tr.expanded,
          balance: typeof tr.balance === "number" ? tr.balance : 0,
          trimIn: typeof tr.trimIn === "number" ? tr.trimIn : 0,
          trimOut: tr.trimOut == null ? null : tr.trimOut,
        };
      });
    }
    function pushHistory() {
      if (historySuspended) return;
      undoStack.push(cloneTracksState());
      if (undoStack.length > MAX_HISTORY) undoStack.shift();
      redoStack = [];
      updateHistoryButtons();
    }
    function restoreTracksState(snap) {
      historySuspended = true;
      stopPlayback(true);
      tracks = snap.map(function (s) {
        return {
          buffer: s.buffer,
          name: s.name,
          muted: s.muted,
          solo: s.solo,
          offset: s.offset,
          volume: s.volume,
          reverb: s.reverb,
          semitones: s.semitones,
          refTrack: s.refTrack,
          expanded: s.expanded,
          balance: s.balance,
          trimIn: s.trimIn,
          trimOut: s.trimOut,
        };
      });
      historySuspended = false;
      renderTracks();
      updateHistoryButtons();
    }
    function undo() {
      if (!undoStack.length) {
        setStatus("Tidak ada undo.");
        return;
      }
      redoStack.push(cloneTracksState());
      if (redoStack.length > MAX_HISTORY) redoStack.shift();
      restoreTracksState(undoStack.pop());
      setStatus("Undo · sisa " + undoStack.length);
    }
    function redo() {
      if (!redoStack.length) {
        setStatus("Tidak ada redo.");
        return;
      }
      undoStack.push(cloneTracksState());
      if (undoStack.length > MAX_HISTORY) undoStack.shift();
      restoreTracksState(redoStack.pop());
      setStatus("Redo · sisa " + redoStack.length);
    }
    function updateHistoryButtons() {
      var u = root.querySelector('[data-amx="undo"]');
      var r = root.querySelector('[data-amx="redo"]');
      if (u) {
        u.disabled = !undoStack.length;
        u.title = undoStack.length
          ? "Undo (" + undoStack.length + "/" + MAX_HISTORY + ")"
          : "Undo (kosong)";
      }
      if (r) {
        r.disabled = !redoStack.length;
        r.title = redoStack.length
          ? "Redo (" + redoStack.length + "/" + MAX_HISTORY + ")"
          : "Redo (kosong)";
      }
    }

    function trackTrimIn(tr) {
      if (!tr || !tr.buffer) return 0;
      var ti = typeof tr.trimIn === "number" ? tr.trimIn : 0;
      return Math.max(0, Math.min(tr.buffer.duration, ti));
    }
    function trackTrimOut(tr) {
      if (!tr || !tr.buffer) return 0;
      var to = tr.trimOut == null ? tr.buffer.duration : Number(tr.trimOut);
      if (!isFinite(to)) to = tr.buffer.duration;
      var ti = trackTrimIn(tr);
      return Math.max(ti + 0.05, Math.min(tr.buffer.duration, to));
    }
    function trackActiveDur(tr) {
      if (!tr || !tr.buffer) return 0;
      return Math.max(0.05, trackTrimOut(tr) - trackTrimIn(tr));
    }

    function maxDur() {
      var m = 0;
      tracks.forEach(function (t) {
        if (!t.buffer) return;
        var end = (t.offset || 0) + trackActiveDur(t);
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

    function showLevelBar(mode) {
      // mode: "play" | "rec" | "off"
      if (!levelBar) return;
      if (mode === "off") {
        levelBar.hidden = true;
        levelBar.classList.remove("is-rec", "is-play");
        return;
      }
      levelBar.hidden = false;
      levelBar.classList.toggle("is-rec", mode === "rec");
      levelBar.classList.toggle("is-play", mode === "play");
      var dot = root.querySelector("[data-amx=recdot]");
      var tim = root.querySelector("[data-amx=timer]");
      var off = root.querySelector("[data-amx=recoffset]");
      if (dot) dot.hidden = mode !== "rec";
      if (tim) tim.hidden = mode !== "rec";
      if (off) off.hidden = mode !== "rec";
    }

    function stopMeter() {
      if (meterRaf) cancelAnimationFrame(meterRaf);
      meterRaf = 0;
      try {
        if (meterSource) meterSource.disconnect();
      } catch (e) {}
      meterSource = null;
      // Lepas analyser dari master (playback meter) tanpa memutus destination
      try {
        if (meterAnalyser && masterGainNode) masterGainNode.disconnect(meterAnalyser);
      } catch (e) {}
      meterAnalyser = null;
      drawPeakMeter._smooth = 0;
      if (canvas) {
        try {
          var c = canvas.getContext("2d");
          if (c) c.clearRect(0, 0, canvas.width, canvas.height);
        } catch (e) {}
      }
      if (!isPlaying && !isRecording) showLevelBar("off");
    }

    /** Peak horizontal: hijau <60% · kuning 60–85% · merah >85% (risiko clipping) */
    function drawPeakMeter(analyser, g, w, h, dataTime) {
      analyser.getByteTimeDomainData(dataTime);
      var peak = 0;
      for (var i = 0; i < dataTime.length; i++) {
        var v = Math.abs(dataTime[i] - 128) / 128;
        if (v > peak) peak = v;
      }
      // sedikit smoothing visual
      drawPeakMeter._smooth = (drawPeakMeter._smooth || 0) * 0.55 + peak * 0.45;
      peak = drawPeakMeter._smooth;
      g.clearRect(0, 0, w, h);
      // track background
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.fillRect(0, 0, w, h);
      var segments = 24;
      var gap = 1;
      var bw = (w - gap * (segments - 1)) / segments;
      var lit = Math.round(peak * segments);
      for (var s = 0; s < segments; s++) {
        var x = s * (bw + gap);
        var ratio = (s + 1) / segments;
        var on = s < lit;
        var col;
        if (ratio <= 0.6) col = on ? "#3ddc84" : "rgba(61,220,132,0.18)";
        else if (ratio <= 0.85) col = on ? "#ffc850" : "rgba(255,200,80,0.18)";
        else col = on ? "#ff4d6d" : "rgba(255,77,109,0.18)";
        g.fillStyle = col;
        g.fillRect(x, 2, bw, h - 4);
      }
      // clip marker
      if (peak >= 0.92) {
        g.fillStyle = "#ff1a3c";
        g.fillRect(w - 3, 0, 3, h);
      }
    }

    function runMeterLoop() {
      if (!meterAnalyser || !canvas) return;
      var g = canvas.getContext("2d");
      if (!g) return;
      var dataTime = new Uint8Array(meterAnalyser.fftSize);
      function draw() {
        meterRaf = requestAnimationFrame(draw);
        if (!meterAnalyser || !g) return;
        drawPeakMeter(meterAnalyser, g, canvas.width, canvas.height, dataTime);
      }
      draw();
    }

    function startMeter(stream) {
      stopMeter();
      if (!canvas || !stream) return;
      try {
        var ctx = ensureCtx();
        meterSource = ctx.createMediaStreamSource(stream);
        meterAnalyser = ctx.createAnalyser();
        meterAnalyser.fftSize = 1024;
        meterAnalyser.smoothingTimeConstant = 0.3;
        meterSource.connect(meterAnalyser);
        showLevelBar("rec");
        runMeterLoop();
      } catch (e) {}
    }

    /** Peak meter dari master bus saat playback */
    function startPlayMeter() {
      stopMeter();
      if (!canvas) return;
      try {
        var dest = ensureMasterGain();
        meterAnalyser = audioCtx.createAnalyser();
        meterAnalyser.fftSize = 1024;
        meterAnalyser.smoothingTimeConstant = 0.25;
        dest.connect(meterAnalyser);
        meterSource = null; // tidak disconnect master
        showLevelBar("play");
        runMeterLoop();
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
          var kn0 = listEl.querySelector('[data-amx-prog-knob="' + idx + '"]');
          if (kn0) kn0.style.left = "0%";
          continue;
        }
        var off = tr.offset || 0;
        var tIn = trackTrimIn(tr);
        var tOut = trackTrimOut(tr);
        var activeDur = tOut - tIn;
        var local = playhead - off;
        var p = 0;
        if (local <= 0) p = 0;
        else if (local >= activeDur) p = 1;
        else p = local / activeDur;
        // map playhead onto full-buffer bar: trimIn..trimOut region
        var pBar = activeDur > 0 ? (tIn + p * activeDur) / tr.buffer.duration : 0;
        el.style.width = pBar * 100 + "%";
        var kn = listEl.querySelector('[data-amx-prog-knob="' + idx + '"]');
        if (kn) kn.style.left = pBar * 100 + "%";
        var hin = listEl.querySelector('[data-amx-trim-in="' + idx + '"]');
        var hout = listEl.querySelector('[data-amx-trim-out="' + idx + '"]');
        var reg = listEl.querySelector('[data-amx-trim-reg="' + idx + '"]');
        var pin = tIn / tr.buffer.duration;
        var pout = tOut / tr.buffer.duration;
        if (hin) hin.style.left = pin * 100 + "%";
        if (hout) hout.style.left = pout * 100 + "%";
        if (reg) {
          reg.style.left = pin * 100 + "%";
          reg.style.width = Math.max(0, (pout - pin) * 100) + "%";
        }
      }
    }

    function startTransportLoop() {
      stopTransportLoop();
      function tick() {
        transportRaf = requestAnimationFrame(tick);
        updateTransportUI();
        drawTrackPeaks();
        var total = maxDur();
        if (isPlaying && !isRecording && total > 0 && currentPlayhead() >= total + 0.05) {
          stopPlayback(true);
        }
      }
      transportRaf = requestAnimationFrame(tick);
    }

    function drawTrackPeaks() {
      if (!listEl) return;
      var data = new Uint8Array(512);
      liveGains.forEach(function (g) {
        if (!g.analyser || !g.track) return;
        var ti = tracks.indexOf(g.track);
        if (ti < 0) return;
        var canvas = listEl.querySelector('[data-amx-trkmeter="' + ti + '"]');
        if (!canvas) return;
        var ctx2 = canvas.getContext("2d");
        if (!ctx2) return;
        try {
          g.analyser.getByteTimeDomainData(data);
        } catch (e) {
          return;
        }
        var peak = 0;
        for (var i = 0; i < data.length; i++) {
          var v = Math.abs(data[i] - 128) / 128;
          if (v > peak) peak = v;
        }
        var w = canvas.width;
        var h = canvas.height;
        ctx2.clearRect(0, 0, w, h);
        ctx2.fillStyle = "rgba(0,0,0,0.35)";
        ctx2.fillRect(0, 0, w, h);
        var segs = 14;
        var gap = 1;
        var bw = (w - gap * (segs - 1)) / segs;
        var lit = Math.round(peak * segs);
        for (var s = 0; s < segs; s++) {
          var ratio = (s + 1) / segs;
          var on = s < lit;
          var col =
            ratio <= 0.6
              ? on
                ? "#3ddc84"
                : "rgba(61,220,132,0.18)"
              : ratio <= 0.85
                ? on
                  ? "#ffc850"
                  : "rgba(255,200,80,0.18)"
                : on
                  ? "#ff4d6d"
                  : "rgba(255,77,109,0.18)";
          ctx2.fillStyle = col;
          ctx2.fillRect(s * (bw + gap), 2, bw, h - 4);
        }
      });
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
      if (!isRecording) stopMeter();
      setTrackMetersVisible(false);
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

    /** Volume efektif live: 0 jika mute / tidak solo saat ada solo */

    /** Estimasi kunci dari buffer (chromagram lokal — tanpa API cloud) */
    function estimateKeyFromBuffer(buffer) {
      if (!buffer || !buffer.length) return null;
      var sr = buffer.sampleRate;
      var ch0 = buffer.getChannelData(0);
      var n = ch0.length;
      var maxN = Math.min(n, Math.floor(sr * 12));
      var start = Math.max(0, Math.floor((n - maxN) / 2));
      var chroma = new Float32Array(12);
      var frame = Math.floor(sr * 0.046);
      for (var i = start; i + frame < start + maxN; i += frame) {
        var bestLag = 0;
        var bestCorr = 0;
        var minLag = Math.floor(sr / 500);
        var maxLag = Math.floor(sr / 80);
        for (var lag = minLag; lag < maxLag && lag < frame; lag++) {
          var c = 0;
          var lim = Math.min(frame, 360);
          for (var k = 0; k < lim; k++) c += ch0[i + k] * ch0[i + k + lag];
          if (c > bestCorr) {
            bestCorr = c;
            bestLag = lag;
          }
        }
        if (bestLag > 0 && bestCorr > 0.01) {
          var freq = sr / bestLag;
          var midi = 69 + 12 * (Math.log(freq / 440) / Math.LN2);
          if (isFinite(midi) && midi > 20 && midi < 100) {
            var pc = ((Math.round(midi) % 12) + 12) % 12;
            chroma[pc] += bestCorr;
          }
        }
      }
      var major = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
      var minor = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
      var names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      var best = { score: -1e9, root: 0, mode: "major" };
      function corr(profile, shift) {
        var s = 0;
        for (var p = 0; p < 12; p++) s += chroma[p] * profile[(p - shift + 12) % 12];
        return s;
      }
      for (var r = 0; r < 12; r++) {
        var sm = corr(major, r);
        var sn = corr(minor, r);
        if (sm > best.score) best = { score: sm, root: r, mode: "major" };
        if (sn > best.score) best = { score: sn, root: r, mode: "minor" };
      }
      var sum = 0;
      for (var z = 0; z < 12; z++) sum += chroma[z];
      if (sum < 1e-6) return null;
      return {
        root: best.root,
        mode: best.mode,
        name: names[best.root] + (best.mode === "major" ? " mayor" : " minor"),
        suggestS2: best.mode === "minor" ? 3 : 4,
        suggestS2Down: best.mode === "minor" ? -3 : -4,
        suggestS3: 7,
        suggestS3Down: -7,
      };
    }

    function applyHarmonySuggestion(trackIdx, kind) {
      var tr = tracks[trackIdx];
      if (!tr) return;
      var refIdx = typeof tr.refTrack === "number" ? tr.refTrack : -1;
      if (refIdx < 0 || !tracks[refIdx] || !tracks[refIdx].buffer) {
        setStatus("Pilih track patokan (musik pengiring) dulu.");
        return;
      }
      setStatus("Menganalisis kunci track patokan…");
      var key = null;
      try {
        key = estimateKeyFromBuffer(tracks[refIdx].buffer);
      } catch (e) {}
      if (!key) {
        setStatus("Gagal deteksi kunci (sinyal lemah). Coba interval manual di Harm.");
        return;
      }
      var semi = 0;
      if (kind === "s2up") semi = key.suggestS2;
      else if (kind === "s2dn") semi = key.suggestS2Down;
      else if (kind === "s3up") semi = key.suggestS3;
      else if (kind === "s3dn") semi = key.suggestS3Down;
      tr.semitones = semi;
      applyLiveVolumes();
      renderTracks();
      setStatus(
        "T" +
          (trackIdx + 1) +
          " harmoni " +
          (semi > 0 ? "+" : "") +
          semi +
          " st · patokan T" +
          (refIdx + 1) +
          " ≈ " +
          key.name
      );
    }

    function effectiveTrackVol(tr) {
      if (!tr || !tr.buffer) return 0;
      if (!isTrackActive(tr)) return 0;
      return typeof tr.volume === "number" ? tr.volume : 1;
    }

    /** Hubungkan buffer source dengan gain + reverb send → master */
    function connectTrackLive(src, tr) {
      ensureCtx();
      var dest = ensureMasterGain();
      var vol = effectiveTrackVol(tr);
      var rev = typeof tr.reverb === "number" ? tr.reverb : 0;
      var semi = typeof tr.semitones === "number" ? tr.semitones : 0;
      var bal = typeof tr.balance === "number" ? tr.balance : 0;
      try {
        src.detune.value = semi * 100;
      } catch (e) {}
      var dry = audioCtx.createGain();
      dry.gain.value = vol;
      src.connect(dry);
      var panNode = null;
      try {
        panNode = audioCtx.createStereoPanner();
        panNode.pan.value = Math.max(-1, Math.min(1, bal));
        dry.connect(panNode);
        panNode.connect(dest);
      } catch (e) {
        dry.connect(dest);
      }
      var wetGain = null;
      ensureReverb();
      wetGain = audioCtx.createGain();
      wetGain.gain.value = vol * rev;
      src.connect(wetGain);
      try {
        if (panNode) {
          var wetPan = audioCtx.createStereoPanner();
          wetPan.pan.value = Math.max(-1, Math.min(1, bal));
          wetGain.connect(wetPan);
          wetPan.connect(sharedConvolver);
          panNode._wetPan = wetPan;
        } else {
          wetGain.connect(sharedConvolver);
        }
      } catch (e2) {
        wetGain.connect(sharedConvolver);
      }
      var trkAn = null;
      try {
        trkAn = audioCtx.createAnalyser();
        trkAn.fftSize = 512;
        trkAn.smoothingTimeConstant = 0.3;
        dry.connect(trkAn);
      } catch (e) {}
      liveGains.push({
        dry: dry,
        wet: wetGain,
        track: tr,
        src: src,
        analyser: trkAn,
        pan: panNode,
        wetPan: panNode && panNode._wetPan,
      });
    }

    function applyLiveVolumes() {
      liveGains.forEach(function (g) {
        if (!g.track) return;
        var vol = effectiveTrackVol(g.track);
        var rev = typeof g.track.reverb === "number" ? g.track.reverb : 0;
        var semi = typeof g.track.semitones === "number" ? g.track.semitones : 0;
        var bal = typeof g.track.balance === "number" ? g.track.balance : 0;
        bal = Math.max(-1, Math.min(1, bal));
        try {
          if (g.dry) g.dry.gain.value = vol;
          if (g.wet) g.wet.gain.value = vol * rev;
          if (g.src && g.src.detune) g.src.detune.value = semi * 100;
          if (g.pan) g.pan.pan.value = bal;
          if (g.wetPan) g.wetPan.pan.value = bal;
        } catch (e) {}
      });
      if (masterGainNode) {
        try {
          masterGainNode.gain.value = masterGain;
        } catch (e) {}
      }
    }

    function scheduleTrack(tr, head, t0) {
      // Selalu schedule track yang punya buffer agar mute/unmute/solo live (gain 0/1)
      if (!tr || !tr.buffer) return null;
      var off = tr.offset || 0;
      var tIn = trackTrimIn(tr);
      var tOut = trackTrimOut(tr);
      var activeDur = tOut - tIn;
      if (head >= off + activeDur) return null;
      var when = t0;
      var offsetInBuffer = tIn;
      if (head > off) {
        offsetInBuffer = tIn + (head - off);
      } else {
        when = t0 + (off - head);
        offsetInBuffer = tIn;
      }
      if (offsetInBuffer >= tOut - 0.001) return null;
      var remaining = tOut - offsetInBuffer;
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
      soloPlayIdx = -1;

      tracks.forEach(function (tr) {
        var src = scheduleTrack(tr, head, playStartedAtCtx);
        if (src) playing.push(src);
      });
      startTransportLoop();
      startPlayMeter();
      setTrackMetersVisible(true);
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
        var semi = typeof tr.semitones === "number" ? tr.semitones : 0;
        var bal = typeof tr.balance === "number" ? tr.balance : 0;
        // Slider max: at least timeline length, current offset, 60s
        var offMax = Math.max(60, Math.ceil(maxDur() || 0), Math.ceil(offSec) + 30);
        if (offMax < 1) offMax = 60;
        var refOpts =
          '<option value="-1"' +
          (typeof tr.refTrack !== "number" || tr.refTrack < 0 ? " selected" : "") +
          ">— pilih patokan —</option>";
        tracks.forEach(function (t2, j) {
          if (j === idx) return;
          var nm = String(t2.name || "Track " + (j + 1))
            .replace(/\s*@\d+:\d{2}\s*$/, "")
            .trim()
            .slice(0, 32);
          refOpts +=
            '<option value="' +
            j +
            '"' +
            (tr.refTrack === j ? " selected" : "") +
            ">T" +
            (j + 1) +
            " " +
            nm.replace(/</g, "") +
            "</option>";
        });
        row.innerHTML =
          '<div class="amx-track-hd">' +
          '<span class="amx-track-idx">T' +
          (idx + 1) +
          "</span>" +
          '<span class="amx-track-name" contenteditable="true" spellcheck="false" data-act="rename" data-i="' +
          idx +
          '" title="Klik untuk ganti nama track">' +
          escHtml(
            String(tr.name || "Track " + (idx + 1)).replace(/\s*@\d+:\d{2}\s*$/, "").trim() ||
              "Track " + (idx + 1)
          ) +
          "</span>" +
          '<span class="amx-track-dur">' +
          fmt(tr.buffer ? tr.buffer.duration : 0) +
          offLabel +
          "</span>" +
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
          '" title="Solo">' +
          (tr.solo ? "S●" : "S") +
          "</button>" +
          '<button type="button" class="btn btn-ghost amx-xs" data-act="mute" data-i="' +
          idx +
          '" title="' +
          (tr.muted ? "Unmute" : "Mute") +
          '">' +
          (tr.muted ? "M●" : "M") +
          "</button>" +
          '<button type="button" class="btn btn-ghost amx-xs amx-trk-play' +
          (soloPlayIdx === idx && isPlaying ? " is-playing" : "") +
          '" data-act="solo-play" data-i="' +
          idx +
          '" title="Klik: play/pause · tekan lama: stop">' +
          (soloPlayIdx === idx && isPlaying ? "⏸" : "▶") +
          "</button>" +
          '<button type="button" class="btn btn-ghost amx-xs amx-del" data-act="del" data-i="' +
          idx +
          '" title="Hapus track">✕</button>' +
          "</div>" +
          '<button type="button" class="btn btn-ghost amx-fold" data-act="fold" data-i="' +
          idx +
          '" title="' +
          (tr.expanded ? "Ciutkan track" : "Bentangkan track") +
          '">' +
          (tr.expanded ? "⊟" : "⊞") +
          "</button>" +
          "</div>" +
          '<div class="amx-track-playhead amx-detail-block" data-act="trk-scrub" data-i="' +
          idx +
          '" title="Playhead track — klik seek · geser knob hijau/merah untuk potong ujung">' +
          '<div class="amx-track-trim-reg" data-amx-trim-reg="' +
          idx +
          '"></div>' +
          '<div class="amx-track-playhead-fill" data-amx-prog="' +
          idx +
          '"></div>' +
          '<div class="amx-track-playhead-knob" data-amx-prog-knob="' +
          idx +
          '"></div>' +
          '<div class="amx-track-trim-in" data-amx-trim-in="' +
          idx +
          '" data-act="trk-trim-in" data-i="' +
          idx +
          '" title="Awal region track (buang bagian kotor di depan)"></div>' +
          '<div class="amx-track-trim-out" data-amx-trim-out="' +
          idx +
          '" data-act="trk-trim-out" data-i="' +
          idx +
          '" title="Akhir region track (buang bagian kotor di belakang)"></div>' +
          "</div>" +
          '<div class="amx-track-grid amx-detail-block">' +
          '<div class="amx-track-col-l">' +
          '<div class="amx-row-bal">' +
          '<label class="amx-slider-lab amx-bal-lab" title="Balance kiri/kanan (−100 … +100)">' +
          'Bal <input type="range" min="-100" max="100" value="' +
          Math.round(bal * 100) +
          '" data-act="bal" data-i="' +
          idx +
          '"><span data-amx-balval="' +
          idx +
          '">' +
          Math.round(bal * 100) +
          "</span></label>" +
          '<canvas class="amx-track-peak" data-amx-trkmeter="' +
          idx +
          '" width="72" height="14" title="Peak meter" aria-hidden="true"></canvas>' +
          "</div>" +
          '<label class="amx-slider-lab amx-vol-lab" title="Volume">Vol <input type="range" min="0" max="150" value="' +
          Math.round(vol * 100) +
          '" data-act="vol" data-i="' +
          idx +
          '"><span data-amx-volval="' +
          idx +
          '">' +
          Math.round(vol * 100) +
          "%</span></label>" +
          '<label class="amx-slider-lab amx-offset-lab" title="Waktu mulai">' +
          '<input type="text" class="amx-off-input" data-act="off-text" data-i="' +
          idx +
          '" value="' +
          fmt(offSec) +
          '" inputmode="numeric" aria-label="Waktu mulai">' +
          ' Start <input type="range" min="0" max="' +
          offMax +
          '" step="0.1" value="' +
          offSec.toFixed(1) +
          '" data-act="off" data-i="' +
          idx +
          '"></label>' +
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
          '<div class="amx-track-col-r">' +
          '<label class="amx-slider-lab amx-harm-lab" title="Harmoni">' +
          'Harm <select class="amx-harm-sel" data-act="harm" data-i="' +
          idx +
          '">' +
          '<option value="0"' +
          (semi === 0 ? " selected" : "") +
          ">Ori</option>" +
          '<option value="3"' +
          (semi === 3 ? " selected" : "") +
          ">S2 ↑ +3</option>" +
          '<option value="4"' +
          (semi === 4 ? " selected" : "") +
          ">S2 ↑ +4</option>" +
          '<option value="-3"' +
          (semi === -3 ? " selected" : "") +
          ">S2 ↓ −3</option>" +
          '<option value="-4"' +
          (semi === -4 ? " selected" : "") +
          ">S2 ↓ −4</option>" +
          '<option value="7"' +
          (semi === 7 ? " selected" : "") +
          ">S3 ↑ +7</option>" +
          '<option value="-7"' +
          (semi === -7 ? " selected" : "") +
          ">S3 ↓ −7</option>" +
          '<option value="12"' +
          (semi === 12 ? " selected" : "") +
          ">Oktaf ↑</option>" +
          '<option value="-12"' +
          (semi === -12 ? " selected" : "") +
          ">Oktaf ↓</option>" +
          "</select></label>" +
          '<label class="amx-slider-lab amx-ref-lab" title="Patokan">' +
          'Patokan <select class="amx-ref-sel" data-act="ref" data-i="' +
          idx +
          '">' +
          refOpts +
          "</select></label>" +
          '<div class="amx-harm-suggest">' +
          '<button type="button" class="btn btn-ghost amx-xs amx-trk-mark" data-act="trk-mark-in" data-i="' +
          idx +
          '" title="Mark In di playhead (knob hijau)">In</button>' +
          '<button type="button" class="btn btn-ghost amx-xs amx-trk-mark" data-act="trk-mark-out" data-i="' +
          idx +
          '" title="Mark Out di playhead (knob merah)">Out</button>' +
          '<button type="button" class="btn btn-ghost amx-xs" data-act="harm-s2up" data-i="' +
          idx +
          '" title="S2 naik">S2↑</button>' +
          '<button type="button" class="btn btn-ghost amx-xs" data-act="harm-s2dn" data-i="' +
          idx +
          '" title="S2 turun">S2↓</button>' +
          '<button type="button" class="btn btn-ghost amx-xs" data-act="harm-s3up" data-i="' +
          idx +
          '" title="S3 naik">S3↑</button>' +
          '<button type="button" class="btn btn-ghost amx-xs" data-act="harm-s3dn" data-i="' +
          idx +
          '" title="S3 turun">S3↓</button>' +
          "</div>" +
          "</div>" +
          "</div>";
        if (!tr.expanded) row.classList.add("is-collapsed");
        else row.classList.remove("is-collapsed");

        listEl.appendChild(row);
      });
      setStatus(tracks.length + "/" + MAX_TRACKS + " · total " + fmt(maxDur()));
      updateTransportUI();
      setTrackMetersVisible(isPlaying);
    }

    function addBuffer(buffer, name, offsetSec) {
      if (tracks.length >= MAX_TRACKS) {
        setStatus("Maks. " + MAX_TRACKS + " track.");
        return false;
      }
      pushHistory();
      tracks.push({
        id: "t" + Date.now() + Math.random().toString(36).slice(2, 6),
        name: name || "Track " + (tracks.length + 1),
        buffer: buffer,
        muted: false,
        solo: false,
        offset: Math.max(0, offsetSec || 0),
        volume: 1,
        reverb: 0,
        semitones: 0,
        refTrack: -1,
        expanded: false,
        balance: 0,
        trimIn: 0,
        trimOut: null,
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
          showLevelBar("rec");
        } else if (!isPlaying) {
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
        var tIn = trackTrimIn(t);
        var tOut = trackTrimOut(t);
        var activeDur = tOut - tIn;
        var trackStart = off;
        var trackEnd = off + activeDur;
        // irisan dengan [start, end]
        var playStart = Math.max(trackStart, start);
        var playEnd = Math.min(trackEnd, end);
        if (playEnd - playStart < 0.01) return;
        var when = playStart - start; // posisi di buffer offline
        var offsetInBuffer = tIn + (playStart - off);
        var len = playEnd - playStart;
        var src = offline.createBufferSource();
        src.buffer = t.buffer;
        var vol = typeof t.volume === "number" ? t.volume : 1;
        var rev = typeof t.reverb === "number" ? t.reverb : 0;
        var semi = typeof t.semitones === "number" ? t.semitones : 0;
        try {
          src.detune.value = semi * 100;
        } catch (e) {}
        var bal = typeof t.balance === "number" ? t.balance : 0;
        var dry = offline.createGain();
        dry.gain.value = vol;
        src.connect(dry);
        try {
          var panO = offline.createStereoPanner();
          panO.pan.value = Math.max(-1, Math.min(1, bal));
          dry.connect(panO);
          panO.connect(master);
        } catch (e3) {
          dry.connect(master);
        }
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
        var tg = ev.target;
        if (tg && tg.closest) {
          if (tg.closest("[data-amx=close]")) return;
          if (tg.closest("[data-amx=promo]")) return;
          if (tg.closest("a,button,input,select,textarea,label")) return;
        }
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

    // Full Mixer: pastikan buka tab baru (header drag tidak menelan klik)
    (function bindPromo() {
      var a = root.querySelector("a[data-amx=promo], a.amx-promo");
      if (!a) return;
      a.addEventListener(
        "click",
        function (ev) {
          ev.stopPropagation();
          var url = a.getAttribute("href") || "https://mixer.silverhawk.web.id";
          try {
            window.open(url, "_blank", "noopener,noreferrer");
          } catch (e) {}
          ev.preventDefault();
        },
        true
      );
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
      if (t.closest && t.closest("[data-amx=promo]")) {
        // biarkan navigasi native; jaga-jaga buka tab baru
        var a = t.closest("a[data-amx=promo]") || t.closest("a.amx-promo");
        if (a && a.href) {
          try {
            window.open(a.href, "_blank", "noopener,noreferrer");
          } catch (e) {}
          if (ev && ev.preventDefault) ev.preventDefault();
        }
        return;
      }
      if (amx === "close") close();
      else if (amx === "undo") undo();
      else if (amx === "redo") redo();
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
        applyLiveVolumes();
        renderTracks();
        setStatus("Semua di-mute.");
      } else if (amx === "unmute-all") {
        tracks.forEach(function (tr) {
          tr.muted = false;
          tr.solo = false;
        });
        applyLiveVolumes();
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
      if (act === "rename" || act === "harm" || act === "ref") return;
      if (act === "trk-mark-in") {
        var mi = Number(t.getAttribute("data-i"));
        var tm = tracks[mi];
        if (!tm || !tm.buffer) return;
        pushHistory();
        var ad = trackActiveDur(tm);
        var loc = currentPlayhead() - (tm.offset || 0);
        loc = Math.max(0, Math.min(ad, loc));
        var bufPos = trackTrimIn(tm) + loc;
        if (currentPlayhead() < (tm.offset || 0)) bufPos = trackTrimIn(tm);
        bufPos = Math.max(0, Math.min(trackTrimOut(tm) - 0.05, bufPos));
        tm.trimIn = bufPos;
        updateTransportUI();
        setStatus("T" + (mi + 1) + " Mark In @ " + fmt(tm.trimIn));
        return;
      }
      if (act === "trk-mark-out") {
        var mo = Number(t.getAttribute("data-i"));
        var tmo = tracks[mo];
        if (!tmo || !tmo.buffer) return;
        pushHistory();
        var ad2 = trackActiveDur(tmo);
        var loc2 = currentPlayhead() - (tmo.offset || 0);
        loc2 = Math.max(0, Math.min(ad2, loc2));
        var bufPos2 = trackTrimIn(tmo) + loc2;
        if (currentPlayhead() > (tmo.offset || 0) + ad2) bufPos2 = trackTrimOut(tmo);
        bufPos2 = Math.max(trackTrimIn(tmo) + 0.05, Math.min(tmo.buffer.duration, bufPos2));
        tmo.trimOut = bufPos2;
        updateTransportUI();
        setStatus("T" + (mo + 1) + " Mark Out @ " + fmt(tmo.trimOut));
        return;
      }
      if (act === "harm-s2up") {
        applyHarmonySuggestion(Number(t.getAttribute("data-i")), "s2up");
        return;
      }
      if (act === "harm-s2dn") {
        applyHarmonySuggestion(Number(t.getAttribute("data-i")), "s2dn");
        return;
      }
      if (act === "harm-s3up") {
        applyHarmonySuggestion(Number(t.getAttribute("data-i")), "s3up");
        return;
      }
      if (act === "harm-s3dn") {
        applyHarmonySuggestion(Number(t.getAttribute("data-i")), "s3dn");
        return;
      }
      if (act === "mute") {
        var i = Number(t.getAttribute("data-i"));
        if (tracks[i]) {
          tracks[i].muted = !tracks[i].muted;
          applyLiveVolumes();
          renderTracks();
        }
      } else if (act === "solo") {
        var si = Number(t.getAttribute("data-i"));
        if (tracks[si]) {
          tracks[si].solo = !tracks[si].solo;
          if (tracks[si].solo) tracks[si].muted = false;
          applyLiveVolumes();
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
        // handled by pointer handlers (play/pause · long-press stop)
        return;
      } else if (act === "fold") {
        var fi = Number(t.getAttribute("data-i"));
        if (tracks[fi]) {
          tracks[fi].expanded = !tracks[fi].expanded;
          renderTracks();
        }
      } else if (act === "trk-scrub") {
        // seek via pointer handler (bisa bedakan trim handle)
        return;
      } else if (act === "trk-trim-in" || act === "trk-trim-out") {
        return;
      }
    };

    // Seek + trim handles per track playhead
    (function bindTrackPlayheads() {
      var drag = null; // { i, mode: "scrub"|"in"|"out" }
      function posRatio(ev, box) {
        var rect = box.getBoundingClientRect();
        return Math.max(0, Math.min(1, (ev.clientX - rect.left) / Math.max(1, rect.width)));
      }
      function applyDrag(ev) {
        if (!drag || !tracks[drag.i] || !tracks[drag.i].buffer) return;
        var tr = tracks[drag.i];
        var box = listEl.querySelector(
          '.amx-track-playhead[data-i="' + drag.i + '"], .amx-track-playhead[data-act=trk-scrub][data-i="' + drag.i + '"]'
        );
        // fallback: closest from target
        if (!box && ev.target && ev.target.closest)
          box = ev.target.closest(".amx-track-playhead");
        if (!box) return;
        var x = posRatio(ev, box);
        var sec = x * tr.buffer.duration;
        if (drag.mode === "in") {
          var out = trackTrimOut(tr);
          tr.trimIn = Math.max(0, Math.min(out - 0.05, sec));
          updateTransportUI();
        } else if (drag.mode === "out") {
          var inn = trackTrimIn(tr);
          tr.trimOut = Math.max(inn + 0.05, Math.min(tr.buffer.duration, sec));
          updateTransportUI();
        } else {
          // scrub relative to full buffer → absolute timeline
          seekTo((tr.offset || 0) + Math.max(0, sec - trackTrimIn(tr)));
          // better: seek to offset + position within active region if click in region
          var tIn = trackTrimIn(tr);
          var tOut = trackTrimOut(tr);
          if (sec < tIn) seekTo(tr.offset || 0);
          else if (sec > tOut) seekTo((tr.offset || 0) + (tOut - tIn));
          else seekTo((tr.offset || 0) + (sec - tIn));
        }
      }
      root.addEventListener("pointerdown", function (ev) {
        if (!listEl) return;
        var hin = ev.target.closest && ev.target.closest("[data-amx-trim-in]");
        var hout = ev.target.closest && ev.target.closest("[data-amx-trim-out]");
        var bar = ev.target.closest && ev.target.closest(".amx-track-playhead");
        if (hin) {
          pushHistory();
          drag = { i: Number(hin.getAttribute("data-amx-trim-in")), mode: "in" };
        } else if (hout) {
          pushHistory();
          drag = { i: Number(hout.getAttribute("data-amx-trim-out")), mode: "out" };
        } else if (bar) {
          drag = { i: Number(bar.getAttribute("data-i")), mode: "scrub" };
        } else return;
        try {
          bar && bar.setPointerCapture && bar.setPointerCapture(ev.pointerId);
        } catch (e) {}
        applyDrag(ev);
        ev.preventDefault();
        ev.stopPropagation();
      });
      root.addEventListener("pointermove", function (ev) {
        if (!drag) return;
        applyDrag(ev);
      });
      function endD(ev) {
        if (!drag) return;
        var i = drag.i;
        var mode = drag.mode;
        drag = null;
        if (mode === "in" || mode === "out") {
          setStatus(
            "T" +
              (i + 1) +
              " region " +
              fmt(trackTrimIn(tracks[i])) +
              " – " +
              fmt(trackTrimOut(tracks[i]))
          );
          // restart play if needed so trim applies
          if (isPlaying && !isRecording) {
            var h = currentPlayhead();
            stopPlayback(true);
            playhead = h;
            if (soloPlayIdx === i) startSoloTrack(i, h);
            else if (soloPlayIdx < 0) playAll();
          }
        }
      }
      root.addEventListener("pointerup", endD);
      root.addEventListener("pointercancel", endD);
    })();


    function startSoloTrack(k, fromHead) {
      if (isRecording) return;
      if (!tracks[k] || !tracks[k].buffer) return;
      stopPlayback(true);
      ensureCtx();
      var tr = tracks[k];
      var head = fromHead != null ? fromHead : tr.offset || 0;
      playhead = head;
      playStartedAtHead = head;
      playStartedAtCtx = audioCtx.currentTime + 0.02;
      isPlaying = true;
      soloPlayIdx = k;
      var src = audioCtx.createBufferSource();
      src.buffer = tr.buffer;
      connectTrackLive(src, tr);
      var tIn = trackTrimIn(tr);
      var tOut = trackTrimOut(tr);
      var offIn = tIn + Math.max(0, head - (tr.offset || 0));
      if (offIn >= tOut) offIn = tIn;
      var rem = Math.max(0.05, tOut - offIn);
      try {
        src.start(playStartedAtCtx, offIn, rem);
      } catch (e) {
        try {
          src.start(playStartedAtCtx, offIn);
        } catch (e2) {}
      }
      playing.push(src);
      startTransportLoop();
      setTrackMetersVisible(true);
      renderTracks();
      setStatus("Play T" + (k + 1) + " @ " + fmt(head));
    }

    function pauseSoloOrMix() {
      if (!isPlaying) return;
      playhead = currentPlayhead();
      stopPlayback(true);
      setTrackMetersVisible(false);
      setStatus("Pause @ " + fmt(playhead));
      renderTracks();
    }

    function stopSoloTrack(k) {
      stopPlayback(true);
      soloPlayIdx = -1;
      if (tracks[k]) playhead = tracks[k].offset || 0;
      setTrackMetersVisible(false);
      updateTransportUI();
      renderTracks();
      setStatus("Stop T" + (k + 1));
    }

    function setTrackMetersVisible(on) {
      if (!listEl) return;
      listEl.classList.toggle("amx-meters-on", !!on);
      var cans = listEl.querySelectorAll("[data-amx-trkmeter]");
      for (var i = 0; i < cans.length; i++) {
        var c = cans[i];
        var ti = Number(c.getAttribute("data-amx-trkmeter"));
        var show = !!on && (soloPlayIdx < 0 || soloPlayIdx === ti);
        c.classList.toggle("is-active", show);
        if (!show) {
          try {
            var g = c.getContext("2d");
            if (g) {
              g.clearRect(0, 0, c.width, c.height);
              // idle track
              g.fillStyle = "rgba(0,0,0,0.35)";
              g.fillRect(0, 0, c.width, c.height);
              var segs = 16;
              var gap = 1;
              var bw = (c.width - gap * (segs - 1)) / segs;
              for (var s = 0; s < segs; s++) {
                var ratio = (s + 1) / segs;
                g.fillStyle =
                  ratio <= 0.6
                    ? "rgba(61,220,132,0.2)"
                    : ratio <= 0.85
                      ? "rgba(255,200,80,0.2)"
                      : "rgba(255,77,109,0.2)";
                g.fillRect(s * (bw + gap), 2, bw, c.height - 4);
              }
            }
          } catch (e) {}
        }
      }
    }

    // Play/pause click + long-press stop on per-track ▶
    (function () {
      var lpTimer = null;
      var lpFired = false;
      root.addEventListener("pointerdown", function (ev) {
        var btn = ev.target && ev.target.closest && ev.target.closest('[data-act="solo-play"]');
        if (!btn || !root.contains(btn)) return;
        lpFired = false;
        var k = Number(btn.getAttribute("data-i"));
        lpTimer = setTimeout(function () {
          lpFired = true;
          stopSoloTrack(k);
        }, 550);
      });
      function clearLp() {
        if (lpTimer) clearTimeout(lpTimer);
        lpTimer = null;
      }
      root.addEventListener("pointerup", function (ev) {
        var btn = ev.target && ev.target.closest && ev.target.closest('[data-act="solo-play"]');
        clearLp();
        if (!btn || !root.contains(btn) || lpFired) return;
        if (isRecording) return;
        var k = Number(btn.getAttribute("data-i"));
        if (isPlaying && soloPlayIdx === k) {
          pauseSoloOrMix();
        } else if (isPlaying && soloPlayIdx !== k) {
          // resume from current playhead if same session pause on this track
          startSoloTrack(k, playhead > (tracks[k].offset || 0) ? playhead : tracks[k].offset || 0);
        } else if (!isPlaying && soloPlayIdx === k && playhead > (tracks[k].offset || 0)) {
          startSoloTrack(k, playhead);
        } else {
          startSoloTrack(k, tracks[k].offset || 0);
        }
      });
      root.addEventListener("pointercancel", clearLp);
      root.addEventListener("pointerleave", function (ev) {
        if (ev.target && ev.target.getAttribute && ev.target.getAttribute("data-act") === "solo-play") clearLp();
      }, true);
    })();


    // Harmoni + patokan
    root.addEventListener("change", function (ev) {
      var t = ev.target;
      if (!t || !t.getAttribute) return;
      var act = t.getAttribute("data-act");
      var i = Number(t.getAttribute("data-i"));
      if (!tracks[i]) return;
      if (act === "harm") {
        tracks[i].semitones = Number(t.value) || 0;
        applyLiveVolumes();
        var lab =
          tracks[i].semitones === 0
            ? "Ori"
            : (tracks[i].semitones > 0 ? "+" : "") + tracks[i].semitones + " st";
        setStatus("T" + (i + 1) + " harmoni " + lab);
      } else if (act === "ref") {
        tracks[i].refTrack = Number(t.value);
        setStatus(
          "T" +
            (i + 1) +
            " patokan: " +
            (tracks[i].refTrack < 0 ? "—" : "T" + (tracks[i].refTrack + 1))
        );
      }
    });

    // Rename track (contenteditable)
    root.addEventListener("keydown", function (ev) {
      var t = ev.target;
      if (!t || !t.classList || !t.classList.contains("amx-track-name")) return;
      if (ev.key === "Enter") {
        ev.preventDefault();
        t.blur();
      }
    });
    root.addEventListener(
      "blur",
      function (ev) {
        var t = ev.target;
        if (!t || !t.classList || !t.classList.contains("amx-track-name")) return;
        var i = Number(t.getAttribute("data-i"));
        if (!tracks[i]) return;
        var name = (t.textContent || "").replace(/\s+/g, " ").trim();
        if (!name) name = "Track " + (i + 1);
        tracks[i].name = name;
        t.textContent = name;
        t.setAttribute("title", "Klik untuk ganti nama track");
      },
      true
    );

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
      } else if (act === "bal") {
        tracks[i].balance = Number(t.value) / 100;
        var labB = root.querySelector('[data-amx-balval="' + i + '"]');
        if (labB) labB.textContent = String(Math.round(tracks[i].balance * 100));
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
