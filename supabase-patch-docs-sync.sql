-- Konten Skills / Nilai Proses dari Google Docs (non-destructive merge)
create table if not exists gallery_refleksi (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  body text default '',
  source text default 'google_docs',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists gallery_refleksi_name_idx on gallery_refleksi (student_name);

create table if not exists gallery_skills_meta (
  id text primary key default 'main',
  docs_url text,
  sync_notes jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists gallery_content_snapshots (
  id text primary key,
  source_url text,
  raw_text text,
  parsed jsonb,
  updated_at timestamptz default now()
);

alter table gallery_refleksi enable row level security;
alter table gallery_skills_meta enable row level security;
alter table gallery_content_snapshots enable row level security;

-- baca publik
drop policy if exists "refleksi read" on gallery_refleksi;
create policy "refleksi read" on gallery_refleksi for select using (true);
drop policy if exists "skills meta read" on gallery_skills_meta;
create policy "skills meta read" on gallery_skills_meta for select using (true);

-- tulis: authenticated (admin dicek di app; perketat di production dengan email claim bila perlu)
drop policy if exists "refleksi write auth" on gallery_refleksi;
create policy "refleksi write auth" on gallery_refleksi for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "skills meta write auth" on gallery_skills_meta;
create policy "skills meta write auth" on gallery_skills_meta for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "snapshots write auth" on gallery_content_snapshots;
create policy "snapshots write auth" on gallery_content_snapshots for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "snapshots read auth" on gallery_content_snapshots;
create policy "snapshots read auth" on gallery_content_snapshots for select using (auth.role() = 'authenticated');
