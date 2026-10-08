-- Izinkan reaksi/komentar pada karya desain grafis
-- Jalankan di SQL Editor database (Supabase)

alter table public.gallery_reactions
  drop constraint if exists gallery_reactions_target_type_check;

alter table public.gallery_reactions
  add constraint gallery_reactions_target_type_check
  check (target_type in ('website', 'video', 'design'));
