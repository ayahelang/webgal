# Webgal — Facebook video gallery support

Hanya menyentuh galeri video (parse/embed/thumbnail). Fitur chat & lainnya tidak diubah.

## Yang diperbaiki
1. Link Facebook didukung, termasuk:
   - `https://www.facebook.com/share/v/...`
   - `facebook.com/reel/...`
   - `facebook.com/.../videos/...`
   - `fb.watch/...`
2. Embed memakai plugin resmi:
   `https://www.facebook.com/plugins/video.php?href=...`
3. Thumbnail best-effort dari Open Graph (proxy), fallback placeholder "Facebook" + tombol ▶
4. Klik ▶ memutar video di iframe

## File
- `js/db.js` — parseVideoUrl + fetchVideoMeta (OG)
- `js/videos.js` — tampilan kartu & play
- `css/style.css` — placeholder thumb Facebook

## Catatan
- Video yang **sudah tersimpan** dengan embed lama (URL mentah) akan diperbaiki otomatis saat ditampilkan di halaman Video.
- Thumbnail FB bergantung pada proxy publik; jika gagal, tetap bisa diputar lewat placeholder ▶.
