# Silverhawk Student Web Gallery

## Struktur
- `*.html` — halaman
- `js/` — skrip aplikasi
- `css/` — gaya
- `data/` — config Supabase + JSON cadangan
- `assets/` — favicon
- `docs/` — Prota/Prosem/Silabus (unduh di Skills)
- `sql/supabase-full-schema.sql` — **satu file** skema + patch Supabase
- `supabase/functions/` — Edge Function (AI sync docs)
- `scripts/` — helper lokal (bukan untuk GitHub Pages)

## Deploy GitHub Pages
Upload isi folder ini (kecuali `scripts/` opsional). Pastikan `data/supabase-config.js` berisi URL & anon key proyek Anda.

## Supabase
Jalankan `sql/supabase-full-schema.sql` di SQL Editor jika database baru / perlu patch lengkap.
