-- Semua video → kategori Karya Siswa

insert into gallery_video_categories (name, slug)
values ('Karya Siswa', 'karya-siswa')
on conflict (slug) do update set name = excluded.name;

update gallery_videos
set category_id = (select id from gallery_video_categories where slug = 'karya-siswa' limit 1)
where category_id is null
   or category_id not in (select id from gallery_video_categories where slug = 'karya-siswa');

-- opsional: biarkan kategori Panduan tetap ada untuk admin nanti
insert into gallery_video_categories (name, slug)
values ('Panduan', 'panduan')
on conflict (slug) do nothing;
