-- Silverhawk Gallery — setup + migrasi (revisi angkatan)
-- JSON lama: Kelas 51 & 52 = Angkatan 2025 (masih semester ganjil SMM)
-- Angkatan 2024 = alumni / kelas 12 (dulu juga 51/52 di tahun berbeda)

create extension if not exists "pgcrypto";

create table if not exists gallery_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

insert into gallery_settings(key, value) values
  ('submit_code', 'Bismillaah2024')
on conflict (key) do nothing;

create table if not exists gallery_angkatan (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  label_norm text not null unique,
  source text default 'manual',
  created_at timestamptz default now()
);

create table if not exists gallery_alumni (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_norm text not null,
  angkatan_id uuid not null references gallery_angkatan(id) on delete restrict,
  legacy_id text,
  class_code text default '',
  school text default 'SMA PMA',
  role text default 'Santriwati',
  avatar_emoji text default '🎓',
  created_at timestamptz default now(),
  unique(name_norm, angkatan_id)
);

create table if not exists gallery_websites (
  id uuid primary key default gen_random_uuid(),
  alumni_id uuid not null references gallery_alumni(id) on delete cascade,
  title text not null,
  url text not null,
  category text default 'Web Kreatif',
  description text default '',
  tags text[] default '{}',
  created_at timestamptz default now()
);

create unique index if not exists gallery_websites_url_uidx
  on gallery_websites (lower(trim(trailing '/' from url)));

create table if not exists gallery_chat (
  id uuid primary key default gen_random_uuid(),
  angkatan_id uuid references gallery_angkatan(id) on delete cascade,
  author_name text not null,
  avatar_emoji text default '💬',
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 1000),
  created_at timestamptz default now()
);

create index if not exists gallery_chat_room_idx on gallery_chat (angkatan_id, created_at desc);

alter table gallery_settings enable row level security;
alter table gallery_angkatan enable row level security;
alter table gallery_alumni enable row level security;
alter table gallery_websites enable row level security;
alter table gallery_chat enable row level security;

drop policy if exists ga_settings_read on gallery_settings;
create policy ga_settings_read on gallery_settings for select using (true);
drop policy if exists ga_angkatan_all on gallery_angkatan;
create policy ga_angkatan_all on gallery_angkatan for all using (true) with check (true);
drop policy if exists ga_alumni_all on gallery_alumni;
create policy ga_alumni_all on gallery_alumni for all using (true) with check (true);
drop policy if exists ga_web_all on gallery_websites;
create policy ga_web_all on gallery_websites for all using (true) with check (true);
drop policy if exists ga_chat_all on gallery_chat;
create policy ga_chat_all on gallery_chat for all using (true) with check (true);

-- pastikan kolom baru ada jika tabel sudah pernah dibuat
alter table gallery_alumni add column if not exists class_code text default '';
alter table gallery_alumni add column if not exists avatar_emoji text default '🎓';
alter table gallery_chat add column if not exists avatar_emoji text default '💬';

-- Seed angkatan
insert into gallery_angkatan(label, label_norm, source) values
  ('Angkatan 2025', 'angkatan-2025', 'migration'),
  ('Angkatan 2024', 'angkatan-2024', 'migration'),
  ('Kelas 51 · 2025', 'kelas-51-2025', 'migration'),
  ('Kelas 52 · 2025', 'kelas-52-2025', 'migration')
