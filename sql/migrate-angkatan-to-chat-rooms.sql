-- =============================================================================
-- Migrasi: salin ruang "Angkatan" (sumber dropdown chat) → gallery_chat_rooms
-- Sumber frontend dropdown:
--   1) Hardcoded: "Lintas angkatan (global)"  → TIDAK ada di DB (bukan baris)
--   2) Tabel gallery_angkatan                 → ini yang dimigrasikan
--   3) Tabel gallery_chat_rooms               → ruang custom admin
--
-- Jalankan di Supabase → SQL Editor (sekali saja; aman diulang).
-- =============================================================================

-- Pastikan tabel + kolom inti ada
create table if not exists public.gallery_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  access_password text default null,
  allowed_angkatan_ids uuid[] default '{}',
  allowed_class_codes text[] default '{}',
  allowed_students jsonb default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  created_by text default ''
);

alter table public.gallery_chat_rooms
  add column if not exists allowed_students jsonb default '[]'::jsonb;
alter table public.gallery_chat_rooms
  add column if not exists allowed_angkatan_ids uuid[] default '{}';
alter table public.gallery_chat_rooms
  add column if not exists allowed_class_codes text[] default '{}';

-- Opsional: tautkan ke angkatan asal (tidak wajib untuk app)
alter table public.gallery_chat_rooms
  add column if not exists source_angkatan_id uuid null;

-- Index bantu cegah duplikat migrasi per angkatan
create unique index if not exists gallery_chat_rooms_source_angkatan_uidx
  on public.gallery_chat_rooms (source_angkatan_id)
  where source_angkatan_id is not null;

-- Salin setiap angkatan menjadi 1 ruang chat (jika belum pernah dimigrasikan)
insert into public.gallery_chat_rooms (
  name,
  description,
  access_password,
  allowed_angkatan_ids,
  allowed_class_codes,
  allowed_students,
  is_active,
  sort_order,
  created_by,
  source_angkatan_id
)
select
  coalesce(nullif(trim(a.label), ''), nullif(trim(a.label_norm), ''), 'Angkatan') as name,
  'Ruang dari angkatan (migrasi otomatis). Pesan lama tetap di filter angkatan_id; ruang ini untuk kelola di admin.' as description,
  null as access_password,
  array[a.id]::uuid[] as allowed_angkatan_ids,
  '{}'::text[] as allowed_class_codes,
  '[]'::jsonb as allowed_students,
  true as is_active,
  10 as sort_order,
  'migrate-angkatan' as created_by,
  a.id as source_angkatan_id
from public.gallery_angkatan a
where a.id is not null
  and not exists (
    select 1
    from public.gallery_chat_rooms r
    where r.source_angkatan_id = a.id
  )
  -- hindari dobel nama identik yang sudah dibuat manual tanpa source_angkatan_id
  and not exists (
    select 1
    from public.gallery_chat_rooms r2
    where lower(trim(r2.name)) = lower(trim(coalesce(nullif(trim(a.label), ''), nullif(trim(a.label_norm), ''), 'Angkatan')))
      and r2.source_angkatan_id is null
  );

-- Hasil migrasi (cek)
select
  id,
  name,
  source_angkatan_id,
  is_active,
  created_at,
  created_by
from public.gallery_chat_rooms
order by created_at nulls last, name;

notify pgrst, 'reload schema';
