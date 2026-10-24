// Salin ke data/vc-config.js lalu <script src="data/vc-config.js"> sebelum webrtc-room.js
// Semua opsional — tanpa ini, SFU default = Jitsi gratis.
window.GALLERY_VC = {
  p2pMax: 12,                 // di atas ini → SFU
  jitsiDomain: "meet.jit.si", // SFU gratis default
  // dailyDomain: "your-subdomain.daily.co",
  // dailyApiKey: "", // jangan di frontend production — pakai Edge Function
  // livekitUrl: "",
  // livekitTokenUrl: "", // endpoint yang mengembalikan token
};
