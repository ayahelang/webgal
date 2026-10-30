WebGal — Alarm countdown floating + PSI
=======================================
Deploy:
  admin.html
  js/admin.js
  js/db.js
  js/announce.js
  sql/patch-announcement-alarm.sql   ← WAJIB dijalankan di Supabase
  (+ file PSI sebelumnya: index.html, sw.js, css/style.css)

SQL menambah kolom:
  is_alarm, alarm_delay_sec, alarm_fire_at

Cara pakai (Admin → Pengumuman)
-------------------------------
1. Centang "⏰ Alarm bersuara"
2. Isi Menit + Detik (hitung mundur sejak Simpan)
3. Simpan → kotak floating muncul (geser, minimize)
4. Saat 00:00 → TTS baca judul + isi
5. Floating tetap antar halaman (announce.js di tiap page)
6. Pengguna sesuai audience/show_on juga melihat floating yang sama

Catatan TTS: beberapa browser butuh interaksi user dulu.