on conflict (label_norm) do nothing;


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Anindya Yahya', 'anindya-yahya', a.id, '51-1', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Nindyk Knity', 'https://nindyacantiqq.github.io/nindyknity/', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'anindya-yahya' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nindyacantiqq.github.io/nindyknity/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Ahay Squy', 'https://nindyacantiqq.github.io/ahaysquy/', 'Web Kreatif', 'Website Ahay Squy.', ARRAY['kreatif']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'anindya-yahya' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nindyacantiqq.github.io/ahaysquy/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Caroval Pasta', 'https://nindyacantiqq.github.io/carovalpasta/#proses', 'Kuliner', 'Website kuliner Caroval Pasta karya Anindya.', ARRAY['pasta','kuliner','cafe']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'anindya-yahya' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nindyacantiqq.github.io/carovalpasta/#proses'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Tropy Mixx', 'https://nindyhaa.github.io/tropymixx/#mixer', 'Game', 'Game mixer minuman Tropy Mixx.', ARRAY['game','minuman','mixer']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'anindya-yahya' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nindyhaa.github.io/tropymixx/#mixer'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Tropicaly Cafe', 'https://nindyhaa.github.io/tropicaly/', 'Kuliner', 'Website Cafe Tropicaly karya Anindya.', ARRAY['cafe','tropical','kuliner']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'anindya-yahya' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nindyhaa.github.io/tropicaly/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Bintang Pertiwi', 'bintang-pertiwi', a.id, '51-2', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Twinkle Adopt', 'https://bintangside.github.io/twinkleadopt/#shop', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'bintang-pertiwi' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://bintangside.github.io/twinkleadopt/#shop'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Bintang Fairy', 'https://bintangside.github.io/bintangfairy/', 'Web Kreatif', 'Karya website Bintang Fairy oleh Bintang Pertiwi.', ARRAY['fairy']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'bintang-pertiwi' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://bintangside.github.io/bintangfairy/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Bintang Game', 'https://bintangside.github.io/game/', 'Game', 'Karya website Bintang Game oleh Bintang Pertiwi.', ARRAY['game']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'bintang-pertiwi' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://bintangside.github.io/game/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Prayer', 'https://bintangside.github.io/prayer/', 'Display Masjid', 'Karya website Prayer oleh Bintang Pertiwi.', ARRAY['prayer','sholat']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'bintang-pertiwi' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://bintangside.github.io/prayer/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Bunga Fella', 'bunga-fella', a.id, '51-3', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'By.Bfe', 'https://bungafellaananda.github.io/by.bfe/', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'bunga-fella' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://bungafellaananda.github.io/by.bfe/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Hafiza Khaira', 'hafiza-khaira', a.id, '51-4', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Hafiza Cake', 'https://hafizakhairalubna.github.io/hafizacake/', 'Kuliner', 'Website kreasi bertema kuliner dengan fokus pada tampilan produk, informasi, dan pengalaman pengunjung.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'hafiza-khaira' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hafizakhairalubna.github.io/hafizacake/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Display Masjid Al-Amin', 'https://hafizakhaira-2.github.io/Displaymasjidalamin/', 'Display Masjid', 'Display masjid Al-Amin.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'hafiza-khaira' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hafizakhaira-2.github.io/Displaymasjidalamin/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'To Do List Our Routine', 'https://hafizakhaira-2.github.io/Todolist/', 'Produktivitas', 'Aplikasi to-do list routine.', ARRAY['todo','routine']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'hafiza-khaira' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hafizakhaira-2.github.io/Todolist/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Hafiza Car Showroom', 'https://hafizakhaira-2.github.io/Hafiza-car/', 'Otomotif', 'Showroom mobil Hafiza.', ARRAY['mobil','showroom']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'hafiza-khaira' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hafizakhaira-2.github.io/Hafiza-car/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Tebak Lanjutan Ayat', 'https://hafizakhaira-2.github.io/tebaklanjutanayat', 'Game', 'Karya website Tebak Lanjutan Ayat oleh Hafiza Khaira.', ARRAY['quran','game','tebak']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'hafiza-khaira' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hafizakhaira-2.github.io/tebaklanjutanayat'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'CV Argo Pratama', 'https://hafizakhaira-2.github.io/CVARGOPRATAMA/', 'Web Kreatif', 'Karya website CV Argo Pratama oleh Hafiza Khaira.', ARRAY['cv','profil']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'hafiza-khaira' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hafizakhaira-2.github.io/CVARGOPRATAMA/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Otak Random', 'https://hafizakhaira-2.github.io/OTAKRANDOM/', 'Game', 'Karya website Otak Random oleh Hafiza Khaira.', ARRAY['game','random']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'hafiza-khaira' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hafizakhaira-2.github.io/OTAKRANDOM/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Haniffah Amallia', 'haniffah-amallia', a.id, '51-5', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Hniffa Skincare', 'https://haniffahamallia.github.io/hniffalaskincare/', 'Fashion & Beauty', 'Eksplorasi desain web bertema fashion, beauty, produk, atau brand dengan identitas visual buatan santriwati.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'haniffah-amallia' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://haniffahamallia.github.io/hniffalaskincare/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Hampers Pernikahan', 'https://haniffahamallia.github.io/hampers-pernikahan/', 'E-Commerce', 'Website hampers pernikahan.', ARRAY['hampers','wedding']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'haniffah-amallia' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://haniffahamallia.github.io/hampers-pernikahan/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Travel Planner', 'https://haniffahamallia.github.io/travelplanner/', 'Travel', 'Aplikasi travel planner.', ARRAY['travel','planner']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'haniffah-amallia' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://haniffahamallia.github.io/travelplanner/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Kartika Chandra', 'kartika-chandra', a.id, '51-6', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Tika Asuka Monkey', 'https://tykaaskya.github.io/tikaasukamonkey/', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'kartika-chandra' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://tykaaskya.github.io/tikaasukamonkey/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Tika Belajar', 'https://tykaaskya.github.io/Tikaabljr/', 'Edukasi', 'Website belajar Tika.', ARRAY['belajar','edukasi']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'kartika-chandra' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://tykaaskya.github.io/Tikaabljr/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Tikaaak Monkey', 'https://tykaaskya.github.io/tikaaak/', 'Web Kreatif', 'Karya website Tikaaak Monkey oleh Kartika Chandra.', ARRAY['monkey']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'kartika-chandra' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://tykaaskya.github.io/tikaaak/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Tiikka Masjid', 'https://tykaaskya.github.io/tiikka/', 'Display Masjid', 'Karya website Tiikka Masjid oleh Kartika Chandra.', ARRAY['masjid']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'kartika-chandra' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://tykaaskya.github.io/tiikka/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Khansa Aura', 'khansa-aura', a.id, '51-7', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Aura Flower', 'https://khansabloom.github.io/auraflower/', 'Fashion & Beauty', 'Eksplorasi desain web bertema fashion, beauty, produk, atau brand dengan identitas visual buatan santriwati.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'khansa-aura' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://khansabloom.github.io/auraflower/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Miftahul Jannah', 'https://khansabloom.github.io/miftahuljannah/', 'Display Masjid', 'Display masjid Miftahul Jannah.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'khansa-aura' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://khansabloom.github.io/miftahuljannah/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Flower Garden', 'https://khansabloom.github.io/flower-garden/', 'Game', 'Game menyiram tanaman Flower Garden.', ARRAY['garden','game','tanaman']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'khansa-aura' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://khansabloom.github.io/flower-garden/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Lathifah Khairunnisa', 'lathifah-khairunnisa', a.id, '51-8', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Yoiijawelry27', 'https://lathifahkhairunnisa.github.io/yoiijawelry27/', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'lathifah-khairunnisa' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://lathifahkhairunnisa.github.io/yoiijawelry27/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Sushi Rush', 'https://lathifahkhairunnisa.github.io/sushirush/', 'Game', 'Game Sushi Rush.', ARRAY['sushi','game']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'lathifah-khairunnisa' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://lathifahkhairunnisa.github.io/sushirush/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Nusa Journey', 'https://lathifahkhairunnisa.github.io/nusajourney/', 'Travel', 'Karya website Nusa Journey oleh Lathifah Khairunnisa.', ARRAY['travel']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'lathifah-khairunnisa' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://lathifahkhairunnisa.github.io/nusajourney/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Yoiimania', 'https://lathifahkhairunnisa.github.io/yoiimania/', 'Web Kreatif', 'Karya website Yoiimania oleh Lathifah Khairunnisa.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'lathifah-khairunnisa' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://lathifahkhairunnisa.github.io/yoiimania/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Lubna Anindya', 'lubna-anindya', a.id, '51-9', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Luun Aliens', 'https://lunanindyea.github.io/luunaliens/', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'lubna-anindya' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://lunanindyea.github.io/luunaliens/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Nadya Wafa', 'nadya-wafa', a.id, '51-10', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Ndy''s Ice Cream', 'https://nadyaicecream.github.io/ndysices/#promo', 'Kuliner', 'Website kreasi bertema kuliner dengan fokus pada tampilan produk, informasi, dan pengalaman pengunjung.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'nadya-wafa' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nadyaicecream.github.io/ndysices/#promo'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Ndyaa Azkar', 'https://nadyaicecream.github.io/ndyaaazkar/', 'Edukasi', 'Karya website Ndyaa Azkar oleh Nadya Wafa.', ARRAY['azkar','dzikir']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'nadya-wafa' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nadyaicecream.github.io/ndyaaazkar/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Ndy Chik', 'https://nadyaicecream.github.io/ndychik/', 'Web Kreatif', 'Karya website Ndy Chik oleh Nadya Wafa.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'nadya-wafa' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nadyaicecream.github.io/ndychik/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Nd Life', 'https://nadyaicecream.github.io/nd.life/', 'Lifestyle', 'Karya website Nd Life oleh Nadya Wafa.', ARRAY['life']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'nadya-wafa' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nadyaicecream.github.io/nd.life/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Naysilla Nadine', 'naysilla-nadine', a.id, '51-11', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'NDN Coffee', 'https://naysillanadine.github.io/ndncoffee/', 'Kuliner', 'Website kreasi bertema kuliner dengan fokus pada tampilan produk, informasi, dan pengalaman pengunjung.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'naysilla-nadine' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://naysillanadine.github.io/ndncoffee/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Nadwe Lifestyle', 'https://naysillanadine.github.io/nadwelifestyle/', 'Lifestyle', 'Website lifestyle Nadwe.', ARRAY['lifestyle','fashion']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'naysilla-nadine' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://naysillanadine.github.io/nadwelifestyle/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Laucess', 'https://naysillanadine.github.io/laucess/', 'Web Kreatif', 'Karya website Laucess oleh Naysilla Nadine.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'naysilla-nadine' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://naysillanadine.github.io/laucess/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Nad Inverse', 'https://naysillanadine.github.io/nadinverse/#home', 'Web Kreatif', 'Karya website Nad Inverse oleh Naysilla Nadine.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'naysilla-nadine' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://naysillanadine.github.io/nadinverse/#home'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Princess Travel', 'https://naysillanadine.github.io/princesstravel/#paket', 'Travel', 'Karya website Princess Travel oleh Naysilla Nadine.', ARRAY['travel']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'naysilla-nadine' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://naysillanadine.github.io/princesstravel/#paket'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Putri Donita', 'putri-donita', a.id, '51-12', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Hey Nitara', 'https://heynitara.github.io/heynitara/', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'putri-donita' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://heynitara.github.io/heynitara/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid Al-Hanna', 'https://heynitara.github.io/masjidalhanna/', 'Display Masjid', 'Display masjid Al-Hanna.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'putri-donita' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://heynitara.github.io/masjidalhanna/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Hey Nitaly', 'https://heynitara.github.io/heynitaly/', 'E-Commerce', 'Toko kedua Donita - Hey Nitaly.', ARRAY['toko','fashion']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'putri-donita' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://heynitara.github.io/heynitaly/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Muslimah Study with Nita', 'https://heynitara.github.io/muslimahstudywithnita/', 'Edukasi', 'Game belajar muslimah.', ARRAY['belajar','muslimah','game']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'putri-donita' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://heynitara.github.io/muslimahstudywithnita/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Nita Murajaah', 'https://heynitara.github.io/nitamurajaah/', 'Edukasi', 'Karya website Nita Murajaah oleh Putri Donita.', ARRAY['murajaah','quran']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'putri-donita' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://heynitara.github.io/nitamurajaah/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Rezkya Putri Novianti', 'rezkya-putri-novianti', a.id, '51-13', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Kya Pages', 'https://kyaraezstudio.github.io/kyapages/', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'rezkya-putri-novianti' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://kyaraezstudio.github.io/kyapages/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Al Mujahidin Digital', 'https://kyaraezstudio.github.io/almujahidindigital/', 'Display Masjid', 'Display masjid Al Mujahidin Digital.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'rezkya-putri-novianti' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://kyaraezstudio.github.io/almujahidindigital/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Rezz Journal', 'https://kyaraezstudio.github.io/rezzjournal/', 'Web Kreatif', 'Journal digital Rezz.', ARRAY['journal','diary']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'rezkya-putri-novianti' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://kyaraezstudio.github.io/rezzjournal/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Our Jurnal', 'https://kyaraezstudio.github.io/OURJURNAL/', 'Web Kreatif', 'Karya website Our Jurnal oleh Rezkya Putri Novianti.', ARRAY['journal']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'rezkya-putri-novianti' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://kyaraezstudio.github.io/OURJURNAL/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Rily Avfianca', 'rily-avfianca', a.id, '51-14', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Rily Cake', 'https://rilyavfianca.github.io/rilycake/', 'Kuliner', 'Website kreasi bertema kuliner dengan fokus pada tampilan produk, informasi, dan pengalaman pengunjung.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'rily-avfianca' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://rilyavfianca.github.io/rilycake/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Salsabila Kirana', 'salsabila-kirana', a.id, '51-15', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Deretan Pustaka', 'https://salsasena.github.io/deretanpustaka/', 'Edukasi', 'Karya web bertema edukasi dan konten yang dirancang sebagai latihan desain serta penyajian informasi.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'salsabila-kirana' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://salsasena.github.io/deretanpustaka/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Matcha Cafe', 'https://salsasena.github.io/matchacafe/', 'Kuliner', 'Website Matcha Cafe.', ARRAY['cafe','matcha']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'salsabila-kirana' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://salsasena.github.io/matchacafe/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Display Masjid', 'https://salsasena.github.io/displaymasjid/', 'Display Masjid', 'Karya website Display Masjid oleh Salsabila Kirana.', ARRAY['masjid']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'salsabila-kirana' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://salsasena.github.io/displaymasjid/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'SK Entertainment', 'https://salsasena.github.io/SKentertaint/', 'Web Kreatif', 'Karya website SK Entertainment oleh Salsabila Kirana.', ARRAY['entertainment']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'salsabila-kirana' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://salsasena.github.io/SKentertaint/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Samsa Baina Sabiha', 'samsa-baina-sabiha', a.id, '51-16', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Samtudio Beats', 'https://samsabaina.github.io/samtudiobeats/', 'Musik', 'Eksplorasi website musik yang menonjolkan konten, identitas visual, dan pengalaman interaktif.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'samsa-baina-sabiha' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://samsabaina.github.io/samtudiobeats/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Shafiyyah Az-zahra', 'shafiyyah-az-zahra', a.id, '51-17', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Shafiyyah Cookie', 'https://shafiyyahaz.github.io/shafiyyahcookie/', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'shafiyyah-az-zahra' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://shafiyyahaz.github.io/shafiyyahcookie/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid Display', 'https://shafiyyahaz.github.io/masjiddisplay/', 'Display Masjid', 'Display masjid karya Shafiyyah.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'shafiyyah-az-zahra' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://shafiyyahaz.github.io/masjiddisplay/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Tania Amanda', 'tania-amanda', a.id, '51-18', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Manda Crafty', 'https://taniaamandacrafty.github.io/mandacrafty/', 'Craft', 'Website kreatif bertema kerajinan dan brand personal dengan eksplorasi visual.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'tania-amanda' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://taniaamandacrafty.github.io/mandacrafty/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Dei Coffee', 'https://taniaamandacrafty.github.io/deicoffe/', 'Kuliner', 'Karya website Dei Coffee oleh Tania Amanda.', ARRAY['coffee']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'tania-amanda' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://taniaamandacrafty.github.io/deicoffe/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Digital Time', 'https://taniaamandacrafty.github.io/digitaltime/', 'Produktivitas', 'Karya website Digital Time oleh Tania Amanda.', ARRAY['time']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'tania-amanda' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://taniaamandacrafty.github.io/digitaltime/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Widiya Sari', 'widiya-sari', a.id, '51-19', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Daily Journal', 'https://madebywidyya.github.io/daily-journal/', 'Edukasi', 'Karya web bertema edukasi dan konten yang dirancang sebagai latihan desain serta penyajian informasi.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'widiya-sari' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://madebywidyya.github.io/daily-journal/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Ziya Ulhaq', 'ziya-ulhaq', a.id, '51-20', '51', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-51-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Byzi Stumbler', 'https://ziyasing.github.io/byziStumbler/', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'ziya-ulhaq' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://ziyasing.github.io/byziStumbler/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Harbore', 'https://ziyasing.github.io/Harbore-/#clock', 'Web Kreatif', 'Karya website Harbore oleh Ziya Ulhaq.', ARRAY['clock']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'ziya-ulhaq' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://ziyasing.github.io/Harbore-/#clock'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Kalimba Dreams', 'https://ziyasing.github.io/kalimba.dreams/', 'Musik', 'Karya website Kalimba Dreams oleh Ziya Ulhaq.', ARRAY['kalimba','musik']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'ziya-ulhaq' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://ziyasing.github.io/kalimba.dreams/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Hani''s Birthday', 'https://ziyasing.github.io/hani-s-B-DAY/', 'Web Kreatif', 'Karya website Hani''s Birthday oleh Ziya Ulhaq.', ARRAY['birthday']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'ziya-ulhaq' and a.label_norm = 'kelas-51-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://ziyasing.github.io/hani-s-B-DAY/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Adinda Dwi Muliasari', 'adinda-dwi-muliasari', a.id, '52-21', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Dinda Restaurant', 'https://adindadwimulia.github.io/dindarestourant/', 'Travel', 'Eksplorasi website bertema perjalanan dengan fokus pada penyajian destinasi dan pengalaman pengguna.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'adinda-dwi-muliasari' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://adindadwimulia.github.io/dindarestourant/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Bakmi Mulia', 'https://adindadwimulia.github.io/bakmimulia/', 'Kuliner', 'Website kreasi bertema kuliner dengan fokus pada tampilan produk, informasi, dan pengalaman pengunjung.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'adinda-dwi-muliasari' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://adindadwimulia.github.io/bakmimulia/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Catur Jawa', 'https://adindadwimulia.github.io/caturjawa/', 'Game', 'Eksperimen web interaktif/game untuk melatih logika, antarmuka, dan pengalaman pengguna.', ARRAY['catur','game','interaktif']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'adinda-dwi-muliasari' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://adindadwimulia.github.io/caturjawa/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Mushola Al-Aziz', 'https://adindadwimulia.github.io/musholaalaziz-/', 'Display Masjid', 'Display mushola Al-Aziz dengan fitur jadwal sholat.', ARRAY['mushola','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'adinda-dwi-muliasari' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://adindadwimulia.github.io/musholaalaziz-/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Pink Puzzle', 'https://adindadwimulia.github.io/pinkpuzzle/', 'Game', 'Game puzzle pink.', ARRAY['puzzle','game']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'adinda-dwi-muliasari' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://adindadwimulia.github.io/pinkpuzzle/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Bakmi Mulia Jatiasih', 'https://adindadwimulia.github.io/bakmimuliajatiasih/', 'Kuliner', 'Karya website Bakmi Mulia Jatiasih oleh Adinda Dwi Muliasari.', ARRAY['bakmi']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'adinda-dwi-muliasari' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://adindadwimulia.github.io/bakmimuliajatiasih/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Happy Birthday Hani', 'https://adindadwimulia.github.io/happybirhtdayhaniii/', 'Web Kreatif', 'Karya website Happy Birthday Hani oleh Adinda Dwi Muliasari.', ARRAY['birthday']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'adinda-dwi-muliasari' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://adindadwimulia.github.io/happybirhtdayhaniii/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Mushola Al-Aziz', 'https://adindadwimulia.github.io/musholaalaziz/', 'Display Masjid', 'Karya website Mushola Al-Aziz oleh Adinda Dwi Muliasari.', ARRAY['mushola']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'adinda-dwi-muliasari' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://adindadwimulia.github.io/musholaalaziz/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Aneira Syiami Zulfa', 'aneira-syiami-zulfa', a.id, '52-22', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Nee Ane Syiami', 'https://aneirasyz03.github.io/neeanesyz/', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'aneira-syiami-zulfa' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://aneirasyz03.github.io/neeanesyz/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Carousel Neii', 'https://aneirasyz03.github.io/carouselneii/', 'Web Eksperimen AI', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', ARRAY['carousel','eksperimen','grok']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'aneira-syiami-zulfa' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://aneirasyz03.github.io/carouselneii/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Seoul Central Mosque', 'https://aneirasyz03.github.io/seoulcentralmosque/', 'Display Masjid', 'Display masjid Seoul Central dari Grok.', ARRAY['masjid','grok']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'aneira-syiami-zulfa' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://aneirasyz03.github.io/seoulcentralmosque/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Mosque Ver 2', 'https://aneirasyz03.github.io/mosquever2/', 'Display Masjid', 'Display masjid versi 2 dari ChatGPT.', ARRAY['masjid','chatgpt']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'aneira-syiami-zulfa' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://aneirasyz03.github.io/mosquever2/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Catur W0w0', 'https://aneirasyz03.github.io/caturw0w0/', 'Game', 'Game Catur Jawa versi Aneira.', ARRAY['catur','game']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'aneira-syiami-zulfa' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://aneirasyz03.github.io/caturw0w0/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Titip Dulu 00', 'https://aneirasyz03.github.io/titipdulu00/', 'Produktivitas', 'Website untuk membantu membuat dan mengelola list penjengukan.', ARRAY['penjengukan','list','organisasi']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'aneira-syiami-zulfa' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://aneirasyz03.github.io/titipdulu00/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Carissa Chikal Maghfirah', 'carissa-chikal-maghfirah', a.id, '52-23', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Carissa Parfume', 'https://carissachikal.github.io/carissaparfume/', 'Fashion & Beauty', 'Eksplorasi desain web bertema fashion, beauty, produk, atau brand dengan identitas visual buatan santriwati.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'carissa-chikal-maghfirah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://carissachikal.github.io/carissaparfume/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid Al-Hikmah', 'https://carissachikal.github.io/masjid-al-hikmah/', 'Display Masjid', 'Display masjid Al-Hikmah.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'carissa-chikal-maghfirah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://carissachikal.github.io/masjid-al-hikmah/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Escape Room', 'https://carissachikal.github.io/Escape-Room/', 'Game', 'Game Escape Room interaktif.', ARRAY['game','interaktif']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'carissa-chikal-maghfirah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://carissachikal.github.io/Escape-Room/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Fun Trip', 'https://carissachikal.github.io/FunTrip/', 'Travel', 'Website Fun Trip.', ARRAY['travel','fun']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'carissa-chikal-maghfirah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://carissachikal.github.io/FunTrip/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Moody', 'https://carissachikal.github.io/Moody/', 'Web Kreatif', 'Aplikasi Moody.', ARRAY['mood','kreatif']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'carissa-chikal-maghfirah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://carissachikal.github.io/Moody/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Chelsea Conera', 'chelsea-conera', a.id, '52-24', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'NR Music', 'https://chelseacoonera.github.io/NRMUSIC/', 'Musik', 'Eksplorasi website musik yang menonjolkan konten, identitas visual, dan pengalaman interaktif.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'chelsea-conera' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://chelseacoonera.github.io/NRMUSIC/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid Al-Iman', 'https://chelseacoonera.github.io/Al-Iman-/', 'Display Masjid', 'Display masjid Al-Iman.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'chelsea-conera' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://chelseacoonera.github.io/Al-Iman-/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Dina Aulia Khairunisa', 'dina-aulia-khairunisa', a.id, '52-25', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Dina Sunday', 'https://dinahanoom.github.io/dina-sunday/', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'dina-aulia-khairunisa' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://dinahanoom.github.io/dina-sunday/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Catur Dina', 'https://dinahanoom.github.io/catur-dina/', 'Game', 'Eksperimen web interaktif/game untuk melatih logika, antarmuka, dan pengalaman pengguna.', ARRAY['catur','game','interaktif']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'dina-aulia-khairunisa' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://dinahanoom.github.io/catur-dina/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid Baiturrahman', 'https://dinahanoom.github.io/masjidbaiturrahman/', 'Display Masjid', 'Aplikasi display jadwal sholat & informasi masjid.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'dina-aulia-khairunisa' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://dinahanoom.github.io/masjidbaiturrahman/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Dina Tajweed', 'https://dinahanoom.github.io/dinatajweed/', 'Edukasi', 'Aplikasi belajar tajweed.', ARRAY['tajweed','belajar','quran']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'dina-aulia-khairunisa' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://dinahanoom.github.io/dinatajweed/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Catur Jawa', 'https://dinahanoom.github.io/caturjawa/', 'Game', 'Karya website Catur Jawa oleh Dina Aulia Khairunisa.', ARRAY['catur']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'dina-aulia-khairunisa' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://dinahanoom.github.io/caturjawa/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Firzaa Halwa Izzatii', 'firzaa-halwa-izzatii', a.id, '52-26', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Zaae Store', 'https://firzhalwaa.github.io/zaaeestore/#home', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'firzaa-halwa-izzatii' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://firzhalwaa.github.io/zaaeestore/#home'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid Baitul Jannah', 'https://firzhalwaa.github.io/mosquebaituljannah/', 'Display Masjid', 'Display masjid Baitul Jannah.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'firzaa-halwa-izzatii' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://firzhalwaa.github.io/mosquebaituljannah/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Fitriani Ramadhani', 'fitriani-ramadhani', a.id, '52-27', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Boutique Ni', 'https://hanidhanif.github.io/boutiqueni/', 'Fashion & Beauty', 'Eksplorasi desain web bertema fashion, beauty, produk, atau brand dengan identitas visual buatan santriwati.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'fitriani-ramadhani' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hanidhanif.github.io/boutiqueni/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Catur Jawa', 'https://hanidhanif.github.io/caturjawa/', 'Game', 'Eksperimen web interaktif/game untuk melatih logika, antarmuka, dan pengalaman pengguna.', ARRAY['catur','game','interaktif']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'fitriani-ramadhani' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hanidhanif.github.io/caturjawa/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'HA Studio K', 'https://hanidhanif.github.io/hastudiok/', 'Web Eksperimen AI', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', ARRAY['studio','eksperimen','qwen']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'fitriani-ramadhani' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hanidhanif.github.io/hastudiok/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid Al-Fitr', 'https://hanidhanif.github.io/masjidalfitr/', 'Display Masjid', 'Display masjid Al-Fitr dari GPT.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'fitriani-ramadhani' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hanidhanif.github.io/masjidalfitr/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Garden Up F', 'https://hanidhanif.github.io/gardenupf/', 'Web Kreatif', 'Website kreasi bertema garden dengan eksplorasi tampilan visual dan pengalaman pengguna.', ARRAY['garden','kreatif']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'fitriani-ramadhani' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hanidhanif.github.io/gardenupf/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Hi Club Swim', 'https://hanidhanif.github.io/hiclubswim/', 'Lifestyle', 'Karya website Hi Club Swim oleh Fitriani Ramadhani.', ARRAY['swim','club']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'fitriani-ramadhani' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hanidhanif.github.io/hiclubswim/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Hafinzah Islami Madinah', 'hafinzah-islami-madinah', a.id, '52-28', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Hafinzah', 'https://hafinzahislamimadinah.github.io/hafinzah/', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'hafinzah-islami-madinah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hafinzahislamimadinah.github.io/hafinzah/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Catur Jawa', 'https://hafinzahislamimadinah.github.io/catur-jawa/', 'Game', 'Eksperimen web interaktif/game untuk melatih logika, antarmuka, dan pengalaman pengguna.', ARRAY['catur','game','interaktif']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'hafinzah-islami-madinah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hafinzahislamimadinah.github.io/catur-jawa/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid An-Nur', 'https://hafinzahislamimadinah.github.io/masjid-annur/', 'Display Masjid', 'Display masjid An-Nur.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'hafinzah-islami-madinah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hafinzahislamimadinah.github.io/masjid-annur/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Fotocopy 2', 'https://hafinzahislamimadinah.github.io/fotocopy2/', 'Web Kreatif', 'Website layanan fotocopy.', ARRAY['usaha','layanan']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'hafinzah-islami-madinah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hafinzahislamimadinah.github.io/fotocopy2/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Hafinzah Fotocopy', 'https://hafinzahislamimadinah.github.io/hafinzahfotocopyy/', 'Web Kreatif', 'Karya website Hafinzah Fotocopy oleh Hafinzah Islami Madinah.', ARRAY['fotocopy']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'hafinzah-islami-madinah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hafinzahislamimadinah.github.io/hafinzahfotocopyy/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid An-Nur Shobar Rahman', 'https://hafinzahislamimadinah.github.io/masjid-annur-shobar-rahman/', 'Display Masjid', 'Karya website Masjid An-Nur Shobar Rahman oleh Hafinzah Islami Madinah.', ARRAY['masjid']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'hafinzah-islami-madinah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hafinzahislamimadinah.github.io/masjid-annur-shobar-rahman/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Fotocopy', 'https://hafinzahislamimadinah.github.io/fotocopy/', 'Web Kreatif', 'Karya website Fotocopy oleh Hafinzah Islami Madinah.', ARRAY['fotocopy']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'hafinzah-islami-madinah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hafinzahislamimadinah.github.io/fotocopy/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Game Shafhaf', 'https://hafinzahislamimadinah.github.io/gameshafhaf/', 'Game', 'Karya website Game Shafhaf oleh Hafinzah Islami Madinah.', ARRAY['game']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'hafinzah-islami-madinah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://hafinzahislamimadinah.github.io/gameshafhaf/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Khansa Nida Nafisah', 'khansa-nida-nafisah', a.id, '52-29', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'K Studio', 'https://khansanidapma.github.io/kstudio/', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'khansa-nida-nafisah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://khansanidapma.github.io/kstudio/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'KH''S Studios', 'https://khansanidapma.github.io/kh-s-studios/', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'khansa-nida-nafisah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://khansanidapma.github.io/kh-s-studios/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid At-Taqwa', 'https://khansanidapma.github.io/attaqwa/', 'Display Masjid', 'Display masjid At-Taqwa.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'khansa-nida-nafisah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://khansanidapma.github.io/attaqwa/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Apa Aja Lah', 'https://khansanidapma.github.io/apaajalah/', 'Web Kreatif', 'Website kreatif Apa Aja Lah.', ARRAY['kreatif']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'khansa-nida-nafisah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://khansanidapma.github.io/apaajalah/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Cookiees', 'https://khansanidapma.github.io/cookiees/', 'Kuliner', 'Karya website Cookiees oleh Khansa Nida Nafisah.', ARRAY['cookie']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'khansa-nida-nafisah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://khansanidapma.github.io/cookiees/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Catur Jawa', 'https://khansanidapma.github.io/caturjawa/', 'Game', 'Karya website Catur Jawa oleh Khansa Nida Nafisah.', ARRAY['catur']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'khansa-nida-nafisah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://khansanidapma.github.io/caturjawa/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Khanza Hazirah', 'khanza-hazirah', a.id, '52-30', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'NJA Creatives', 'https://kanja41-a11y.github.io/njacreatives/', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'khanza-hazirah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://kanja41-a11y.github.io/njacreatives/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Catur Jawa', 'https://KANja41-a11y.github.io/caturjw/', 'Game', 'Eksperimen web interaktif/game untuk melatih logika, antarmuka, dan pengalaman pengguna.', ARRAY['catur','game','interaktif']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'khanza-hazirah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://KANja41-a11y.github.io/caturjw/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid An-Nur', 'https://kanja41-a11y.github.io/masjid-an-nur/', 'Display Masjid', 'Display masjid An-Nur karya Khanza.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'khanza-hazirah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://kanja41-a11y.github.io/masjid-an-nur/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Creative NJA', 'https://kanja41-a11y.github.io/creativenja/', 'Web Kreatif', 'Website kreatif NJA.', ARRAY['kreatif','studio']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'khanza-hazirah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://kanja41-a11y.github.io/creativenja/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Dream NJA', 'https://kanja41-a11y.github.io/dreamnja/', 'Web Kreatif', 'Karya website Dream NJA oleh Khanza Hazirah.', ARRAY['dream']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'khanza-hazirah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://kanja41-a11y.github.io/dreamnja/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Anim CHR', 'https://kanja41-a11y.github.io/AnimCHR/', 'Web Kreatif', 'Karya website Anim CHR oleh Khanza Hazirah.', ARRAY['animasi']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'khanza-hazirah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://kanja41-a11y.github.io/AnimCHR/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Najla Sa''adah', 'najla-sa-adah', a.id, '52-31', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Najla Sa''adah', 'https://najlasdhh.github.io/Najla-Sa-adah/', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'najla-sa-adah' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://najlasdhh.github.io/Najla-Sa-adah/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Nazwa Febrian Maulida', 'nazwa-febrian-maulida', a.id, '52-32', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Nzzwa Cake', 'https://nazwafebrianm.github.io/nzzwacake/', 'Kuliner', 'Website kreasi bertema kuliner dengan fokus pada tampilan produk, informasi, dan pengalaman pengunjung.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'nazwa-febrian-maulida' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nazwafebrianm.github.io/nzzwacake/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Nazwa Catur', 'https://nazwafebrianm.github.io/nazwacaturr/', 'Game', 'Eksperimen web interaktif/game untuk melatih logika, antarmuka, dan pengalaman pengguna.', ARRAY['catur','game','interaktif']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'nazwa-febrian-maulida' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nazwafebrianm.github.io/nazwacaturr/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid Al-Fatih', 'https://nazwafebrianm.github.io/masjid-al-fatih/', 'Display Masjid', 'Display masjid Al-Fatih.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'nazwa-febrian-maulida' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nazwafebrianm.github.io/masjid-al-fatih/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Simulasi SNBT', 'https://nazwafebrianm.github.io/simulasi-SNBT/', 'Edukasi', 'Simulasi SNBT.', ARRAY['snbt','simulasi','ujian']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'nazwa-febrian-maulida' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nazwafebrianm.github.io/simulasi-SNBT/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid Al-Faruq', 'https://nazwafebrianm.github.io/masjid-al-faruq/', 'Display Masjid', 'Karya website Masjid Al-Faruq oleh Nazwa Febrian Maulida.', ARRAY['masjid']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'nazwa-febrian-maulida' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nazwafebrianm.github.io/masjid-al-faruq/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Rezkya Ananda Putri', 'rezkya-ananda-putri', a.id, '52-33', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Kyaaelle Maison', 'https://rezkyanandaa.github.io/kyaaelle.maison/#new', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'rezkya-ananda-putri' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://rezkyanandaa.github.io/kyaaelle.maison/#new'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Catur Jawa', 'https://rezkyanandaa.github.io/catur-jawa/', 'Game', 'Eksperimen web interaktif/game untuk melatih logika, antarmuka, dan pengalaman pengguna.', ARRAY['catur','game','interaktif']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'rezkya-ananda-putri' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://rezkyanandaa.github.io/catur-jawa/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid Maulana Al-Madinah', 'https://rezkyanandaa.github.io/Masjid-Maulana-Al-Madinah/', 'Display Masjid', 'Display masjid Maulana Al-Madinah.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'rezkya-ananda-putri' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://rezkyanandaa.github.io/Masjid-Maulana-Al-Madinah/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Kyaa Travel', 'https://rezkyanandaa.github.io/kyaatravel/', 'Travel', 'Website travel Kyaa.', ARRAY['travel','wisata']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'rezkya-ananda-putri' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://rezkyanandaa.github.io/kyaatravel/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Little Mall', 'https://rezkyanandaa.github.io/little.mall/', 'E-Commerce', 'Website Little Mall.', ARRAY['mall','toko']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'rezkya-ananda-putri' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://rezkyanandaa.github.io/little.mall/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Rindu Putri Yasmin', 'rindu-putri-yasmin', a.id, '52-34', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Nuv Ice Cream', 'https://rinduputr.github.io/Nuv-IceCream/', 'Kuliner', 'Website kreasi bertema kuliner dengan fokus pada tampilan produk, informasi, dan pengalaman pengunjung.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'rindu-putri-yasmin' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://rinduputr.github.io/Nuv-IceCream/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Catur Jawa', 'https://rinduputr.github.io/Catur-Jawa/', 'Game', 'Eksperimen web interaktif/game untuk melatih logika, antarmuka, dan pengalaman pengguna.', ARRAY['catur','game','interaktif']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'rindu-putri-yasmin' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://rinduputr.github.io/Catur-Jawa/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid Baitus Salam', 'https://rinduputr.github.io/Masjid-Baitus-Salam/', 'Display Masjid', 'Display masjid karya Rindu.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'rindu-putri-yasmin' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://rinduputr.github.io/Masjid-Baitus-Salam/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Creamy Cafe', 'https://rinduputr.github.io/Creamy-Caf-/', 'Kuliner', 'Website Creamy Cafe.', ARRAY['cafe','kuliner']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'rindu-putri-yasmin' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://rinduputr.github.io/Creamy-Caf-/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Nuv Cafe', 'https://rinduputr.github.io/Nuv-Caf-/', 'Kuliner', 'Website Nuv Cafe.', ARRAY['cafe']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'rindu-putri-yasmin' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://rinduputr.github.io/Nuv-Caf-/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Risma Jian Humaira', 'risma-jian-humaira', a.id, '52-35', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'MaiMORA Dress', 'https://rismajian.github.io/MaiMORA.DRESS/', 'Fashion & Beauty', 'Eksplorasi desain web bertema fashion, beauty, produk, atau brand dengan identitas visual buatan santriwati.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'risma-jian-humaira' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://rismajian.github.io/MaiMORA.DRESS/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'SOS Jaww', 'https://rismajian.github.io/sosjaww/', 'Web Eksperimen', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', ARRAY['eksperimen']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'risma-jian-humaira' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://rismajian.github.io/sosjaww/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Catur Jawww', 'https://rismajian.github.io/caturjawww/', 'Game', 'Eksperimen web interaktif/game untuk melatih logika, antarmuka, dan pengalaman pengguna.', ARRAY['catur','game','interaktif']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'risma-jian-humaira' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://rismajian.github.io/caturjawww/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Mosque Al-Mujib (Claude)', 'https://rismajian.github.io/mosque-al-mujib_by-MaiMORA_02/', 'Display Masjid', 'Display masjid Al-Mujib versi Claude.', ARRAY['masjid','claude']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'risma-jian-humaira' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://rismajian.github.io/mosque-al-mujib_by-MaiMORA_02/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Mosque Al-Mujib (ChatGPT)', 'https://rismajian.github.io/mosque-al-mujib_by-MaiMORA/', 'Display Masjid', 'Display masjid Al-Mujib versi ChatGPT.', ARRAY['masjid','chatgpt']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'risma-jian-humaira' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://rismajian.github.io/mosque-al-mujib_by-MaiMORA/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'STUDYGAME MaiMora', 'https://rismajian.github.io/STUDYGAME_MaiMora/', 'Game Edukasi', 'Game edukasi interaktif karya Risma Jian Humaira untuk belajar sambil bermain.', ARRAY['game','edukasi','study']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'risma-jian-humaira' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://rismajian.github.io/STUDYGAME_MaiMora/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Syifa Azka', 'syifa-azka', a.id, '52-36', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Hijabsy', 'https://syifaazkasyrfh.github.io/hijabsy', 'Fashion & Beauty', 'Eksplorasi desain web bertema fashion, beauty, produk, atau brand dengan identitas visual buatan santriwati.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'syifa-azka' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://syifaazkasyrfh.github.io/hijabsy'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Catur Jawa', 'https://syifaazkasyrfh.github.io/caturjawak/', 'Game', 'Eksperimen web interaktif/game untuk melatih logika, antarmuka, dan pengalaman pengguna.', ARRAY['catur','game','interaktif']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'syifa-azka' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://syifaazkasyrfh.github.io/caturjawak/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Musholla Khairunnisa', 'https://syifaazkasyrfh.github.io/Musholla--khairunnisa-/', 'Display Masjid', 'Display mushola Khairunnisa.', ARRAY['mushola','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'syifa-azka' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://syifaazkasyrfh.github.io/Musholla--khairunnisa-/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Game Travel', 'https://syifaazkasyrfh.github.io/game-travel-/', 'Game', 'Game travel interaktif.', ARRAY['game','travel']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'syifa-azka' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://syifaazkasyrfh.github.io/game-travel-/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Thania Aulia Salsabila', 'thania-aulia-salsabila', a.id, '52-37', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Niae Drinks', 'https://thaniaaulia.github.io/niaedrinks/', 'Kuliner', 'Website kreasi bertema kuliner dengan fokus pada tampilan produk, informasi, dan pengalaman pengunjung.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'thania-aulia-salsabila' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://thaniaaulia.github.io/niaedrinks/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Catur Games', 'https://thaniaaulia.github.io/caturgames/', 'Game', 'Eksperimen web interaktif/game untuk melatih logika, antarmuka, dan pengalaman pengguna.', ARRAY['catur','game','interaktif']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'thania-aulia-salsabila' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://thaniaaulia.github.io/caturgames/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'YowDrink', 'https://thaniaaulia.github.io/yowdrink/#testimoni', 'Web Eksperimen AI', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', ARRAY['minuman','eksperimen','claude']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'thania-aulia-salsabila' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://thaniaaulia.github.io/yowdrink/#testimoni'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'El Madina Mosque', 'https://thaniaaulia.github.io/elmadinamosque/', 'Display Masjid', 'Aplikasi display masjid modern.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'thania-aulia-salsabila' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://thaniaaulia.github.io/elmadinamosque/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Ramen Yow', 'https://thaniaaulia.github.io/ramenyow/', 'Kuliner', 'Website ramen.', ARRAY['ramen','kuliner']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'thania-aulia-salsabila' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://thaniaaulia.github.io/ramenyow/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Our Games Puzzle', 'https://thaniaaulia.github.io/ourgamespuzzle/', 'Game', 'Karya website Our Games Puzzle oleh Thania Aulia Salsabila.', ARRAY['puzzle']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'thania-aulia-salsabila' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://thaniaaulia.github.io/ourgamespuzzle/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Viorine Allinesia', 'viorine-allinesia', a.id, '52-38', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Rin Bakery', 'https://viorinealinesia.github.io/rinbakeryy/', 'Kuliner', 'Website kreasi bertema kuliner dengan fokus pada tampilan produk, informasi, dan pengalaman pengunjung.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'viorine-allinesia' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://viorinealinesia.github.io/rinbakeryy/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'ALNS Cosmetic', 'https://viorinealinesia.github.io/alnscosmetic/', 'Fashion & Beauty', 'Eksplorasi desain web bertema fashion, beauty, produk, atau brand dengan identitas visual buatan santriwati.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'viorine-allinesia' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://viorinealinesia.github.io/alnscosmetic/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Ar-Rahman Digital', 'https://viorinealinesia.github.io/ar-rahmanndigitall/', 'Display Masjid', 'Display masjid Ar-Rahman digital.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'viorine-allinesia' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://viorinealinesia.github.io/ar-rahmanndigitall/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Rin''s Spa and Salon', 'https://viorinealinesia.github.io/rin-s-spa-and-salon/', 'Beauty', 'Website spa & salon.', ARRAY['spa','salon','beauty']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'viorine-allinesia' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://viorinealinesia.github.io/rin-s-spa-and-salon/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Wifa Jelita Putri', 'wifa-jelita-putri', a.id, '52-39', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Wi Musical', 'https://wifajelita.github.io/wimusical/', 'Musik', 'Eksplorasi website musik yang menonjolkan konten, identitas visual, dan pengalaman interaktif.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'wifa-jelita-putri' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://wifajelita.github.io/wimusical/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'My Musical Explore', 'https://wifajelita.github.io/MymusicalExplore/', 'Web Eksperimen AI', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', ARRAY['musik','eksperimen','claude']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'wifa-jelita-putri' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://wifajelita.github.io/MymusicalExplore/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid Agung Raudhatul Dunya', 'https://wifajelita.github.io/Masjidagungraudhatuldunya/', 'Display Masjid', 'Display masjid karya Wifa.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'wifa-jelita-putri' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://wifajelita.github.io/Masjidagungraudhatuldunya/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Twilight Journal', 'https://wifajelita.github.io/TwilightJournal/', 'Web Kreatif', 'Journal digital Twilight.', ARRAY['journal','diary']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'wifa-jelita-putri' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://wifajelita.github.io/TwilightJournal/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Bartender Simulation', 'https://wifajelita.github.io/BartenderSimulation/', 'Game', 'Karya website Bartender Simulation oleh Wifa Jelita Putri.', ARRAY['bartender','simulasi']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'wifa-jelita-putri' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://wifajelita.github.io/BartenderSimulation/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Yasmin Indira Dewi', 'yasmin-indira-dewi', a.id, '52-40', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'My Nju', 'https://yasminindira.github.io/mynju/', 'Web Kreatif', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', '{}'::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'yasmin-indira-dewi' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://yasminindira.github.io/mynju/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Catur Jawa', 'https://yasminindira.github.io/caturjawa/', 'Game', 'Eksperimen web interaktif/game untuk melatih logika, antarmuka, dan pengalaman pengguna.', ARRAY['catur','game','interaktif']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'yasmin-indira-dewi' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://yasminindira.github.io/caturjawa/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Hororin', 'https://yasminindira.github.io/hororin/', 'Web Eksperimen AI', 'Karya website siswa sebagai bagian dari latihan Web Design dan pengembangan kreativitas digital.', ARRAY['eksperimen','grok']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'yasmin-indira-dewi' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://yasminindira.github.io/hororin/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid Al-Jabar (ChatGPT)', 'https://yasminindira.github.io/masjidaljabar/', 'Display Masjid', 'Display masjid Al-Jabar versi ChatGPT.', ARRAY['masjid','chatgpt']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'yasmin-indira-dewi' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://yasminindira.github.io/masjidaljabar/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid Al-Jabar (Claude)', 'https://yasminindira.github.io/masjidaljabar3/', 'Display Masjid', 'Display masjid Al-Jabar versi Claude.', ARRAY['masjid','claude']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'yasmin-indira-dewi' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://yasminindira.github.io/masjidaljabar3/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Sistem Tubuh', 'https://yasminindira.github.io/sistemtubuh/', 'Edukasi', 'Website sistem tubuh manusia.', ARRAY['biologi','tubuh','edukasi']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'yasmin-indira-dewi' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://yasminindira.github.io/sistemtubuh/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Humann', 'https://yasminindira.github.io/humann/', 'Web Kreatif', 'Karya website Humann oleh Yasmin Indira Dewi.', ARRAY['human']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'yasmin-indira-dewi' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://yasminindira.github.io/humann/'))
  );


