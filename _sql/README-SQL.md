# SQL untuk Supabase (bukan untuk GitHub Pages)

File `.sql` **tidak perlu** dijalankan setiap deploy ke GitHub Pages.  
Jalankan di **Supabase Dashboard → SQL Editor** hanya jika database belum punya tabel/kolom yang dibutuhkan.

## Kapan perlu dijalankan?

| Situasi | Apa yang dijalankan |
|--------|----------------------|
| **Database baru / kosong** | `supabase-gallery-setup.sql` dulu (setup penuh), lalu seed jika perlu |
| **DB sudah jalan** (galeri, video, login Google sudah OK) | **Tidak wajib** jalankan ulang setup |
| Fitur admin / taut profil / karya siswa belum ada | Patch di bawah (urut) |

## Urutan patch (jika DB lama)

1. `supabase-patch-profiles-admin.sql` — kolom admin & profil  
2. `supabase-patch-angkatan-video-admin-v2.sql` (lebih lengkap dari v1)  
3. `supabase-patch-user-works.sql` — owner website/video per user  
4. `supabase-patch-social-stats.sql` — reaksi & statistik  
5. `supabase-patch-videos-karya-siswa.sql` — kategori Karya Siswa  

Seed (data bulk, hati-hati overwrite):

- `supabase-seed-github-pages.sql`
- `supabase-seed-angkatan-2024.sql`

## Fitur revisi terbaru (hapus user non-admin)

Cukup RLS/policy yang sudah mengizinkan admin menghapus baris di `gallery_profiles`.  
Tidak ada file SQL baru khusus untuk itu. Jika tombol hapus gagal, cek policy DELETE di tabel `gallery_profiles`.

## Cara di Chrome (tanpa terminal lokal)

1. Buka https://supabase.com → project gallery Anda  
2. Menu kiri **SQL** → **New query**  
3. Paste isi file SQL → **Run**
