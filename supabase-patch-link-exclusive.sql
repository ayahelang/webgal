-- Izin tautan ganda (opsional) + kolom pendukung
alter table gallery_profiles
  add column if not exists link_allow_user_ids jsonb default '[]'::jsonb;

-- Index bantu cek tautan per angkatan
create index if not exists gallery_profiles_link_lookup_idx
  on gallery_profiles (linked_angkatan_year, linked_student_name)
  where linked_student_name is not null and linked_student_name <> '';
