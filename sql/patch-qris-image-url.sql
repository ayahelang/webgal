-- Kolom QRIS siswa (hotlink gambar) pada profil
-- Jalankan di SQL Editor database jika tombol/simpan QRIS belum berfungsi

alter table gallery_profiles
  add column if not exists qris_image_url text default '';

comment on column gallery_profiles.qris_image_url is 'URL gambar QRIS publik siswa (uang jajan di kartu gallery)';
