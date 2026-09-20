-- Profil Google user + admin tambahan + hak akses

create table if not exists gallery_profiles (
  id uuid primary key, -- auth.users.id
  email text not null unique,
  display_name text default '',
  avatar_url text default '',
  linked_student_name text default '',
  linked_angkatan_year int,
  linked_class_code text default '',
  is_admin boolean default false,
  permissions jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table gallery_profiles enable row level security;
drop policy if exists gp_all on gallery_profiles;
create policy gp_all on gallery_profiles for all using (true) with check (true);

-- Tandai chat dari user login (tidak dihapus setelah 7 hari)
alter table gallery_chat add column if not exists user_id uuid;
alter table gallery_chat add column if not exists is_registered boolean default false;

-- Hapus pesan anonim lebih dari 7 hari (jalankan manual / cron opsional)
-- delete from gallery_chat
-- where coalesce(is_registered,false) = false
--   and created_at < now() - interval '7 days';
