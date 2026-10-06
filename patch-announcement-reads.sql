
create table if not exists gallery_announcement_reads (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references gallery_announcements(id) on delete cascade,
  user_id uuid,
  student_name text default '',
  angkatan_year text default '',
  class_code text default '',
  email text default '',
  via text default 'view', -- view | click
  read_at timestamptz default now(),
  unique (announcement_id, user_id)
);
create index if not exists ann_reads_ann_idx on gallery_announcement_reads (announcement_id);
alter table gallery_announcement_reads enable row level security;
drop policy if exists ann_reads_read on gallery_announcement_reads;
create policy ann_reads_read on gallery_announcement_reads for select using (true);
drop policy if exists ann_reads_write on gallery_announcement_reads;
create policy ann_reads_write on gallery_announcement_reads for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
