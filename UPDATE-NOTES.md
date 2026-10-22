# Perbaikan chat hierarki + preview suara + durasi + pengumuman play

## Chat
- Preview balasan tidak lagi menampilkan string `__voice__|…` → "🎤 Pesan suara"
- Hierarki balasan dikembalikan (anak di bawah induk)
- Durasi total dari `dur=` di body; rekaman baru selalu simpan durasi

## Pengumuman
- Suara di **kotak terpisah** (bukan di editor teks)
- Play + durasi diperbaiki (hapus crossorigin yang sering memblokir)
- Hapus suara lewat tombol "Hapus suara"

## File
js/chat.js, js/announce.js, js/admin.js, js/db.js, css/style.css, admin.html
