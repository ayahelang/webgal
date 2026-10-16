-- Optional: track chat message edits
alter table gallery_chat add column if not exists updated_at timestamptz;
-- user_id / is_registered may already exist from earlier patches
alter table gallery_chat add column if not exists user_id uuid;
alter table gallery_chat add column if not exists is_registered boolean default false;

-- Ensure realtime publishes UPDATE/DELETE (Supabase: add gallery_chat to supabase_realtime publication if needed)
-- alter publication supabase_realtime add table gallery_chat;
