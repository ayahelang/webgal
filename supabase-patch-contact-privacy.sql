-- Kontak WA/sosmed + privasi tampilan
alter table gallery_profiles
  add column if not exists contact_wa text default '',
  add column if not exists contact_ig text default '',
  add column if not exists contact_fb text default '',
  add column if not exists contact_twitter text default '',
  add column if not exists contact_tiktok text default '',
  add column if not exists contact_privacy jsonb default '{}'::jsonb;

-- Index bantu join alumni
create index if not exists gallery_profiles_linked_alumni_idx
  on gallery_profiles (linked_alumni_id)
  where linked_alumni_id is not null;
