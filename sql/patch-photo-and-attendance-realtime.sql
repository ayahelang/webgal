-- ============================================================
-- Foto profil hotlink + Absensi realtime (jalankan di SQL Editor)
-- ============================================================

-- 1) Kolom foto kustom siswa
alter table public.gallery_profiles
  add column if not exists profile_photo_url text default '';

comment on column public.gallery_profiles.profile_photo_url is
  'Hotlink foto profil siswa. Jika diisi, mengalahkan avatar Google di gallery/popup.';

-- 2) Izin terlambat pada sesi absensi
alter table public.gallery_attendance_sessions
  add column if not exists allow_late boolean default false;

alter table public.gallery_attendance_sessions
  add column if not exists updated_at timestamptz default now();

-- 3) Status check-in/out pada record
alter table public.gallery_attendance_records
  add column if not exists checkin_status text default '';

alter table public.gallery_attendance_records
  add column if not exists checkout_status text default '';

alter table public.gallery_attendance_records
  add column if not exists updated_at timestamptz default now();

-- 4) RLS baca publik / tulis authenticated (aman untuk app)
alter table public.gallery_attendance_sessions enable row level security;
alter table public.gallery_attendance_records enable row level security;

drop policy if exists att_sess_read on public.gallery_attendance_sessions;
create policy att_sess_read on public.gallery_attendance_sessions
  for select to anon, authenticated using (true);

drop policy if exists att_sess_write on public.gallery_attendance_sessions;
create policy att_sess_write on public.gallery_attendance_sessions
  for all to authenticated using (true) with check (true);

drop policy if exists att_rec_read on public.gallery_attendance_records;
create policy att_rec_read on public.gallery_attendance_records
  for select to anon, authenticated using (true);

drop policy if exists att_rec_write on public.gallery_attendance_records;
create policy att_rec_write on public.gallery_attendance_records
  for all to authenticated using (true) with check (true);

-- 5) Realtime publication — wajib agar postgres_changes jalan
do $$
begin
  begin
    alter publication supabase_realtime add table public.gallery_attendance_sessions;
  exception when duplicate_object then null;
            when undefined_object then
              raise notice 'publication supabase_realtime tidak ada';
            when others then
              raise notice 'skip sessions publication: %', sqlerrm;
  end;
  begin
    alter publication supabase_realtime add table public.gallery_attendance_records;
  exception when duplicate_object then null;
            when undefined_object then
              raise notice 'publication supabase_realtime tidak ada';
            when others then
              raise notice 'skip records publication: %', sqlerrm;
  end;
end $$;

-- 6) Pastikan REPLICA IDENTITY penuh (agar UPDATE terkirim lengkap)
alter table public.gallery_attendance_sessions replica identity full;
alter table public.gallery_attendance_records replica identity full;

-- Cek cepat:
-- select column_name from information_schema.columns
--   where table_name='gallery_profiles' and column_name='profile_photo_url';
-- select * from pg_publication_tables where pubname='supabase_realtime'
--   and tablename like 'gallery_attendance%';