insert into gallery_alumni(name, name_norm, angkatan_id, legacy_id, class_code, school, role)
select 'Nikeisha Belva Azzahra', 'nikeisha-belva-azzahra', a.id, '52-41', '52', 'SMA PMA', 'Santriwati'
from gallery_angkatan a where a.label_norm = 'kelas-52-2025'
on conflict (name_norm, angkatan_id) do update set legacy_id = excluded.legacy_id, class_code = excluded.class_code;


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Masjid Azzahra', 'https://nikeishabelva.github.io/masjidazzahra/', 'Display Masjid', 'Display masjid karya Belva.', ARRAY['masjid','display']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'nikeisha-belva-azzahra' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nikeishabelva.github.io/masjidazzahra/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Barbies School', 'https://nikeishabelva.github.io/barbiesschool/', 'Edukasi', 'Aplikasi sekolah Barbie.', ARRAY['sekolah','game']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'nikeisha-belva-azzahra' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nikeishabelva.github.io/barbiesschool/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Belva Bakes', 'https://nikeishabelva.github.io/belva-bakes-/', 'Kuliner', 'Karya website Belva Bakes oleh Nikeisha Belva Azzahra.', ARRAY['toko','roti','bakery']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'nikeisha-belva-azzahra' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nikeishabelva.github.io/belva-bakes-/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Barbie Nails', 'https://nikeishabelva.github.io/barbienails/', 'Beauty', 'Karya website Barbie Nails oleh Nikeisha Belva Azzahra.', ARRAY['nail','art']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'nikeisha-belva-azzahra' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nikeishabelva.github.io/barbienails/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Squishyyy', 'https://nikeishabelva.github.io/squishyyy/', 'E-Commerce', 'Karya website Squishyyy oleh Nikeisha Belva Azzahra.', ARRAY['squishy','toko']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'nikeisha-belva-azzahra' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nikeishabelva.github.io/squishyyy/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Tumbly', 'https://nikeishabelva.github.io/tumbly/', 'E-Commerce', 'Karya website Tumbly oleh Nikeisha Belva Azzahra.', ARRAY['tumbler','toko']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'nikeisha-belva-azzahra' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nikeishabelva.github.io/tumbly/'))
  );


insert into gallery_websites(alumni_id, title, url, category, description, tags)
select al.id, 'Bloomie', 'https://nikeishabelva.github.io/bloomie/', 'E-Commerce', 'Toko bunga digital Bloomie karya Nikeisha.', ARRAY['bunga','toko','flower']::text[]
from gallery_alumni al
join gallery_angkatan a on a.id = al.angkatan_id
where al.name_norm = 'nikeisha-belva-azzahra' and a.label_norm = 'kelas-52-2025'
  and not exists (
    select 1 from gallery_websites w2
    where lower(trim(trailing '/' from w2.url)) = lower(trim(trailing '/' from 'https://nikeishabelva.github.io/bloomie/'))
  );
