# Standar suara (SHVoice)

## Library baru: js/voice-kit.js
Dipakai berulang di chat, balas, edit, pengumuman.

### Rekam (standar)
- Timer MM:SS
- Grafik gelombang (meter)
- Maks ~3 menit

### Putar (standar)
- ▶ / ❚❚
- Slider seek (geser maju-mundur)
- ⬇ Unduh
- Tampil 00:12 / 01:30

### Hapus otomatis pesan suara chat (tetap)
| Peran | Retensi |
|-------|---------|
| Siswa / umum | **3 jam** |
| Guru / staff | **24 jam** |
| Admin | **permanen** (sampai dihapus manual) |

Pengumuman: file suara dihapus saat pengumuman dihapus.

## Deploy
1. Upload `js/voice-kit.js` (baru)
2. Timpa js/chat.js, js/admin.js, js/announce.js, css/style.css
3. Timpa HTML yang memuat script (minimal chat.html + admin.html + halaman dengan announce.js)
   Pastikan urutan: `voice-kit.js` **sebelum** chat.js / admin.js / announce.js

## File di zip
- js/voice-kit.js, chat.js, admin.js, announce.js
- css/style.css
- html-patch/* (contoh halaman yang sudah disisipkan script)
