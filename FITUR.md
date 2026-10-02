# Riwayat versi (ringkas)

## v2026.10.03
- Roles: Siswa / Pengajar / Alumni / Belum ditunjuk
- Tab Users (kelola data) & Roles (akun Google)
- Bulk upload siswa CSV/Sheet; absensi layout & rekap dropdown
- Seed alumni 2023 jurusan IT-related
- About: portfolio silverhawk.web.id

# Daftar Fitur — Silverhawk Web Gallery (webgal)

Aplikasi galeri karya digital santriwati SMA PMA (Web Design / SMM), deploy GitHub Pages + backend Supabase.

---

## 1. Halaman publik

| Halaman | Fitur utama |
|--------|-------------|
| **Gallery** (`index.html`) | Daftar karya website siswa, filter angkatan/kelas, pencarian, sorting, karya acak, tooltip deskripsi + metadata URL |
| **Video** (`videos.html`) | Galeri video (YouTube/Dailymotion/dll.), filter kategori, angkatan/kelas, **dropdown nama siswa**, pencarian |
| **Skills Map** (`skills.html`) | Learning outcomes, 7 domain keterampilan, tingkat penguasaan (Introduced / Practiced / Applied), unduh Prota/Prosem/ATP/RPP |
| **Nilai Proses** (`refleksi.html`) | Refleksi / testimoni pembelajaran (“What We Have Learnt”) |
| **Kisi-kisi STS** (`kisi-kisi.html`) | Kisi-kisi ujian sumatif (PG + essay) |
| **Statistik** (`stats.html`) | Ringkasan aktivitas / reaksi / kunjungan |
| **Chat** (`chat.html`) | Chat per angkatan (realtime Supabase), indikator mengetik |
| **About** (`about.html`) | Tentang program |
| **Absensi siswa** (`absensi.html`) | Check-in / check-out sesi yang ditetapkan admin |
| **Submit Alumni** (`submit.html`) | Input karya alumni (kode akses) |

---

## 2. Autentikasi & profil

- Login **Google** (Supabase Auth)
- Chip profil di topbar (avatar + status: Siswa Aktif / Kakak Kelas / Alumni)
- **Tautkan identitas**: Angkatan → Kelas → Nama (dari roster)
- Status otomatis dari tahun angkatan vs tahun berjalan
- Setelah taut nama: akses **Karya Saya** (CRUD website & video milik sendiri)

---

## 3. Karya Siswa (`my-works.html`)

Untuk user yang sudah login + taut nama:

- **Website**: tambah / ubah / hapus (judul, URL, kategori)
- **Video**: tambah / ubah / hapus (URL, judul, deskripsi; embed otomatis bila memungkinkan)
- Data terkait identitas siswa di database

---

## 4. Panel Admin (`admin.html`)

Login Google + hak admin (email utama atau `is_admin` + permissions).

### Tab

| Tab | Kemampuan |
|-----|-----------|
| **Video** | CRUD video & kategori; tree hierarki kategori → angkatan → kelas → nama |
| **Website Siswa** | Kelola data website / karya di gallery |
| **Alumni** | Kelola data alumni |
| **Angkatan** | Kelola label angkatan |
| **Tautan Siswa** | Lihat & kelola tautan profil ↔ nama siswa |
| **Users & Admin** | Daftar user Google, centang hak akses tambahan, jadikan/cabut admin, hapus user non-admin |
| **Absensi** | Buat sesi absensi (jadwal, mapel, hari/tanggal, window check-in/out), pilih siswa penerima (tree checkbox), rekap, unduh CSV |
| **Pengumuman** | Splash pengumuman (audiens: depan / login / siswa tertentu), editor konten, jadwal, durasi, preview |
| **Sync Docs** | Import roster Google Sheet; sinkron refleksi/skills dari Google Docs (teks / AI via Edge Function) |

### Hak akses granular (contoh)

`manage_videos`, `manage_websites`, `manage_alumni`, `manage_angkatan`, `manage_admins`, `view_users`, `manage_attendance`, dll. (sesuai config).

---

## 5. Tree checkbox siswa (Admin)

Dipakai di **Absensi** dan **Pengumuman** (siswa tertentu):

- Hierarki **div** (bukan iframe): **Angkatan → Kelas → Nama**
- Checkbox di **parent** (angkatan/kelas) dan **anak** (nama)
- Tri-state: penuh / sebagian (indeterminate) / kosong
- Toggle ▸/▾ untuk expand–collapse
- Multi-pilih untuk target sesi absensi atau splash pengumuman

---

## 6. Pengumuman (splash)

- Audiens: pengunjung home, user login, atau **siswa tertentu** (setelah taut nama)
- Konten rich: teks, link, gambar (URL / paste clipboard)
- Jadwal mulai–selesai, frekuensi per hari, jam tampil, durasi splash
- Bisa ditutup user; preview dari admin

---

## 7. Absensi online

- Sesi: judul, kode/label mapel, tanggal khusus atau hari berulang, jendela check-in/out, wajib checkout
- Target siswa via tree checkbox
- Halaman siswa: check-in/out sesuai sesi aktif
- Admin: rekap + filter + export CSV

---

## 8. Sosial & analitik

- Reaksi (love) & komentar pada karya/video
- Tracking event kunjungan
- Widget statistik mengambang (float) di beberapa halaman
- Ringkasan di halaman Statistik

---

## 9. Data & infrastruktur

- **Frontend statis**: HTML/CSS/JS → GitHub Pages (`CNAME` → webgal.silverhawk.web.id)
- **Supabase**: Auth Google, tabel gallery (alumni, websites, videos, profiles, chat, attendance, announcements, reactions, events, …)
- Fallback offline: `data/fallback.js` + `data/websites.json` jika DB belum siap
- Roster: `data/student-roster.json` + data DB
- Kurikulum: `docs/` (Prota, Prosem, Silabus/ATP, Modul Ajar)
- Schema referensi: `sql/supabase-full-schema.sql`
- Edge Functions: folder `supabase/functions` (mis. sync AI docs)

---

## 10. Utilitas repo

- `scripts/cleanup-unused.sh` — hapus file duplikat
- `scripts/git-push-helper.sh` — panduan login/push GitHub
- `docs/FILE-CLEANUP-LIST.md` — catatan pembersihan

---

*Dokumen ini disusun dari struktur kode aplikasi (HTML/JS) pada paket rombakan pengguna.*
