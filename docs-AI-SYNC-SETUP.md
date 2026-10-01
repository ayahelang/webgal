# Setup AI Sync (Supabase)

## 1. SQL
Jalankan `supabase-patch-ai-sync.sql` di SQL Editor.

## 2. Secrets
Dashboard Supabase → Project Settings → Edge Functions → Secrets:

- `OPENAI_API_KEY` **atau** `GROQ_API_KEY` (salah satu)

## 3. Deploy function
```bash
supabase functions deploy sync-ai-docs
```
Folder: `supabase/functions/sync-ai-docs`

## 4. Di panel admin → Sync Docs
1. **Import Sheet** — nama, nickname, intro video (sheet 51 & 52)
2. **Analisis AI dari Google Docs** — skills map + cocokkan nama
3. Opsional: Sync teks biasa (tanpa AI)

Sheet default: `1kr4Dvd2LcrCJLYvhwnYkWcRhUXPgTw9uZlOaeTK8SXE`
Docs tab 51 & 52 sudah terisi di form.
