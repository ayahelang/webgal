WebGal — PSI + Talking Alarm (revisi)
====================================
Target: https://webgal.silverhawk.web.id

Salin ke root repo ayahelang/webgal (overwrite):

  index.html
  sw.js
  css/style.css          (minified ~162KB dari ~183KB)
  js/announce.js
  js/db.js
  js/admin.js
  admin.html
  sql/patch-announcement-alarm.sql

PageSpeed (mobile)
------------------
• style.css preload non-blocking (+ noscript fallback)
• CSS di-minify (hapus komentar/whitespace)
• Service Worker v4: cache-first aset statis (kunjungan ulang lebih cepat)
• Inline critical theme + slot fixed (sudah ada, dipertahankan)

Catatan: skor Lighthouse tergantung CDN/hosting. Untuk cache TTL di edge
(GitHub Pages terbatas), SW menangani kunjungan ulang.

404 gambar (ghusercontent) biasanya URL karya user — perbaiki di data/admin
karya, bukan di CSS inti.

Talking Alarm
-------------
1. Jalankan SQL: sql/patch-announcement-alarm.sql di Supabase
2. Admin → Pengumuman → centang "Alarm bersuara"
3. Atur jadwal jam/hari seperti pengumuman biasa
4. Saat waktunya: splash + TTS (speechSynthesis) membacakan judul + isi
5. Polling tiap 60 detik untuk alarm yang jatuh tempo

Perbedaan vs pengumuman biasa:
• is_alarm = true → ikon ⏰ + suara
• Tetap pakai audience, schedule_hours, schedule_days, times_per_day

Browser harus mengizinkan autoplay suara; di beberapa HP perlu
interaksi user dulu agar speechSynthesis jalan.
