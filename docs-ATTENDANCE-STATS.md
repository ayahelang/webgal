# Statistik absensi berulang & database

## Model data (sudah ada)
- **gallery_attendance_sessions** = definisi sesi (judul, jam check-in/out, hari/tanggal, target siswa). Satu sesi bisa dipakai berulang jika `session_date` / weekday diisi per jadwal.
- **gallery_attendance_records** = 1 baris per siswa per sesi (atau per hari aktual) berisi check-in/out.

## Statistik "Senin minggu ke-1, ke-2, …"
- Secara natural: filter `records` by `session_id` + rentang tanggal `checkin_at` / `session_date`.
- Rekap admin sudah bisa unduh **CSV** per sesi.
- Agregasi per-minggu bisa ditambah di UI (group by ISO week) tanpa tabel baru.

## Risiko lag / penuh (Supabase free)
- Bertambahnya **records** (bukan sesi) yang bikin besar.
- `listAttendanceRecords` memakai **limit** (mis. 500) — hindari select tanpa batas.

## Mitigasi (fitur baru di patch ini)
1. Admin: **Arsip & bersihkan** — pilih tanggal, hapus record sebelum tanggal itu.
2. Workflow: **unduh CSV dulu** → baru purge.
3. Sesi/template **tidak** ikut terhapus, jadi jadwal rutin tetap jalan.

## Rekomendasi operasional
- Tiap akhir semester: export CSV → purge record semester lalu.
- Jangan buat sesi baru setiap hari jika cukup 1 sesi berulang + record harian.
