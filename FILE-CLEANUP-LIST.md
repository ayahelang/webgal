# File yang dibuang / digabung (cleanup)

## SQL digabung → `sql/supabase-full-schema.sql`
- `_sql/supabase-gallery-setup.sql`
- `_sql/supabase-patch-angkatan-video-admin.sql` (versi lama, diganti v2)
- `_sql/supabase-patch-angkatan-video-admin-v2.sql`
- `_sql/supabase-patch-profiles-admin.sql`
- `_sql/supabase-patch-social-stats.sql`
- `_sql/supabase-patch-user-works.sql`
- `_sql/supabase-patch-videos-karya-siswa.sql`
- `_sql/supabase-patch-videos-karya-siswa (1).sql` (duplikat)
- `_sql/supabase-seed-angkatan-2024.sql` (seed sekali-pakai, tidak di-merge ke runtime)
- `_sql/supabase-seed-github-pages.sql` (seed sekali-pakai)
- `_sql/README-SQL.md`
- `supabase-patch-announcements.sql`
- `supabase-patch-attendance.sql`
- `supabase-patch-contact-privacy.sql`
- `supabase-patch-link-exclusive.sql`
- `supabase-patch-docs-sync.sql`
- `supabase-patch-ai-sync.sql`
- `supabase-clean-domain-titles.sql`
- `supabase-dedupe-websites.sql`

## Dokumentasi root digabung/pindah
- `README-ALUMNI.md` — info historis, tidak diload app
- `SUPABASE-REALTIME.txt` — catatan setup
- `docs-AI-SYNC-SETUP.md` — pindah konsep ke README + edge function

## Script pindah ke `scripts/`
- `cleanup-unused.sh`
- `git-push-helper.sh`

## Tetap dipakai (JANGAN hapus)
- Semua `*.html`, `js/*`, `css/style.css`
- `data/supabase-config.js`, `student-roster.json`, `skills.json`, `refleksi-bonus.json`, `kisi-kisi-sts.json`
- `data/websites.json` + `data/fallback.js` (cadangan jika DB gagal)
- `docs/*.docx` (tautan unduh di skills.html)
- `supabase/functions/sync-ai-docs/index.ts`
- `CNAME`, `assets/favicon.svg`
