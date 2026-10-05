-- Foto profil kustom (hotlink) — fallback Google avatar_url
alter table public.gallery_profiles
  add column if not exists profile_photo_url text default '';

comment on column public.gallery_profiles.profile_photo_url is
  'URL foto profil kustom siswa (hotlink). Jika kosong, UI pakai avatar_url Google.';
