# Video conference per ruang chat

## Perilaku
- Tombol **Video ruang** di halaman chat, terikat **ruang chat** yang dipilih.
- Menghitung peserta (Supabase Presence) di sesi video ruang itu.
- **≤ p2pMax (default 12)** → WebRTC **P2P** (share screen native).
- **> p2pMax** → **SFU**:
  - default **Jitsi Meet** (gratis, tanpa API key)
  - opsional Daily / LiveKit jika diisi `GALLERY_VC`

## Config (opsional)
Lihat `data/vc-config.example.js`.

## File
- `js/webrtc-room.js`, `js/chat.js`, `chat.html`, `css/style.css`
