/**
 * SHAudioMixer — multi-track (max 8), compact UI + meter + timer saat rekam
 */
(function (global) {
  "use strict";
  var MAX_TRACKS = 8;

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) return "0:00";
    sec = Math.floor(sec);
    return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
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

  function decodeBlob(ctx, blob) {
    return blob.arrayBuffer().then(function (ab) {
      return ctx.decodeAudioData(ab.slice(0));
    });
  }

  function open(opts) {
    opts = opts || {};
    var onExport = opts.onExport || function () {};
    var root = document.getElementById("shAudioMixerRoot");
    if (!root) {
      root = document.createElement("div");
      root.id = "shAudioMixerRoot";
      root.className = "amx-root";
      root.innerHTML =
        '<div class="amx-backdrop" data-amx="close"></div>' +
        '<div class="amx-panel" role="dialog" aria-label="Audio Mixer">' +
        '  <header class="amx-head">' +
        "    <strong>Audio Mixer</strong>" +
        '    <span class="muted amx-sub">Max 8 · headset saat overdub</span>' +
        '    <button type="button" class="btn btn-ghost amx-x" data-amx="close" title="Tutup">✕</button>' +
        "  </header>" +
        '  <div class="amx-toolbar">' +
        '    <button type="button" class="btn btn-primary amx-sm" data-amx="rec">● Rekam</button>' +
        '    <button type="button" class="btn btn-ghost amx-sm" data-amx="stop-rec" hidden>■ Stop</button>' +
        '    <label class="btn btn-ghost amx-sm amx-upload">⬆ File<input type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm" hidden data-amx="file"></label>' +
        '    <button type="button" class="btn btn-ghost amx-sm" data-amx="play">▶</button>' +
        '    <button type="button" class="btn btn-ghost amx-sm" data-amx="stop">■</button>' +
        "  </div>" +
        '  <div class="amx-rec-bar" data-amx="recbar" hidden>' +
        '    <span class="chat-voice-dot amx-dot" aria-hidden="true"></span>' +
        '    <span class="amx-timer" data-amx="timer">00:00</span>' +
        '    <canvas class="amx-meter" data-amx="meter" width="140" height="26" aria-hidden="true"></canvas>' +
        "  </div>" +
        '  <div class="amx-status muted" data-amx="status">Rekam / unggah track.</div>' +
        '  <div class="amx-tracks" data-amx="tracks"></div>' +
        '  <footer class="amx-foot">' +
        '    <button type="button" class="btn btn-ghost amx-sm" data-amx="close">Batal</button>' +
        '    <button type="button" class="btn btn-primary amx-sm" data-amx="export">Mix → kirim WAV</button>' +
        "  </footer>" +
        "</div>";
      document.body.appendChild(root);
    }

    var tracks = [];
    var audioCtx = null;
    var playing = [];
    var mediaRec = null;
    var mediaStream = null;
    var recChunks = [];
    var statusEl = root.querySelector("[data-amx=status]");
    var listEl = root.querySelector("[data-amx=tracks]");
    var btnRec = root.querySelector('[data-amx="rec"]');
    var btnStopRec = root.querySelector('[data-amx="stop-rec"]');
    var recBar = root.querySelector("[data-amx=recbar]");
    var timerEl = root.querySelector("[data-amx=timer]");
    var canvas = root.querySelector("[data-amx=meter]");
    var meterRaf = 0;
    var meterAnalyser = null;
    var meterSource = null;
    var meterCtx = null;
    var recTimer = null;
    var recStartedAt = 0;

    function ensureCtx() {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC();
      }
      if (audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    }

    function setStatus(t) {
      if (statusEl) statusEl.textContent = t;
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
      }, 250);
    }

    function stopRecTimer() {
      if (recTimer) clearInterval(recTimer);
      recTimer = null;
    }

    function stopPlayback() {
      playing.forEach(function (n) {
        try {
          n.stop();
        } catch (e) {}
      });
      playing = [];
    }

    function renderTracks() {
      listEl.innerHTML = "";
      if (!tracks.length) {
        listEl.innerHTML = '<p class="muted amx-empty">Belum ada track.</p>';
        return;
      }
      tracks.forEach(function (tr, idx) {
        var row = document.createElement("div");
        row.className = "amx-track" + (tr.muted ? " is-muted" : "");
        row.innerHTML =
          '<div class="amx-track-main">' +
          '<span class="amx-track-idx">T' +
          (idx + 1) +
          "</span>" +
          '<span class="amx-track-name" title="' +
          (tr.name || "") +
          '">' +
          (tr.name || "Track " + (idx + 1)) +
          "</span>" +
          '<span class="amx-track-dur">' +
          fmt(tr.buffer ? tr.buffer.duration : 0) +
          "</span>" +
          "</div>" +
          '<div class="amx-track-acts">' +
          '<button type="button" class="btn btn-ghost amx-xs" data-act="mute" data-i="' +
          idx +
          '">' +
          (tr.muted ? "Unmute" : "Mute") +
          "</button>" +
          '<button type="button" class="btn btn-ghost amx-xs" data-act="solo-play" data-i="' +
          idx +
          '">▶</button>' +
          '<button type="button" class="btn btn-ghost amx-xs" data-act="del" data-i="' +
          idx +
          '">✕</button>' +
          "</div>";
        listEl.appendChild(row);
      });
      setStatus(tracks.length + "/" + MAX_TRACKS + " · max " + fmt(maxDur()));
    }

    function maxDur() {
      var m = 0;
      tracks.forEach(function (t) {
        if (t.buffer && t.buffer.duration > m) m = t.buffer.duration;
      });
      return m;
    }

    function addBuffer(buffer, name) {
      if (tracks.length >= MAX_TRACKS) {
        setStatus("Maks. " + MAX_TRACKS + " track.");
        return false;
      }
      tracks.push({
        id: "t" + Date.now() + Math.random().toString(36).slice(2, 6),
        name: name || "Track " + (tracks.length + 1),
        buffer: buffer,
        muted: false,
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
        stopPlayback();
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        var t0 = audioCtx.currentTime + 0.05;
        tracks.forEach(function (tr) {
          if (tr.muted || !tr.buffer) return;
          var src = audioCtx.createBufferSource();
          src.buffer = tr.buffer;
          src.connect(audioCtx.destination);
          src.start(t0);
          playing.push(src);
        });
        recChunks = [];
        var mime = "";
        try {
          if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) mime = "audio/webm;codecs=opus";
          else if (MediaRecorder.isTypeSupported("audio/webm")) mime = "audio/webm";
        } catch (e) {}
        mediaRec = mime ? new MediaRecorder(mediaStream, { mimeType: mime }) : new MediaRecorder(mediaStream);
        mediaRec.ondataavailable = function (ev) {
          if (ev.data && ev.data.size) recChunks.push(ev.data);
        };
        mediaRec.onstop = async function () {
          stopPlayback();
          stopMeter();
          stopRecTimer();
          if (recBar) recBar.hidden = true;
          try {
            mediaStream.getTracks().forEach(function (t) {
              t.stop();
            });
          } catch (e) {}
          mediaStream = null;
          var blob = new Blob(recChunks, { type: mediaRec.mimeType || "audio/webm" });
          try {
            var buf = await decodeBlob(ensureCtx(), blob);
            addBuffer(buf, "Rekam " + (tracks.length + 1));
            setStatus("Track ditambah.");
          } catch (e) {
            setStatus("Gagal decode: " + (e.message || e));
          }
          btnRec.hidden = false;
          btnStopRec.hidden = true;
          mediaRec = null;
        };
        mediaRec.start(200);
        startMeter(mediaStream);
        startRecTimer();
        if (recBar) recBar.hidden = false;
        btnRec.hidden = true;
        btnStopRec.hidden = false;
        setStatus("Merekam… (headset untuk overdub)");
      } catch (e) {
        setStatus("Mic: " + (e.message || e));
      }
    }

    function stopRec() {
      if (mediaRec && mediaRec.state !== "inactive") {
        try {
          mediaRec.stop();
        } catch (e) {}
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
        addBuffer(buf, file.name || "Upload");
        setStatus("File: " + (file.name || "audio"));
      } catch (e) {
        setStatus("File gagal: " + (e.message || e));
      }
    }

    function playAll() {
      stopPlayback();
      if (!tracks.length) return;
      ensureCtx();
      var t0 = audioCtx.currentTime + 0.03;
      tracks.forEach(function (tr) {
        if (tr.muted || !tr.buffer) return;
        var src = audioCtx.createBufferSource();
        src.buffer = tr.buffer;
        src.connect(audioCtx.destination);
        src.start(t0);
        playing.push(src);
      });
      setStatus("Play…");
    }

    async function doExport() {
      var active = tracks.filter(function (t) {
        return !t.muted && t.buffer;
      });
      if (!active.length) {
        setStatus("Tidak ada track aktif.");
        return;
      }
      setStatus("Mixing…");
      try {
        ensureCtx();
        var sr = audioCtx.sampleRate;
        var dur = 0;
        active.forEach(function (t) {
          if (t.buffer.duration > dur) dur = t.buffer.duration;
        });
        var frames = Math.ceil(dur * sr) || 1;
        var offline = new OfflineAudioContext(2, frames, sr);
        active.forEach(function (t) {
          var src = offline.createBufferSource();
          src.buffer = t.buffer;
          src.connect(offline.destination);
          src.start(0);
        });
        var rendered = await offline.startRendering();
        var wav = encodeWav(rendered);
        setStatus("OK " + fmt(dur));
        close();
        await onExport({
          blob: wav,
          duration: dur,
          mime: "audio/wav",
          filename: "mix-" + Date.now() + ".wav",
        });
      } catch (e) {
        setStatus("Gagal mix: " + (e.message || e));
      }
    }

    function close() {
      stopRec();
      stopPlayback();
      stopMeter();
      stopRecTimer();
      try {
        if (mediaStream)
          mediaStream.getTracks().forEach(function (t) {
            t.stop();
          });
      } catch (e) {}
      root.classList.remove("is-open");
      root.onclick = null;
    }

    root.onclick = function (ev) {
      var t = ev.target;
      if (!t) return;
      var amx =
        t.getAttribute("data-amx") ||
        (t.closest && t.closest("[data-amx]") && t.closest("[data-amx]").getAttribute("data-amx"));
      if (t.matches && t.matches('input[data-amx="file"]')) return;
      if (amx === "close") close();
      else if (amx === "rec") startRec();
      else if (amx === "stop-rec") stopRec();
      else if (amx === "play") playAll();
      else if (amx === "stop") {
        stopPlayback();
        setStatus("Stop.");
      } else if (amx === "export") doExport();

      var act = t.getAttribute("data-act");
      if (act === "mute") {
        var i = Number(t.getAttribute("data-i"));
        if (tracks[i]) {
          tracks[i].muted = !tracks[i].muted;
          renderTracks();
        }
      } else if (act === "del") {
        var j = Number(t.getAttribute("data-i"));
        tracks.splice(j, 1);
        renderTracks();
      } else if (act === "solo-play") {
        var k = Number(t.getAttribute("data-i"));
        stopPlayback();
        if (tracks[k] && tracks[k].buffer) {
          ensureCtx();
          var src = audioCtx.createBufferSource();
          src.buffer = tracks[k].buffer;
          src.connect(audioCtx.destination);
          src.start(0);
          playing.push(src);
        }
      }
    };

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
    setStatus("Siap · max " + MAX_TRACKS + " track.");
  }

  global.SHAudioMixer = { open: open, MAX_TRACKS: MAX_TRACKS };
})(typeof window !== "undefined" ? window : this);
