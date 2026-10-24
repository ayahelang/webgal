-- Jalankan ini jika tabel gallery_chat_rooms sudah ada tapi kolom allowed_students belum
-- Error: Could not find the 'allowed_students' column of 'gallery_chat_rooms'

alter table public.gallery_chat_rooms
  add column if not exists allowed_students jsonb default '[]'::jsonb;

alter table public.gallery_chat_rooms
  add column if not exists allowed_angkatan_ids uuid[] default '{}';

alter table public.gallery_chat_rooms
  add column if not exists allowed_class_codes text[] default '{}';

alter table public.gallery_chat
  add column if not exists room_id uuid references public.gallery_chat_rooms(id) on delete set null;

-- Pastikan RLS tidak memblokir admin membaca daftar
alter table public.gallery_chat_rooms enable row level security;

drop policy if exists "chat_rooms read active" on public.gallery_chat_rooms;
create policy "chat_rooms read active" on public.gallery_chat_rooms
  for select using (true);

drop policy if exists "chat_rooms write auth" on public.gallery_chat_rooms;
create policy "chat_rooms write auth" on public.gallery_chat_rooms
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Refresh schema cache PostgREST (kadang perlu reload project / tunggu beberapa detik)
notify pgrst, 'reload schema';
