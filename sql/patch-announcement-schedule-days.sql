-- Hari tampil berulang (0=Minggu … 6=Sabtu = JS getDay())
-- Array kosong = setiap hari
alter table gallery_announcements
  add column if not exists schedule_days int[] default '{}';
