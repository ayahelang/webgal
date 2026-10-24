/**
 * SHWebRTC — Video / share screen per ruang chat
 * Strategi cerdas:
 *  - peserta ≤ THRESHOLD → WebRTC P2P (gratis, ringan)
 *  - peserta > THRESHOLD → SFU gratis (default: Jitsi Meet, tanpa API key)
 *  - opsional: Daily / LiveKit jika diisi di GALLERY_VC
 */
(function (global) {
  var THRESHOLD = 12;
  var ICE = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];

  var state = {
    roomKey: null,
    channel: null,
    peerId: null,
    name: "Peserta",
    isPresenter: false,
    localStream: null,
    peers: Object.create(null),
    remoteStreams: Object.create(null),
    presenceCount: 1,
    mode: "p2p", // p2p | sfu
    sfuProvider: "jitsi",
    onStatus: null,
    onRoster: null,
    onMode: null,
    onPresence: null,
  };

  function cfg() {
    return global.GALLERY_VC || {};
  }

  function threshold() {
    var n = Number(cfg().p2pMax);
    return isFinite(n) && n > 1 ? n : THRESHOLD;
  }

  function sb() {
    if (global.__gallerySb) return global.__gallerySb;
    try {
      if (global.GalleryDB && typeof global.GalleryDB.client === "function") return global.GalleryDB.client();
    } catch (e) {}
    return null;
  }

  function uid() {
    return "p-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function status(msg) {
    if (state.onStatus) state.onStatus(msg);
  }

  function emitPresence() {
    if (state.onPresence) state.onPresence(state.presenceCount, state.mode);
  }

  function emitRoster() {
    if (!state.onRoster) return;
    var list = [];
    Object.keys(state.remoteStreams).forEach(function (id) {
      list.push({ id: id, stream: state.remoteStreams[id] });
    });
    state.onRoster({
      local: state.localStream,
      isPresenter: state.isPresenter,
      remotes: list,
      mode: state.mode,
      presenceCount: state.presenceCount,
    });
  }

  function emitMode() {
    if (state.onMode) state.onMode(state.mode, state.sfuProvider, state.presenceCount);
  }

  /** Pilih strategi berdasarkan jumlah peserta + config */
  function pickStrategy(count) {
    var max = threshold();
    if (count <= max) {
      return { mode: "p2p", provider: null };
    }
    var c = cfg();
    // SFU berbayar/API opsional
    if (c.dailyDomain && c.dailyApiKey) {
      return { mode: "sfu", provider: "daily" };
    }
    if (c.livekitUrl && c.livekitTokenUrl) {
      return { mode: "sfu", provider: "livekit" };
    }
    // Default gratis tanpa kunci: Jitsi public SFU
    return { mode: "sfu", provider: "jitsi" };
  }

  function safeRoomSlug(key) {
    return String(key || "global")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 48) || "global";
  }

  function jitsiUrl(roomKey) {
    var slug = "WebGal" + safeRoomSlug(roomKey);
    var c = cfg();
    var base = (c.jitsiDomain || "meet.jit.si").replace(/\/$/, "");
    return "https://" + base + "/" + slug;
  }

  async function send(event, payload) {
    if (!state.channel) return;
    try {
      await state.channel.send({
        type: "broadcast",
        event: event,
        payload: Object.assign({ from: state.peerId, name: state.name }, payload || {}),
      });
    } catch (e) {
      console.warn("[SHWebRTC] send", e);
    }
  }

  function closePeer(id) {
    var pc = state.peers[id];
    if (pc) {
      try {
        pc.close();
      } catch (e) {}
      delete state.peers[id];
    }
    delete state.remoteStreams[id];
    emitRoster();
  }

  function closeAllPeers() {
    Object.keys(state.peers).forEach(closePeer);
  }

  function makePc(remoteId) {
    if (state.peers[remoteId]) return state.peers[remoteId];
    var pc = new RTCPeerConnection({ iceServers: ICE });
    state.peers[remoteId] = pc;
    pc.onicecandidate = function (ev) {
      if (ev.candidate) send("ice", { to: remoteId, candidate: ev.candidate });
    };
    pc.ontrack = function (ev) {
      var stream = (ev.streams && ev.streams[0]) || new MediaStream([ev.track]);
      state.remoteStreams[remoteId] = stream;
      emitRoster();
    };
    pc.onconnectionstatechange = function () {
      var s = pc.connectionState;
      if (s === "failed" || s === "closed") closePeer(remoteId);
    };
    if (state.localStream) {
      state.localStream.getTracks().forEach(function (t) {
        try {
          pc.addTrack(t, state.localStream);
        } catch (e) {}
      });
    }
    return pc;
  }

  async function createOfferTo(remoteId) {
    if (state.mode !== "p2p") return;
    var pc = makePc(remoteId);
    try {
      var offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await send("offer", { to: remoteId, sdp: pc.localDescription });
    } catch (e) {
      status("Gagal offer: " + (e.message || e));
    }
  }

  async function handleOffer(from, sdp) {
    if (state.mode !== "p2p") return;
    var pc = makePc(from);
    try {
      await pc.setRemoteDescription(sdp);
      var answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await send("answer", { to: from, sdp: pc.localDescription });
    } catch (e) {}
  }

  async function handleAnswer(from, sdp) {
    var pc = state.peers[from];
    if (!pc) return;
    try {
      await pc.setRemoteDescription(sdp);
    } catch (e) {}
  }

  async function handleIce(from, candidate) {
    var pc = state.peers[from] || makePc(from);
    try {
      if (candidate) await pc.addIceCandidate(candidate);
    } catch (e) {}
  }

  function applyStrategy(count) {
    var prev = state.mode;
    var pick = pickStrategy(count);
    state.mode = pick.mode;
    state.sfuProvider = pick.provider || "jitsi";
    if (prev !== state.mode) {
      if (state.mode === "sfu") {
        // lepas P2P media — SFU mengambil alih
        if (state.isPresenter) stopScreenShare(true);
        closeAllPeers();
        status(
          "Peserta " +
            count +
            " > " +
            threshold() +
            " → mode SFU (" +
            state.sfuProvider +
            ") agar lebih lancar"
        );
      } else {
        status("Peserta " + count + " → mode WebRTC P2P");
      }
      emitMode();
    } else {
      emitMode();
    }
    emitPresence();
  }

  async function joinSession(roomKey, userName, handlers) {
    leaveSession();
    var client = sb();
    if (!client) {
      status("Supabase belum siap");
      return false;
    }
    state.roomKey = String(roomKey || "global");
    state.peerId = uid();
    state.name = userName || "Peserta";
    state.onStatus = handlers && handlers.onStatus;
    state.onRoster = handlers && handlers.onRoster;
    state.onMode = handlers && handlers.onMode;
    state.onPresence = handlers && handlers.onPresence;
    state.presenceCount = 1;
    state.mode = "p2p";

    var chName = "webrtc-" + state.roomKey;
    var channel = client.channel(chName, {
      config: {
        broadcast: { self: false },
        presence: { key: state.peerId },
      },
    });
    state.channel = channel;

    channel
      .on("presence", { event: "sync" }, function () {
        var stateMap = channel.presenceState();
        var n = 0;
        Object.keys(stateMap).forEach(function (k) {
          n += (stateMap[k] || []).length;
        });
        state.presenceCount = Math.max(1, n);
        applyStrategy(state.presenceCount);
      })
      .on("broadcast", { event: "peer-join" }, function (payload) {
        var p = payload.payload || {};
        if (!p.from || p.from === state.peerId) return;
        if (state.mode === "p2p" && state.isPresenter && state.localStream) {
          createOfferTo(p.from);
        }
      })
      .on("broadcast", { event: "peer-leave" }, function (payload) {
        var p = payload.payload || {};
        if (p.from) closePeer(p.from);
      })
      .on("broadcast", { event: "presenter-start" }, function (payload) {
        var p = payload.payload || {};
        if (p.from === state.peerId) return;
        if (state.mode === "p2p") {
          status((p.name || "Seseorang") + " mulai share — menunggu…");
          send("need-offer", { to: p.from });
        }
      })
      .on("broadcast", { event: "presenter-stop" }, function (payload) {
        var p = payload.payload || {};
        if (p.from) closePeer(p.from);
      })
      .on("broadcast", { event: "need-offer" }, function (payload) {
        var p = payload.payload || {};
        if (state.mode !== "p2p" || !state.isPresenter || !state.localStream) return;
        if (p.from) createOfferTo(p.from);
      })
      .on("broadcast", { event: "offer" }, function (payload) {
        var p = payload.payload || {};
        if (p.to !== state.peerId || !p.from) return;
        handleOffer(p.from, p.sdp);
      })
      .on("broadcast", { event: "answer" }, function (payload) {
        var p = payload.payload || {};
        if (p.to !== state.peerId || !p.from) return;
        handleAnswer(p.from, p.sdp);
      })
      .on("broadcast", { event: "ice" }, function (payload) {
        var p = payload.payload || {};
        if (p.to !== state.peerId || !p.from) return;
        handleIce(p.from, p.candidate);
      });

    await new Promise(function (resolve) {
      channel.subscribe(async function (st) {
        if (st === "SUBSCRIBED") {
          try {
            await channel.track({
              peerId: state.peerId,
              name: state.name,
              at: Date.now(),
            });
          } catch (e) {}
          resolve();
        }
      });
    });

    await send("peer-join", {});
    applyStrategy(state.presenceCount);
    status("Terhubung · ruang " + state.roomKey + " · " + state.presenceCount + " peserta");
    return true;
  }

  async function startScreenShare() {
    if (!state.channel) {
      status("Gabung sesi dulu");
      return false;
    }
    // Mode SFU: arahkan ke provider (Jitsi punya tombol share sendiri)
    if (state.mode === "sfu") {
      status("Mode SFU aktif — gunakan tombol share di jendela " + (state.sfuProvider || "SFU"));
      emitMode();
      return true;
    }
    try {
      var stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      state.localStream = stream;
      state.isPresenter = true;
      stream.getVideoTracks().forEach(function (t) {
        t.onended = function () {
          stopScreenShare();
        };
      });
      closeAllPeers();
      await send("presenter-start", {});
      emitRoster();
      status("Share screen P2P aktif (" + state.presenceCount + " di ruang)");
      return true;
    } catch (e) {
      status("Gagal share: " + (e.message || e));
      return false;
    }
  }

  function stopScreenShare(silent) {
    if (state.localStream) {
      state.localStream.getTracks().forEach(function (t) {
        try {
          t.stop();
        } catch (e) {}
      });
      state.localStream = null;
    }
    state.isPresenter = false;
    closeAllPeers();
    if (!silent) send("presenter-stop", {});
    emitRoster();
    if (!silent) status("Share dihentikan");
  }

  function leaveSession() {
    try {
      send("peer-leave", {});
    } catch (e) {}
    stopScreenShare(true);
    if (state.channel) {
      try {
        var client = sb();
        if (client) client.removeChannel(state.channel);
      } catch (e) {}
    }
    state.channel = null;
    state.roomKey = null;
    state.peerId = null;
    state.presenceCount = 0;
    state.mode = "p2p";
    status("Keluar sesi video");
    emitPresence();
    emitMode();
  }

  function getSfuJoinUrl() {
    if (!state.roomKey) return "";
    if (state.sfuProvider === "daily" && cfg().dailyDomain) {
      return "https://" + String(cfg().dailyDomain).replace(/\/$/, "") + "/webgal-" + safeRoomSlug(state.roomKey);
    }
    return jitsiUrl(state.roomKey);
  }

  global.SHWebRTC = {
    joinSession: joinSession,
    leaveSession: leaveSession,
    startScreenShare: startScreenShare,
    stopScreenShare: stopScreenShare,
    isInSession: function () {
      return !!state.channel;
    },
    isSharing: function () {
      return !!state.isPresenter && !!state.localStream;
    },
    getMode: function () {
      return state.mode;
    },
    getProvider: function () {
      return state.sfuProvider;
    },
    getPresenceCount: function () {
      return state.presenceCount;
    },
    getThreshold: threshold,
    getSfuJoinUrl: getSfuJoinUrl,
    jitsiUrl: jitsiUrl,
  };
})(typeof window !== "undefined" ? window : this);
