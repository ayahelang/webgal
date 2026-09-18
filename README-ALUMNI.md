# Silverhawk Web Gallery — Alumni Edition

## Fitur baru
- Input karya alumni (kode akses) + multi URL
- Angkatan unik (anti-dobel)
- Live chat per angkatan / lintas angkatan
- Data dinamis di **Supabase** (JSON tetap sebagai fallback)

## Setup Supabase (rekomendasi)
1. Buat project gratis di https://supabase.com (boleh project sama dengan CBT)
2. SQL Editor → jalankan `supabase-gallery-setup.sql` (skema + migrasi data JSON)
3. Database → Replication → enable `gallery_chat` untuk realtime
4. Project Settings → API → salin URL + anon key ke `data/supabase-config.js`
5. Ganti `submit_code` di tabel `gallery_settings` (default seed: SilverhawkAlumni2026)

## Mengapa Supabase?
- Gratis (tier free)
- Realtime chat
- Postgres andal
- Sudah dipakai CBT Silverhawk

Alternatif: Firebase (Realtime DB), Appwrite, PocketBase self-host.

## File penting
- `supabase-gallery-setup.sql` — skema + migrasi 41 santriwati / 175 website
- `data/supabase-config.js` — kredensial
- `js/db.js` — layer data
- `submit.html` — form alumni
- `chat.html` — chat
