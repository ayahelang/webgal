-- Talking alarm: delay + absolute fire time
alter table public.gallery_announcements
  add column if not exists is_alarm boolean not null default false;
alter table public.gallery_announcements
  add column if not exists alarm_delay_sec integer not null default 0;
alter table public.gallery_announcements
  add column if not exists alarm_fire_at timestamptz;

comment on column public.gallery_announcements.alarm_delay_sec is
  'Detik hitung mundur sejak disimpan (untuk UI)';
comment on column public.gallery_announcements.alarm_fire_at is
  'Waktu absolut alarm berbunyi + TTS';

-- Realtime (Supabase Dashboard → Database → Publications)
-- atau jalankan:
-- alter publication supabase_realtime add table public.gallery_announcements;
