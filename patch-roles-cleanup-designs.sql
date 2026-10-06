
-- Role & cleanup & graphic design gallery
alter table gallery_profiles
  add column if not exists role text default ''; -- '' | student | teacher
alter table gallery_profiles
  add column if not exists approved_at timestamptz;
alter table gallery_profiles
  add column if not exists approved_by uuid;

-- ownership on attendance sessions
alter table gallery_attendance_sessions
  add column if not exists owner_id uuid;
alter table gallery_attendance_sessions
  add column if not exists shared_with_user_ids uuid[] default '{}';

-- ownership on announcements  
alter table gallery_announcements
  add column if not exists owner_id uuid;

-- Graphic design works (hotlink only)
create table if not exists gallery_designs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  category text default 'Umum',
  description text default '',
  author_name text default '',
  author_user_id uuid,
  tags text[] default '{}',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists gallery_designs_cat_idx on gallery_designs (category);
alter table gallery_designs enable row level security;
drop policy if exists gd_read on gallery_designs;
create policy gd_read on gallery_designs for select using (true);
drop policy if exists gd_write on gallery_designs;
create policy gd_write on gallery_designs for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- app settings (auto cleanup flag)
create table if not exists gallery_app_settings (
  key text primary key,
  value jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);
alter table gallery_app_settings enable row level security;
drop policy if exists gas_all on gallery_app_settings;
create policy gas_all on gallery_app_settings for all using (true) with check (true);
