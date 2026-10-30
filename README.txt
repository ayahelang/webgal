WebGal Alarm — revisi alur (cermat)
===================================
File: js/announce.js, js/db.js, js/admin.js
(+ sql/patch-announcement-alarm.sql jika belum)

Alur ALARM (beda dari pengumuman standar)
-----------------------------------------
1. Klik Simpan → starts_at & alarm_fire_at = waktu klik + delay
2. Floating muncul + hitung mundur (jam pasir + MM:SS)
3. Countdown habis (00:00) → TTS baca judul + isi
4. Lalu splash dibuka → splash_seconds mulai dihitung mundur
5. Splash auto-tutup setelah durasi

Pengumuman TANPA alarm: splash langsung seperti biasa (tanpa delay/TTS wajib).

Jam pasir: animasi pasir turun + flip (gaya pure-CSS hourglass, ringkas).
