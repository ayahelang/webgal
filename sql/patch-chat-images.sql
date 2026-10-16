-- Chat images: bucket + policies
-- Cleanup 24 jam TIDAK bisa lewat DELETE storage.objects (diblokir Supabase).
-- Gunakan Edge Function: supabase/functions/cleanup-chat-images
--
-- Jalankan blok A di SQL Editor. Blok B opsional (hapus function SQL lama yang error).

-- ========== A) Bucket + policies ==========
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-images',
  'chat-images',
  true,
  2097152,
  array['image/jpeg','image/png','image/webp','image/gif','image/jpg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists chat_images_public_read on storage.objects;
create policy chat_images_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'chat-images');

drop policy if exists chat_images_insert on storage.objects;
create policy chat_images_insert on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'chat-images'
    and (
      (storage.foldername(name))[1] = 'anon'
      or (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
    )
  );

drop policy if exists chat_images_delete_own on storage.objects;
create policy chat_images_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ========== B) Hapus function SQL lama (opsional, aman dijalankan) ==========
drop function if exists public.cleanup_chat_images_older_than_24h();
