-- gallery_chat_reactions: reaksi emoji per pesan chat (gaya WhatsApp)
create table if not exists gallery_chat_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references gallery_chat(id) on delete cascade,
  emoji text not null check (char_length(emoji) >= 1 and char_length(emoji) <= 16),
  author_name text not null default 'Anonim',
  author_user_id uuid,
  created_at timestamptz default now()
);

create index if not exists gcr_message_idx on gallery_chat_reactions (message_id);

-- Satu user (atau satu nama anon) hanya satu reaksi per pesan (boleh ganti emoji)
create unique index if not exists gcr_user_msg_uidx
  on gallery_chat_reactions (message_id, author_user_id)
  where author_user_id is not null;

create unique index if not exists gcr_anon_msg_uidx
  on gallery_chat_reactions (message_id, author_name)
  where author_user_id is null;

alter table gallery_chat_reactions enable row level security;

drop policy if exists gcr_all on gallery_chat_reactions;
create policy gcr_all on gallery_chat_reactions for all using (true) with check (true);

-- Verifikasi
select count(*) as reaction_rows from gallery_chat_reactions;
