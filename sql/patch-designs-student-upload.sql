-- ============================================================
-- Desain grafis: tabel + storage + RLS siswa
-- Jalankan di SQL Editor Supabase (satu kali)
-- ============================================================

create table if not exists public.gallery_designs (
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

create index if not exists gallery_designs_cat_idx on public.gallery_designs (category);
create index if not exists gallery_designs_author_idx on public.gallery_designs (author_user_id);

alter table public.gallery_designs enable row level security;

drop policy if exists gd_read on public.gallery_designs;
create policy gd_read on public.gallery_designs
  for select to anon, authenticated using (true);

drop policy if exists gd_insert on public.gallery_designs;
create policy gd_insert on public.gallery_designs
  for insert to authenticated
  with check (auth.uid() = author_user_id or author_user_id is null);

drop policy if exists gd_update on public.gallery_designs;
create policy gd_update on public.gallery_designs
  for update to authenticated
  using (auth.uid() = author_user_id)
  with check (auth.uid() = author_user_id);

drop policy if exists gd_delete on public.gallery_designs;
create policy gd_delete on public.gallery_designs
  for delete to authenticated
  using (auth.uid() = author_user_id);

-- Storage bucket publik untuk upload desain
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'designs',
  'designs',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','image/gif','image/jpg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Baca publik
drop policy if exists designs_public_read on storage.objects;
create policy designs_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'designs');

-- Upload: user hanya ke folder {user_id}/...
drop policy if exists designs_auth_insert on storage.objects;
create policy designs_auth_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'designs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists designs_auth_update on storage.objects;
create policy designs_auth_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'designs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists designs_auth_delete on storage.objects;
create policy designs_auth_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'designs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
