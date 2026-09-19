-- Love, komentar, statistik pengunjung

create table if not exists gallery_reactions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('website','video')),
  target_id text not null, -- id website/video (uuid as text) atau hash url
  reaction_type text not null check (reaction_type in ('love','comment')),
  is_registered boolean not null default false,
  author_name text not null default 'Anonim',
  author_user_id uuid,
  body text default '',
  created_at timestamptz default now()
);
create index if not exists gallery_reactions_target_idx
  on gallery_reactions(target_type, target_id, reaction_type);
-- satu love per user terdaftar per target
create unique index if not exists gallery_reactions_love_user_uidx
  on gallery_reactions(target_type, target_id, author_user_id)
  where reaction_type = 'love' and author_user_id is not null;

create table if not exists gallery_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  session_id text default '',
  user_id uuid,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists gallery_events_type_time_idx
  on gallery_events(event_type, created_at desc);

alter table gallery_reactions enable row level security;
alter table gallery_events enable row level security;
drop policy if exists gr_all on gallery_reactions;
create policy gr_all on gallery_reactions for all using (true) with check (true);
drop policy if exists ge_all on gallery_events;
create policy ge_all on gallery_events for all using (true) with check (true);
