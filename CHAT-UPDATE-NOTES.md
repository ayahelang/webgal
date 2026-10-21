# Webgal Chat Update v7 — Pesan suara + copy + kirim icon

Hanya menyentuh fitur chat. Fitur lain tidak diubah.

## Fitur baru

### 1. Pesan suara (seperti WA)
- Tombol 🎤 di dalam kotak pengetikan.
- Rekam → bar timer → **Kirim suara** / **Batal**.
- Maks ~2 menit / ~3 MB.
- Format body: `__voice__|ttl=...|URL`

### 2. Retensi otomatis pesan suara
| Pengirim | Bertahan |
|----------|----------|
| Siswa / umum | **3 jam** |
| Guru / pengajar | **24 jam** |
| Admin | **Selamanya** (sampai hapus manual) |

Klien menyembunyikan suara kedaluwarsa dan mencoba menghapus baris DB yang diizinkan. Ada catatan SQL opsional di `sql/chat-voice-notes.sql`.

### 3. Tombol salin (copy)
- Icon ⧉ transparan di pojok kanan tiap bubble (muncul saat hover / selalu tipis di HP).

### 4. Tombol kirim & lampiran
- Icon overlay transparan di dalam kotak pengetikan (hemat tempat).

## File
- `chat.html`
- `js/chat.js`
- `js/db.js` (+ `uploadChatAudio`)
- `css/style.css`
- `sql/chat-voice-notes.sql` (opsional)

Pastikan bucket Supabase `chat-images` mengizinkan upload `audio/webm` (dan path `voice/`).
