/**
 * SHWebRTC — video conference / share screen untuk ruang chat
 * Signaling: Supabase Realtime Broadcast
 * Media: WebRTC (1 presenter → banyak penonton, P2P per penonton)
 * Catatan: cocok kelas kecil–sedang. Banyak penonton → lebih baik pakai SFU (LiveKit dll).
 */
(function (global) {
  var ICE = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];
  var state = {
    roomKey: null,
    channel: null,
    peerId: null,
    name: "Peserta",
    isPresenter: false,
    localStream: null,
    peers: Object.create(null), // peerId -> RTCPeerConnection
    remoteStreams: Object.create(null),
    onStatus: null,
    onRoster: null,
  };

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
    });
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
      if (ev.candidate) {
        send("ice", { to: remoteId, candidate: ev.candidate });
      }
    };

    pc.ontrack = function (ev) {
      var stream = ev.streams && ev.streams[0];
      if (!stream) {
        stream = new MediaStream([ev.track]);
      }
      state.remoteStreams[remoteId] = stream;
      emitRoster();
      status("Menerima stream dari " + remoteId.slice(0, 8));
    };

    pc.onconnectionstatechange = function () {
      var s = pc.connectionState;
      if (s === "failed" || s === "closed" || s === "disconnected") {
        // jangan langsung hapus saat disconnected singkat
        if (s === "failed" || s === "closed") closePeer(remoteId);
      }
    };

    // jika kita presenter, tambahkan track lokal
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
    var pc = makePc(remoteId);
    try {
      var offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await send("offer", { to: remoteId, sdp: pc.localDescription });
    } catch (e) {
      console.warn("[SHWebRTC] offer", e);
      status("Gagal buat offer: " + (e.message || e));
    }
  }

  async function handleOffer(from, sdp) {
    var pc = makePc(from);
    try {
      await pc.setRemoteDescription(sdp);
      var answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await send("answer", { to: from, sdp: pc.localDescription });
    } catch (e) {
      console.warn("[SHWebRTC] answer", e);
    }
  }

  async function handleAnswer(from, sdp) {
    var pc = state.peers[from];
    if (!pc) return;
    try {
      await pc.setRemoteDescription(sdp);
    } catch (e) {
      console.warn("[SHWebRTC] setRemote answer", e);
    }
  }

  async function handleIce(from, candidate) {
    var pc = state.peers[from] || makePc(from);
    try {
      if (candidate) await pc.addIceCandidate(candidate);
    } catch (e) {
      /* ignore early ICE */
    }
  }

  async function joinSession(roomKey, userName, handlers) {
    leaveSession();
    var client = sb();
    if (!client) {
      status("Supabase belum siap");
      return false;
    }
    if (!global.RTCPeerConnection) {
      status("Browser tidak mendukung WebRTC");
      return false;
    }
    state.roomKey = String(roomKey || "global");
    state.peerId = uid();
    state.name = userName || "Peserta";
    state.onStatus = handlers && handlers.onStatus;
    state.onRoster = handlers && handlers.onRoster;

    var chName = "webrtc-" + state.roomKey;
    var channel = client.channel(chName, { config: { broadcast: { self: false } } });
    state.channel = channel;

    channel
      .on("broadcast", { event: "peer-join" }, function (payload) {
        var p = payload.payload || {};
        if (!p.from || p.from === state.peerId) return;
        // Jika kita presenter, tawarkan stream ke pendatang baru
        if (state.isPresenter && state.localStream) {
          createOfferTo(p.from);
        }
        status((p.name || "Peserta") + " bergabung");
      })
      .on("broadcast", { event: "peer-leave" }, function (payload) {
        var p = payload.payload || {};
        if (p.from) closePeer(p.from);
      })
      .on("broadcast", { event: "presenter-start" }, function (payload) {
        var p = payload.payload || {};
        if (p.from === state.peerId) return;
        status((p.name || "Seseorang") + " mulai share screen — menunggu stream…");
        // minta presenter mengirim offer ke kita
        send("need-offer", { to: p.from });
      })
      .on("broadcast", { event: "presenter-stop" }, function (payload) {
        var p = payload.payload || {};
        if (p.from) closePeer(p.from);
        status("Share screen dihentikan");
      })
      .on("broadcast", { event: "need-offer" }, function (payload) {
        var p = payload.payload || {};
        if (!state.isPresenter || !state.localStream) return;
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
      channel.subscribe(function (status) {
        if (status === "SUBSCRIBED") resolve();
      });
    });

    await send("peer-join", {});
    status("Terhubung ke sesi video ruang ini");
    return true;
  }

  async function startScreenShare() {
    if (!state.channel) {
      status("Gabung sesi dulu");
      return false;
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
      // tutup peer lama lalu tawarkan ulang
      closeAllPeers();
      await send("presenter-start", {});
      emitRoster();
      status("Share screen aktif — penonton akan menerima stream");
      return true;
    } catch (e) {
      status("Gagal share screen: " + (e.message || e));
      return false;
    }
  }

  function stopScreenShare() {
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
    send("presenter-stop", {});
    emitRoster();
    status("Share screen dihentikan");
  }

  function leaveSession() {
    try {
      send("peer-leave", {});
    } catch (e) {}
    stopScreenShare();
    if (state.channel) {
      try {
        var client = sb();
        if (client) client.removeChannel(state.channel);
      } catch (e) {}
    }
    state.channel = null;
    state.roomKey = null;
    state.peerId = null;
    status("Keluar dari sesi video");
  }

  function isInSession() {
    return !!state.channel;
  }

  function isSharing() {
    return !!state.isPresenter && !!state.localStream;
  }

  global.SHWebRTC = {
    joinSession: joinSession,
    leaveSession: leaveSession,
    startScreenShare: startScreenShare,
    stopScreenShare: stopScreenShare,
    isInSession: isInSession,
    isSharing: isSharing,
  };
})(typeof window !== "undefined" ? window : this);
