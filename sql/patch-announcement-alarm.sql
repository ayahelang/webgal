-- Talking alarm flag on announcements
alter table public.gallery_announcements
  add column if not exists is_alarm boolean not null default false;

comment on column public.gallery_announcements.is_alarm is
  'Jika true, pengumuman dibacakan via speechSynthesis (TTS) saat jadwal tiba';
