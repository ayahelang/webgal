-- Pesan popup guru setelah check-in / check-out
alter table public.gallery_attendance_sessions
  add column if not exists msg_checkin_ontime text default '',
  add column if not exists msg_checkin_late text default '',
  add column if not exists msg_checkout text default '';

comment on column public.gallery_attendance_sessions.msg_checkin_ontime is 'Pesan kustom popup check-in tepat waktu (kosong = default sistem)';
comment on column public.gallery_attendance_sessions.msg_checkin_late is 'Pesan kustom popup check-in terlambat (kosong = default sistem)';
comment on column public.gallery_attendance_sessions.msg_checkout is 'Pesan kustom popup check-out (kosong = default sistem)';
