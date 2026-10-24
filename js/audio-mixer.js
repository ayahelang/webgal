/**
 * SHAudioMixer — multi-track (max 8)
 * Master timeline (berdasarkan track terpanjang) + playhead,
 * meter posisi per track, overdub selaras playhead (offset),
 * Simpan file WAV + Kirim (onExport, konteks chat/pengumuman).
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
    var onExport = opts.onExport || null;
    // "chat" | "announce" | "generic" — label tombol kirim
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
        '  <div class="amx-transport">' +
        '    <span class="amx-clock" data-amx="clock">0:00</span>' +
        '    <div class="amx-timeline" data-amx="timeline" title="Klik untuk seek">' +
        '      <div class="amx-timeline-fill" data-amx="tfill"></div>' +
        '      <div class="amx-timeline-head" data-amx="thead"></div>' +
        "    </div>" +
        '    <span class="amx-clock amx-clock-end" data-amx="clock-end">0:00</span>' +
        "  </div>" +
        '  <div class="amx-rec-bar" data-amx="recbar" hidden>' +
        '    <span class="chat-voice-dot amx-dot" aria-hidden="true"></span>' +
        '    <span class="amx-timer" data-amx="timer">00:00</span>' +
        '    <canvas class="amx-meter" data-amx="meter" width="140" height="26" aria-hidden="true"></canvas>' +
        '    <span class="amx-rec-offset muted" data-amx="recoffset"></span>' +
        "  </div>" +
        '  <div class="amx-status muted" data-amx="status">Rekam / unggah track.</div>' +
        '  <div class="amx-tracks" data-amx="tracks"></div>' +
        '  <footer class="amx-foot">' +
        '    <button type="button" class="btn btn-ghost amx-sm" data-amx="close">Batal</button>' +
        '    <button type="button" class="btn btn-ghost amx-sm" data-amx="download">⬇ Simpan WAV</button>' +
        '    <button type="button" class="btn btn-primary amx-sm" data-amx="export" hidden>Kirim</button>' +
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

    if (btnExport) {
      if (sendLabel && onExport) {
        btnExport.hidden = false;
        btnExport.textContent = sendLabel;
      } else {
        btnExport.hidden = true;
      }
    }

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

    function maxDur() {
      var m = 0;
      tracks.forEach(function (t) {
        if (!t.buffer) return;
        var end = (t.offset || 0) + t.buffer.duration;
        if (end > m) m = end;
      });
      return m;
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
      if (isPlaying) {
        playhead = currentPlayhead();
        isPlaying = false;
      }
      updateTransportUI();
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
        if (tr.muted || !tr.buffer) return;
        var off = tr.offset || 0;
        var bufDur = tr.buffer.duration;
        if (head >= off + bufDur) return;
        var when = playStartedAtCtx;
        var offsetInBuffer = 0;
        if (head > off) {
          offsetInBuffer = head - off;
          when = playStartedAtCtx;
        } else {
          when = playStartedAtCtx + (off - head);
          offsetInBuffer = 0;
        }
        var remaining = bufDur - offsetInBuffer;
        if (remaining <= 0.001) return;
        var src = audioCtx.createBufferSource();
        src.buffer = tr.buffer;
        src.connect(audioCtx.destination);
        try {
          src.start(when, offsetInBuffer, remaining);
        } catch (e) {
          try {
            src.start(when, offsetInBuffer);
          } catch (e2) {}
        }
        playing.push(src);
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
        row.className = "amx-track" + (tr.muted ? " is-muted" : "");
        var offLabel =
          tr.offset && tr.offset > 0.05 ? " @" + fmt(tr.offset) : "";
        row.innerHTML =
          '<div class="amx-track-main">' +
          '<span class="amx-track-idx">T' +
          (idx + 1) +
          "</span>" +
          '<div class="amx-track-meta">' +
          '<span class="amx-track-name" title="' +
          (tr.name || "") +
          '">' +
          (tr.name || "Track " + (idx + 1)) +
          "</span>" +
          '<span class="amx-track-dur">' +
          fmt(tr.buffer ? tr.buffer.duration : 0) +
          offLabel +
          "</span>" +
          '<div class="amx-track-bar"><div class="amx-track-bar-fill" data-amx-prog="' +
          idx +
          '"></div></div>' +
          "</div></div>" +
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
        offset: Math.max(0, offsetSec || 0),
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
          if (tr.muted || !tr.buffer) return;
          var off = tr.offset || 0;
          var bufDur = tr.buffer.duration;
          if (headNow >= off + bufDur) return;
          var when = t0;
          var offsetInBuffer = 0;
          if (headNow > off) {
            offsetInBuffer = headNow - off;
          } else {
            when = t0 + (off - headNow);
            offsetInBuffer = 0;
          }
          var remaining = bufDur - offsetInBuffer;
          if (remaining <= 0.001) return;
          var src = audioCtx.createBufferSource();
          src.buffer = tr.buffer;
          src.connect(audioCtx.destination);
          try {
            src.start(when, offsetInBuffer, remaining);
          } catch (e) {
            try {
              src.start(when, offsetInBuffer);
            } catch (e2) {}
          }
          playing.push(src);
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
          isRecording = false;
          stopPlayback(true);
          stopMeter();
          stopRecTimer();
          if (recBar) recBar.hidden = true;
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
            var label =
              "Rekam " +
              (tracks.length + 1) +
              (savedOffset > 0.05 ? " @" + fmt(savedOffset) : "");
            addBuffer(buf, label, savedOffset);
            setStatus(
              "Track ditambah" +
                (savedOffset > 0.05
                  ? " mulai dari " + fmt(savedOffset)
                  : "") +
                "."
            );
          } catch (e) {
            setStatus("Gagal decode: " + (e.message || e));
          }
          btnRec.hidden = false;
          btnStopRec.hidden = true;
          mediaRec = null;
          if (recOffsetEl) recOffsetEl.textContent = "";
        };
        mediaRec.start(200);
        startMeter(mediaStream);
        startRecTimer();
        if (recBar) recBar.hidden = false;
        if (recOffsetEl) {
          recOffsetEl.textContent =
            recOffsetSec > 0.05 ? "mulai @" + fmt(recOffsetSec) : "mulai @0:00";
        }
        btnRec.hidden = true;
        btnStopRec.hidden = false;
        setStatus(
          "Merekam dari " +
            fmt(recOffsetSec) +
            "… (headset untuk overdub)"
        );
      } catch (e) {
        isRecording = false;
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
        var off = currentPlayhead();
        addBuffer(buf, file.name || "Upload", off > 0.05 ? off : 0);
        setStatus(
          "File: " +
            (file.name || "audio") +
            (off > 0.05 ? " @" + fmt(off) : "")
        );
      } catch (e) {
        setStatus("File gagal: " + (e.message || e));
      }
    }

    async function mixToWav() {
      var active = tracks.filter(function (t) {
        return !t.muted && t.buffer;
      });
      if (!active.length) {
        setStatus("Tidak ada track aktif.");
        return null;
      }
      setStatus("Mixing…");
      ensureCtx();
      var sr = audioCtx.sampleRate;
      var dur = maxDur();
      if (dur <= 0) {
        setStatus("Durasi kosong.");
        return null;
      }
      var frames = Math.ceil(dur * sr) || 1;
      var offline = new OfflineAudioContext(2, frames, sr);
      active.forEach(function (t) {
        var src = offline.createBufferSource();
        src.buffer = t.buffer;
        src.connect(offline.destination);
        src.start(t.offset || 0);
      });
      var rendered = await offline.startRendering();
      var wav = encodeWav(rendered);
      return {
        blob: wav,
        duration: dur,
        mime: "audio/wav",
        filename: "mix-" + Date.now() + ".wav",
      };
    }

    async function doDownload() {
      try {
        var result = await mixToWav();
        if (!result) return;
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
        setStatus("WAV disimpan · " + fmt(result.duration));
      } catch (e) {
        setStatus("Gagal simpan: " + (e.message || e));
      }
    }

    async function doExport() {
      if (!onExport) {
        setStatus("Tidak ada target kirim.");
        return;
      }
      try {
        var result = await mixToWav();
        if (!result) return;
        setStatus("Mengirim…");
        close();
        await onExport(result);
      } catch (e) {
        setStatus("Gagal kirim: " + (e.message || e));
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
      root.onclick = null;
      if (timelineEl) timelineEl.onpointerdown = null;
    }

    if (timelineEl) {
      timelineEl.onpointerdown = function (ev) {
        if (isRecording) return;
        var rect = timelineEl.getBoundingClientRect();
        var x = (ev.clientX - rect.left) / Math.max(1, rect.width);
        var total = maxDur();
        seekTo(x * total);
      };
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
      if (amx === "close") close();
      else if (amx === "rec") startRec();
      else if (amx === "stop-rec") stopRec();
      else if (amx === "play") playAll();
      else if (amx === "stop") {
        stopPlayback(true);
        setStatus("Stop @ " + fmt(playhead));
      } else if (amx === "download") doDownload();
      else if (amx === "export") doExport();

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
          src.connect(audioCtx.destination);
          src.start(playStartedAtCtx);
          playing.push(src);
          startTransportLoop();
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
    setStatus("Siap · max " + MAX_TRACKS + " track · klik timeline untuk seek.");
  }

  global.SHAudioMixer = { open: open, MAX_TRACKS: MAX_TRACKS };
})(typeof window !== "undefined" ? window : this);
