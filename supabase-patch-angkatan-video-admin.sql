-- Patch: hanya Angkatan 2024 & 2025, class 51/52 per angkatan, video gallery

-- 1) Pastikan dua angkatan utama ada
insert into gallery_angkatan(label, label_norm, source) values
  ('Angkatan 2024', 'angkatan-2024', 'system'),
  ('Angkatan 2025', 'angkatan-2025', 'system')
on conflict (label_norm) do update set label = excluded.label;

-- 2) Pindahkan alumni dari label lama (Kelas 51/52 · 2025) ke Angkatan 2025 + class_code
update gallery_alumni al
set angkatan_id = (select id from gallery_angkatan where label_norm = 'angkatan-2025' limit 1),
    class_code = coalesce(nullif(trim(al.class_code), ''),
      case
        when a.label_norm like '%51%' then '51'
        when a.label_norm like '%52%' then '52'
        else al.class_code
      end)
from gallery_angkatan a
where al.angkatan_id = a.id
  and a.label_norm in ('kelas-51-2025', 'kelas-52-2025', 'kelas-51', 'kelas-52');

-- 3) Hapus angkatan selain 2024 & 2025 (hanya yang tidak terpakai)
delete from gallery_angkatan
where label_norm not in ('angkatan-2024', 'angkatan-2025')
  and id not in (select distinct angkatan_id from gallery_alumni);

-- 4) Kolom class
alter table gallery_alumni add column if not exists class_code text default '';

-- 5) Video gallery
create table if not exists gallery_video_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz default now()
);

insert into gallery_video_categories(name, slug) values
  ('Panduan', 'panduan'),
  ('Karya Siswa', 'karya-siswa')
on conflict (slug) do nothing;

create table if not exists gallery_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  platform text default 'youtube', -- youtube | dailymotion | other
  embed_url text,
  category_id uuid references gallery_video_categories(id) on delete set null,
  description text default '',
  created_by text default '',
  created_at timestamptz default now()
);

alter table gallery_video_categories enable row level security;
alter table gallery_videos enable row level security;
drop policy if exists gvc_all on gallery_video_categories;
create policy gvc_all on gallery_video_categories for all using (true) with check (true);
drop policy if exists gv_all on gallery_videos;
create policy gv_all on gallery_videos for all using (true) with check (true);
