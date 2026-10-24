/**
 * SHAudioMixer — multi-track audio mixer (max 8 tracks)
 * Rekam / unggah track, mute, play barengan, mixdown WAV → kirim ke chat/pengumuman
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
        '    <span class="muted amx-sub">Maks. 8 track · pakai headset saat overdub</span>' +
        '    <button type="button" class="btn btn-ghost" data-amx="close" title="Tutup">✕</button>' +
        "  </header>" +
        '  <div class="amx-toolbar">' +
        '    <button type="button" class="btn btn-primary" data-amx="rec">● Rekam track</button>' +
        '    <button type="button" class="btn btn-ghost" data-amx="stop-rec" hidden>Stop rekam</button>' +
        '    <label class="btn btn-ghost amx-upload">⬆ Unggah audio<input type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm" hidden data-amx="file"></label>' +
        '    <button type="button" class="btn btn-ghost" data-amx="play">▶ Play semua</button>' +
        '    <button type="button" class="btn btn-ghost" data-amx="stop">■ Stop</button>' +
        "  </div>" +
        '  <div class="amx-status muted" data-amx="status">Belum ada track. Rekam atau unggah (WAV/MP3/OGG/M4A/WebM).</div>' +
        '  <div class="amx-tracks" data-amx="tracks"></div>' +
        '  <footer class="amx-foot">' +
        '    <button type="button" class="btn btn-ghost" data-amx="close">Batal</button>' +
        '    <button type="button" class="btn btn-primary" data-amx="export">Mix &amp; pakai (WAV)</button>' +
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
          '<button type="button" class="btn btn-ghost btn-xs" data-act="mute" data-i="' +
          idx +
          '">' +
          (tr.muted ? "Unmute" : "Mute") +
          "</button>" +
          '<button type="button" class="btn btn-ghost btn-xs" data-act="solo-play" data-i="' +
          idx +
          '">▶</button>' +
          '<button type="button" class="btn btn-ghost btn-xs" data-act="del" data-i="' +
          idx +
          '">Hapus</button>' +
          "</div>";
        listEl.appendChild(row);
      });
      setStatus(tracks.length + " / " + MAX_TRACKS + " track · durasi max ~" + fmt(maxDur()) + " (mix)");
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
        setStatus("Maksimal " + MAX_TRACKS + " track.");
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
        setStatus("Maksimal " + MAX_TRACKS + " track.");
        return;
      }
      try {
        ensureCtx();
        stopPlayback();
        // Play unmuted tracks while recording (overdub) — user should use headset
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
            setStatus("Track rekaman ditambahkan.");
          } catch (e) {
            setStatus("Gagal decode rekaman: " + (e.message || e));
          }
          btnRec.hidden = false;
          btnStopRec.hidden = true;
          mediaRec = null;
        };
        mediaRec.start(200);
        btnRec.hidden = true;
        btnStopRec.hidden = false;
        setStatus("Merekam… track lain yang tidak di-mute ikut diputar (pakai headset).");
      } catch (e) {
        setStatus("Mikrofon: " + (e.message || e));
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
        setStatus("Maksimal " + MAX_TRACKS + " track.");
        return;
      }
      try {
        ensureCtx();
        var buf = await decodeBlob(audioCtx, file);
        addBuffer(buf, file.name || "Upload");
        setStatus("File ditambahkan: " + (file.name || "audio"));
      } catch (e) {
        setStatus("File tidak bisa dibaca (format?): " + (e.message || e));
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
      setStatus("Memutar track aktif…");
    }

    async function doExport() {
      var active = tracks.filter(function (t) {
        return !t.muted && t.buffer;
      });
      if (!active.length) {
        setStatus("Tidak ada track aktif untuk di-mix.");
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
        setStatus("Mix selesai (" + fmt(dur) + "). Mengirim…");
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
      try {
        if (mediaStream) mediaStream.getTracks().forEach(function (t) {
          t.stop();
        });
      } catch (e) {}
      root.classList.remove("is-open");
      root.onclick = null;
    }

    root.onclick = function (ev) {
      var t = ev.target;
      if (!t) return;
      var amx = t.getAttribute("data-amx") || (t.closest && t.closest("[data-amx]") && t.closest("[data-amx]").getAttribute("data-amx"));
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
    setStatus("Siap · maks. " + MAX_TRACKS + " track (rekam + unggah).");
  }

  global.SHAudioMixer = { open: open, MAX_TRACKS: MAX_TRACKS };
})(typeof window !== "undefined" ? window : this);
