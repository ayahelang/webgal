# Player suara: seek + timer + stop

## Perbaikan
- Slider bergerak seiring audio (poll 100ms)
- Geser slider → posisi audio & waktu ikut
- Ikon ▶ / ❚❚ berganti saat play/pause
- Tombol ⏹ Stop (ulang ke awal)
- Unduh: coba file asli (webm/ogg); MP3 tidak tersedia karena browser merekam WebM
- Lebar max ~300px

## Dipakai di
chat, balas, edit, pengumuman, editor pengumuman (via SHVoice.wirePlayers / playerHtml)

## File
js/voice-kit.js (wajib), js/chat.js, js/announce.js, js/admin.js, css/style.css
Pastikan voice-kit.js dimuat SEBELUM chat.js / announce.js / admin.js
