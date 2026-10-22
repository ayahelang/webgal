# Webgal Video Gallery v3

## Admin
Tombol **✎ Ubah** / **🗑 Hapus** muncul di tiap kartu setelah login admin (deteksi diulang 1.5s & 4s jika sesi belakangan siap).

## Platform
| Platform | Format yang didukung |
|----------|----------------------|
| YouTube / Dailymotion | URL biasa |
| TikTok | `tiktok.com/@user/video/ANGKA` → embed resmi |
| Instagram | `instagram.com/reel/KODE` atau `/p/KODE` → embed |
| X | `x.com/user/status/ANGKA` → embed tweet |
| Facebook | `facebook.com/reel/ANGKA` (share/v ditolak). Jika iframe "unavailable" → tombol buka di Facebook |
| .mp4 langsung | Player HTML5 |

## Panduan
Accordion "Cara menambahkan link video yang benar" di atas grid video.

## File
- videos.html
- js/db.js
- js/videos.js
- css/style.css
