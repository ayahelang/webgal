# Webgal Chat UI Update (revisi)

Perubahan hanya pada fitur chat. Fitur lain tidak diganggu.

## File yang diubah
- `chat.html` — textarea input, posisi reply bar di atas form
- `js/chat.js` — auto-resize, clamp teks + Baca selengkapnya, notifikasi suara, perbaikan minimize/restore
- `css/style.css` — style untuk input multi-baris, clamp pesan, restore button lebih andal di mobile

## Fitur baru / perbaikan

1. **Kotak pengetikan (utama & saat balas)**
   - Sekarang `<textarea>` yang collapse (1 baris) dan bisa melar otomatis hingga **maksimal 4 baris**.
   - Saat membalas, reply bar tampil di atas kotak pengetikan.
   - Enter = kirim, Shift+Enter = baris baru.

2. **Teks pesan yang sudah terkirim**
   - Maksimal terlihat **4 baris**.
   - Tombol **Baca selengkapnya** → expand hingga **13 baris** + scroll vertikal jika masih belum muat.
   - Tombol berubah jadi **Tutup** untuk collapse lagi.

3. **Tombol Minimize**
   - Perbaikan bug mobile: setelah minimize, tombol **💬 Chat** (restore) selalu muncul dan bisa diklik.
   - Di layar sempit (<720px) restore kembali ke mode **dock**; di desktop ke **float**.
   - Escape juga bisa keluar dari mode minimize.
   - Class body `chat-is-min` + z-index lebih tinggi agar tidak tertutup elemen lain.

4. **Suara notifikasi**
   - Suara lembut (chime) setiap ada pesan masuk yang **bukan milik sendiri**.
   - Suara berbeda (double beep lebih tinggi) jika pesan tersebut adalah **balasan ke pesan milik user**.
   - Memakai Web Audio API (tanpa file eksternal). Browser mungkin meminta interaksi dulu sebelum audio diizinkan.

## Cara pakai
Ganti 3 file di atas di repo / hosting GitHub Pages Anda, lalu hard-refresh (Ctrl+F5) atau clear cache.

Tidak ada perubahan database / Supabase.
