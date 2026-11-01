-- Teks & menit pengingat bel absensi (opsional)
ALTER TABLE public.gallery_attendance_sessions
  ADD COLUMN IF NOT EXISTS warn_before_end_min int DEFAULT 5,
  ADD COLUMN IF NOT EXISTS warn_before_end_text text,
  ADD COLUMN IF NOT EXISTS warn_before_start_min int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warn_before_start_text text,
  ADD COLUMN IF NOT EXISTS end_message text;
