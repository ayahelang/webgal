# Webgal Chat Update v2

## File diubah
- `chat.html` — maxlength input 8000
- `js/chat.js` — in-place edit, inline reply di bawah tombol Balas, clamp teks
- `js/db.js` — batas body chat 1000 → **8000** karakter (~7x tinggi layar HP)
- `css/style.css` — style composer inline + input multi-baris

## Perubahan baru (v2)

1. **Batas teks panjang**
   - Client + DB layer: 1000 → **8000** karakter.
   - Cukup untuk teks ~7x scroll layar HP (tergantung ukuran font).

2. **Ubah (edit) di tempat**
   - Tidak lagi memakai `prompt()` browser.
   - Klik **Ubah** → textarea muncul di dalam bubble pesan itu sendiri.
   - Tombol Simpan / Batal.

3. **Balas di bawah tombol Balas**
   - Klik **Balas** → div composer collapse muncul **tepat di bawah** baris aksi (Balas/Ubah/Hapus) pada pesan tersebut.
   - Tinggi 1–4 baris, auto-grow, bisa scroll vertikal.
   - Enter = kirim, Shift+Enter = baris baru.
   - Klik Balas lagi / Batal menutup composer.
   - Reply bar di bawah form tetap sinkron (label “Membalas …”).

## Cara pasang
Timpa ke-4 file di atas, hard-refresh (Ctrl+F5).

Tidak perlu migrasi SQL jika kolom `body` sudah tipe `text` (default). Jika kolom masih `varchar(1000)`, jalankan di Supabase SQL:
```sql
ALTER TABLE gallery_chat ALTER COLUMN body TYPE text;
```
