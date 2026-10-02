
insert into gallery_video_categories (name, slug)
values ('Karya Siswa', 'karya-siswa'), ('Panduan', 'panduan')
on conflict (slug) do update set name = excluded.name;

update gallery_videos
set category_id = (select id from gallery_video_categories where slug = 'karya-siswa' limit 1)
where category_id is null
   or category_id <> (select id from gallery_video_categories where slug = 'karya-siswa' limit 1);
