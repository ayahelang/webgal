-- Izinkan check-in terlambat (opsional per sesi)
alter table gallery_attendance_sessions
  add column if not exists allow_late boolean default false;

comment on column gallery_attendance_sessions.allow_late is 'Jika true, siswa masih bisa check-in setelah batas checkin_end (status late)';
