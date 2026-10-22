# Webgal — Video gallery fix v2 (FB share + direct MP4 + admin)

## Perilaku link
| Jenis link | Hasil |
|------------|--------|
| **URL .mp4 langsung** (termasuk `instagram.*.fbcdn.net/...mp4`) | Bisa diputar (`<video>`) |
| YouTube / Dailymotion | Seperti biasa |
| `facebook.com/reel/ANGKA` atau `watch?v=ANGKA` | Coba embed plugin |
| `facebook.com/share/v/...` | **Ditolak** saat tambah — tidak playable di situs pihak ketiga |
| Halaman Instagram (instagram.com/...) | **Ditolak** — pakai URL .mp4 langsung |

### Saran link yang benar
1. YouTube / Dailymotion (paling stabil)
2. URL file `.mp4` langsung (contoh CDN yang Anda kirim)
3. Facebook bentuk `https://www.facebook.com/reel/1389299909981389/` (buka share/v dulu, salin URL akhir)

## Admin di halaman Video
Login sebagai admin → tiap kartu punya **✎ Ubah** dan **🗑 Hapus**.
Ubah membuka floating panel (judul, URL, kategori, pemilik, deskripsi).

## File
- js/db.js
- js/videos.js
- css/style.css
