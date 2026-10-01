-- Alias nama + hasil AI skills map + snapshot
create table if not exists gallery_student_aliases (
  id uuid primary key default gen_random_uuid(),
  official_name text not null,
  nickname text default '',
  angkatan_year int not null default 2025,
  class_code text not null default '51',
  email text default '',
  intro_video_url text default '',
  github_pages text default '',
  updated_at timestamptz default now(),
  unique (angkatan_year, class_code, official_name)
);
create index if not exists gallery_aliases_nick_idx on gallery_student_aliases (lower(nickname));
create index if not exists gallery_aliases_name_idx on gallery_student_aliases (lower(official_name));

create table if not exists gallery_ai_skills (
  id text primary key default 'main',
  summary text default '',
  domains jsonb default '[]'::jsonb,
  per_student jsonb default '[]'::jsonb,
  raw_model text default '',
  source_docs jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists gallery_content_snapshots (
  id text primary key,
  source_url text,
  raw_text text,
  parsed jsonb,
  updated_at timestamptz default now()
);

create table if not exists gallery_refleksi (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  body text default '',
  source text default 'google_docs',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists gallery_skills_meta (
  id text primary key default 'main',
  docs_url text,
  sync_notes jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table gallery_student_aliases enable row level security;
alter table gallery_ai_skills enable row level security;
alter table gallery_content_snapshots enable row level security;
alter table gallery_refleksi enable row level security;
alter table gallery_skills_meta enable row level security;

drop policy if exists "aliases read" on gallery_student_aliases;
create policy "aliases read" on gallery_student_aliases for select using (true);
drop policy if exists "aliases write auth" on gallery_student_aliases;
create policy "aliases write auth" on gallery_student_aliases for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "ai skills read" on gallery_ai_skills;
create policy "ai skills read" on gallery_ai_skills for select using (true);
drop policy if exists "ai skills write auth" on gallery_ai_skills;
create policy "ai skills write auth" on gallery_ai_skills for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "snapshots write auth" on gallery_content_snapshots;
create policy "snapshots write auth" on gallery_content_snapshots for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "snapshots read auth" on gallery_content_snapshots;
create policy "snapshots read auth" on gallery_content_snapshots for select using (auth.role() = 'authenticated');

drop policy if exists "refleksi read" on gallery_refleksi;
create policy "refleksi read" on gallery_refleksi for select using (true);
drop policy if exists "refleksi write auth" on gallery_refleksi;
create policy "refleksi write auth" on gallery_refleksi for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "skills meta read" on gallery_skills_meta;
create policy "skills meta read" on gallery_skills_meta for select using (true);
drop policy if exists "skills meta write auth" on gallery_skills_meta;
create policy "skills meta write auth" on gallery_skills_meta for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
