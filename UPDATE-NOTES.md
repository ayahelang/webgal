# Edit balasan + gambar/suara di balas + histori (maks 3×)

## Fitur
1. Bisa **Ubah balasan sendiri** (owner by user_id atau nama login)
2. Kotak balas: 🖼 gambar / tempel screenshot, 🎤 pesan suara
3. Kotak edit: 🖼 gambar / tempel screenshot
4. Maksimal **3× edit** per pesan; tombol **Histori** menampilkan versi lama
5. Label `(diedit N×)` pada pesan

## Database (ringan)
Jalankan sekali di Supabase SQL:
```sql
ALTER TABLE gallery_chat
  ADD COLUMN IF NOT EXISTS edit_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS edit_history jsonb DEFAULT '[]'::jsonb;
```
Tanpa kolom ini, edit tetap jalan; histori penuh butuh kolom di atas.
Histori hanya menyimpan teks lama (dipotong 2000 char), max 3 entri — tidak memberatkan.

## File
- js/chat.js
- js/db.js
- css/style.css
- chat-edit-history.sql
