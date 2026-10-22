-- Reply thread (max 3 levels enforced in app)
alter table gallery_chat add column if not exists reply_to uuid references gallery_chat(id) on delete set null;
create index if not exists gallery_chat_reply_to_idx on gallery_chat (reply_to);
