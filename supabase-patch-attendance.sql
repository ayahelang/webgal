-- Absensi online Silverhawk Gallery
create table if not exists gallery_attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject_code text not null default 'SMM', -- SMM | DG | custom
  subject_label text not null default 'Social Media Marketing',
  description text default '',
  -- audience like announcements
  audience text not null default 'students', -- all_linked | students | class
  target_students jsonb default '[]'::jsonb, -- [{year,class,name}]
  target_years text[] default '{}',
  target_classes text[] default '{}',
  -- schedule window
  session_date date, -- null = recurring by weekdays
  weekdays int[] default '{}', -- 1=Mon .. 7=Sun (ISO), empty = use session_date only
  checkin_start time not null default '07:00',
  checkin_end time not null default '07:15', -- after this = late / closed
  checkout_start time not null default '08:20',
  checkout_end time not null default '08:40',
  timezone text default 'Asia/Jakarta',
  require_checkout boolean default true,
  active boolean default true,
  created_by uuid,
  created_by_email text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists gallery_attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references gallery_attendance_sessions(id) on delete cascade,
  user_id uuid not null,
  student_name text not null default '',
  angkatan_year text default '',
  class_code text default '',
  email text default '',
  -- check-in
  checkin_at timestamptz,
  checkin_note text default '',
  checkin_status text default '', -- on_time | late | missing
  -- check-out
  checkout_at timestamptz,
  checkout_note text default '',
  checkout_status text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (session_id, user_id)
);

create index if not exists att_rec_session_idx on gallery_attendance_records (session_id);
create index if not exists att_rec_user_idx on gallery_attendance_records (user_id);
create index if not exists att_rec_date_idx on gallery_attendance_records (checkin_at);
create index if not exists att_sess_active_idx on gallery_attendance_sessions (active, subject_code);

alter table gallery_attendance_sessions enable row level security;
alter table gallery_attendance_records enable row level security;

drop policy if exists "att_sess_read" on gallery_attendance_sessions;
create policy "att_sess_read" on gallery_attendance_sessions for select using (true);

drop policy if exists "att_sess_write" on gallery_attendance_sessions;
create policy "att_sess_write" on gallery_attendance_sessions for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "att_rec_read" on gallery_attendance_records;
create policy "att_rec_read" on gallery_attendance_records for select using (true);

drop policy if exists "att_rec_write" on gallery_attendance_records;
create policy "att_rec_write" on gallery_attendance_records for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- optional: seed one SMM template (inactive) — admin activates/edits
-- insert omitted; create from admin UI
