# Chat actions toggle + Pengumuman suara & default jadwal

## Chat
- Tombol Balas / Ubah / Hapus **tersembunyi** default
- Klik **avatar** pesan → tampil/sembunyi aksi
- Pesan suara: tampil `00:00 / MM:SS` (durasi), saat play `00:01 / MM:SS`
- Saat rekam: timer `00:00` … (menit:detik)

## Pengumuman
- Tanggal mulai kosong → waktu simpan pertama
- Tanpa selesai & tanpa durasi → **24 jam**
- Tombol **🎤 Suara** di form admin (rekam + meter + timer)
- Suara masuk ke isi pengumuman; dihapus pengumuman → file storage ikut dihapus

## File
- js/chat.js, css/style.css
- js/db.js, js/announce.js, js/admin.js, admin.html
