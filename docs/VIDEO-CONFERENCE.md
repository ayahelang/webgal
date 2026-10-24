# Video / Share screen di ruang chat

## Cara kerja
- **Signaling**: Supabase Realtime Broadcast (kuota kecil)
- **Media**: WebRTC peer-to-peer (tidak lewat database Supabase)
- **Model**: 1 orang share screen → banyak penonton di ruang yang sama

## Cara pakai
1. Buka Chat → pilih ruang
2. Klik **Video ruang**
3. **Gabung sesi**
4. Guru: **Share screen** (izin browser)
5. Siswa: otomatis menerima stream (tetap di sesi yang sama)

## Kuota Supabase free
- Hanya sinyal (join/offer/ice) — sangat ringan
- Video **tidak** memakai Storage/DB
- Bottleneck: perangkat & jaringan peserta, bukan Supabase

## Batas
- Kelas kecil–sedang (perkiraan < ~15 penonton stabil)
- Firewall ketat mungkin perlu TURN server (belum disertakan)
- Untuk ratusan penonton: gunakan SFU (LiveKit / Daily / Agora)

## File
- `js/webrtc-room.js`
- `chat.html`, `js/chat.js`, `css/style.css`
