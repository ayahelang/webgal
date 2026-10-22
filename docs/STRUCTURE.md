# Struktur folder WebGal

## Root (GitHub Pages)
- `*.html` — halaman situs
- `CNAME`
- `robots.txt` / `sitemap.xml` (jika ada)
- `README.md`

## Folder utama
| Folder | Isi |
|--------|-----|
| `js/` | Semua JavaScript aplikasi |
| `css/` | Stylesheet (`style.css`) |
| `data/` | Config & JSON runtime |
| `assets/` | Gambar, favicon, OG, QRIS |
| `sql/` | Skema & patch Supabase |
| `docs/` | Dokumentasi |
| `scripts/` | Helper (bukan runtime web) |
| `supabase/` | Edge functions |
| `orphan/` | Arsip duplikat / tidak terpakai |

## Path HTML
- JS → `js/...`
- CSS → `css/style.css`
- Config → `data/supabase-config.js`
- Asset → `assets/...`
