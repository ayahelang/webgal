create table if not exists gallery_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  body_html text not null default '',
  -- audience: public | logged_in | students
  audience text not null default 'public',
  -- target student names when audience=students (json array of {year,class,name})
  target_students jsonb default '[]'::jsonb,
  -- where: home | user_panel | both (for public/logged_in)
  show_on text not null default 'home',
  -- schedule
  starts_at timestamptz default now(),
  ends_at timestamptz,
  duration_days int,
  duration_hours int,
  times_per_day int default 1,
  schedule_hours int[] default '{}', -- e.g. {8,12,18} jam lokal
  splash_seconds int default 15,
  active boolean default true,
  created_by text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists gallery_ann_active_idx on gallery_announcements (active, starts_at, ends_at);

alter table gallery_announcements enable row level security;

drop policy if exists "ann read" on gallery_announcements;
create policy "ann read" on gallery_announcements for select using (true);

drop policy if exists "ann write auth" on gallery_announcements;
create policy "ann write auth" on gallery_announcements for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
