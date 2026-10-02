-- Karya milik user (website + video)

alter table gallery_videos add column if not exists owner_user_id uuid;
alter table gallery_videos add column if not exists owner_name text default '';
create index if not exists gallery_videos_owner_idx on gallery_videos(owner_user_id);

-- pastikan profil punya kolom tautan (dari patch sebelumnya)
alter table gallery_profiles add column if not exists linked_student_name text default '';
alter table gallery_profiles add column if not exists linked_angkatan_year int;
alter table gallery_profiles add column if not exists linked_class_code text default '';
alter table gallery_profiles add column if not exists linked_alumni_id uuid;

-- kategori default tetap
insert into gallery_video_categories(name, slug) values
  ('Karya Siswa', 'karya-siswa'),
  ('Panduan', 'panduan')
on conflict (slug) do nothing;
