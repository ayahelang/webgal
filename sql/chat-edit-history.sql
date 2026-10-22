-- Opsional tapi disarankan: histori edit chat (ringan)
-- Tiap edit hanya menyimpan teks lama (max 3 versi) + counter
ALTER TABLE gallery_chat
  ADD COLUMN IF NOT EXISTS edit_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS edit_history jsonb DEFAULT '[]'::jsonb;
