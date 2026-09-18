# Silverhawk Web Gallery — Alumni Edition (revisi)

## Perbaikan
- Data JSON angkatan **2025** (kelas 51 & 52 aktif) **tidak hilang**: digabung dengan Supabase
- Thumbnail **otomatis** (SVG) jika file thumb tidak ada — termasuk input alumni
- Label angkatan 2024 / 2025
- Chat: **is typing** + **avatar emoji**

## Setup ulang SQL
Jalankan lagi `supabase-gallery-setup.sql` di SQL Editor (aman: on conflict do nothing).

Enable Realtime:
- `gallery_chat` (pesan)
- Presence dipakai channel `typing-*` (otomatis)

## Thumbnail
File `data/thumbs/*.svg` hanya cache visual lama.
Karya baru / tanpa thumb → `autoThumb(title,url)` di browser (tanpa upload gambar).
