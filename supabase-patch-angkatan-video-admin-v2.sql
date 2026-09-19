-- ============================================================
-- Patch v2 (AMAN) — anti duplicate key
-- Angkatan hanya 2024 & 2025 + video gallery
-- ============================================================

-- 0) Kolom yang dibutuhkan
alter table gallery_alumni add column if not exists class_code text default '';
alter table gallery_alumni add column if not exists avatar_emoji text default '🎓';
alter table gallery_chat add column if not exists avatar_emoji text default '💬';

-- 1) Pastikan angkatan utama ada
insert into gallery_angkatan(label, label_norm, source) values
  ('Angkatan 2024', 'angkatan-2024', 'system'),
  ('Angkatan 2025', 'angkatan-2025', 'system')
on conflict (label_norm) do update set label = excluded.label;

-- id target
-- (dipakai di CTE di bawah)

-- 2) VIDEO tables (aman diulang)
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
  platform text default 'youtube',
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

-- 3) Migrasi alumni dari label lama → Angkatan 2025 TANPA melanggar unique
--    Strategi:
--    a) Tentukan class_code dari label lama
--    b) Jika (name_norm, angkatan-2025) SUDAH ada → pindahkan websites ke baris yang sudah ada, hapus baris lama
--    c) Jika belum ada → update angkatan_id ke 2025

do $$
declare
  target uuid;
  r record;
  keep_id uuid;
begin
  select id into target from gallery_angkatan where label_norm = 'angkatan-2025' limit 1;
  if target is null then
    raise exception 'Angkatan 2025 tidak ditemukan';
  end if;

  for r in
    select al.id, al.name_norm, al.class_code, a.label_norm
    from gallery_alumni al
    join gallery_angkatan a on a.id = al.angkatan_id
    where a.label_norm not in ('angkatan-2024', 'angkatan-2025')
  loop
    -- isi class_code dari label lama jika kosong
    if coalesce(trim(r.class_code), '') = '' then
      if r.label_norm like '%51%' then
        update gallery_alumni set class_code = '51' where id = r.id;
      elsif r.label_norm like '%52%' then
        update gallery_alumni set class_code = '52' where id = r.id;
      end if;
    end if;

    -- cek apakah sudah ada alumni sama di angkatan 2025
    select id into keep_id
    from gallery_alumni
    where name_norm = r.name_norm and angkatan_id = target
    limit 1;

    if keep_id is null then
      -- belum ada → pindahkan saja
      update gallery_alumni set angkatan_id = target where id = r.id;
    elsif keep_id = r.id then
      -- sudah di target
      null;
    else
      -- sudah ada baris lain di 2025 → pindahkan website ke keep_id, hapus duplikat
      update gallery_websites set alumni_id = keep_id where alumni_id = r.id;
      -- isi class_code keep jika kosong
      update gallery_alumni k
      set class_code = coalesce(nullif(trim(k.class_code), ''), (select class_code from gallery_alumni where id = r.id))
      where k.id = keep_id;
      delete from gallery_alumni where id = r.id;
    end if;
  end loop;
end $$;

-- 4) Hapus angkatan sisa yang tidak punya alumni
delete from gallery_angkatan
where label_norm not in ('angkatan-2024', 'angkatan-2025')
  and id not in (select distinct angkatan_id from gallery_alumni where angkatan_id is not null);

-- 5) Rapikan class_code kosong di 2025 (opsional default)
-- biarkan admin isi manual jika masih kosong

-- Selesai
select 'OK patch v2' as status,
  (select count(*) from gallery_angkatan) as jml_angkatan,
  (select count(*) from gallery_alumni) as jml_alumni,
  (select count(*) from gallery_websites) as jml_web;
