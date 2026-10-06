#!/usr/bin/env bash
# cleanup-unused.sh — hapus file duplikat / tidak dipakai GitHub Pages
# Jalankan dari root repo webgal (folder yang berisi index.html)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "==> Root: $ROOT"
echo "==> Membersihkan file yang tidak dipakai deploy..."

# --- 1) JS duplikat di root (HTML memuat dari js/) ---
ROOT_JS=(
  admin.js app.js auth-ui.js chat.js kisi-kisi.js my-works.js
  profile-status.js profile.js refleksi.js skills.js social.js
  stats-float.js stats-page.js submit.js videos.js
  db.js script.js
)
for f in "${ROOT_JS[@]}"; do
  if [[ -f "$f" ]]; then
    echo "  hapus root JS: $f"
    rm -f "$f"
  fi
done

# --- 2) JSON/CSS duplikat di root (pakai data/ dan css/) ---
ROOT_DATA=(
  skills.json websites.json kisi-kisi-sts.json refleksi-bonus.json
  fallback.js style.css "style (1).css" supabase-config.js
)
for f in "${ROOT_DATA[@]}"; do
  if [[ -f "$f" ]]; then
    echo "  hapus root data/css: $f"
    rm -f "$f"
  fi
done

# --- 3) DOCX duplikat di root (sudah ada di docs/) ---
for f in 01_Program_Tahunan_Prota.docx 02_Program_Semester_Prosem.docx \
         03_Silabus_ATP.docx 04_Modul_Ajar_RPP_Per_Minggu.docx; do
  if [[ -f "$f" ]]; then
    echo "  hapus root docx: $f"
    rm -f "$f"
  fi
done

# --- 4) SQL tidak perlu di GitHub Pages (hanya untuk Supabase Dashboard) ---
# Pindahkan ke folder _sql/ biar tetap ada cadangan, tidak ikut "konten situs"
mkdir -p _sql
shopt -s nullglob
for f in supabase-*.sql; do
  echo "  pindah SQL → _sql/: $f"
  mv -f "$f" _sql/
done
shopt -u nullglob

# Opsional: jangan serve folder _sql di Pages (CNAME/index tetap jalan)
# GitHub Pages tetap meng-upload file di _sql, tapi tidak mempengaruhi app.

echo ""
echo "==> Selesai. File penting yang TETAP dipertahankan:"
echo "    index.html, *.html, css/, js/, data/, docs/, assets/, CNAME, README*.md"
echo ""
echo "Lanjut (jika sudah di repo git):"
echo "  git add -A"
echo "  git status"
echo "  git commit -m 'chore: hapus file duplikat & pindah SQL ke _sql/'"
echo "  git push origin main"
echo ""
echo "Catatan SQL: jalankan di Supabase SQL Editor hanya jika fitur belum aktif."
echo "  Lihat _sql/README-SQL.md"
