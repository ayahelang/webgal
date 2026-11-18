# Login darurat admin (cadangan saat Supabase terbatas)

## Masalah
Login Google lewat **Supabase Auth**. Jika kuota/egress Supabase bermasalah, tombol Login Google bisa gagal — termasuk admin.

## Solusi cadangan
Password admin diverifikasi oleh **Google Apps Script** (disimpan di **Script Properties**, bukan di GitHub).  
Jika benar, browser menyimpan sesi darurat lokal (±4 jam) dan membuka Panel Admin.

> Catatan jujur: sesi darurat **membuka panel admin**. Operasi data yang masih memanggil Supabase bisa gagal jika kuota DB juga habis. Gunakan bersamaan dengan **Mode Kuota / Mode hemat** dan (opsional) **Firebase failover**.

## Status Firebase di repo ini
| Komponen | Status |
|----------|--------|
| `js/firebase-config.js` | Sudah terisi project `webgal-44a7b`, `SH_FIREBASE_ENABLED = true` |
| `js/db-failover.js` | Switch backend + deteksi error kuota |
| `FIREBASE-SETUP.md` | Panduan setup |
| Dual-write semua tabel | **Belum penuh** — framework siap, sinkron 2 arah real-time butuh tahap lanjut |
| Login Google tanpa Supabase | **Belum** — Auth tetap Supabase; cadangan admin = password GAS di bawah |

## Setup Apps Script (sekali)

1. Buka [script.google.com](https://script.google.com/) → **New project**
2. Hapus kode default, tempel isi `scripts/AdminEmergencyLogin.gs`
3. **Project Settings** (ikon roda gigi) → **Script properties** → **Add script property**:
   - `ADMIN_EMERGENCY_PASSWORD` = password rahasia Anda (panjang, unik)
   - opsional: `ADMIN_EMERGENCY_LABEL` = `Admin darurat`
4. **Deploy** → **New deployment** → jenis **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Salin **Web app URL** (berakhiran `/exec`)
6. Di repo, edit `data/admin-emergency-config.js`:
   ```js
   gasUrl: "https://script.google.com/macros/s/XXXX/exec",
   ```
7. Commit & deploy ke GitHub Pages
8. Uji: buka `admin.html` → bagian **Login darurat (cadangan)** → masukkan password

Uji endpoint (opsional): buka `URL?ping=1` di browser → harus JSON `{ ok: true, ... }`.

## Keamanan
- Jangan commit password ke GitHub
- Ganti password berkala di Script Properties
- Sesi darurat hanya di browser (localStorage), kedaluwarsa otomatis
- Tombol **Keluar** di admin juga membersihkan sesi darurat

## Alur saat Supabase bermasalah (usulan operasional)
1. **Admin** masuk lewat login darurat (password GAS)
2. Aktifkan **Mode Kuota / Mode hemat** di panel admin (tab Mode Kuota) atau pintasan Ctrl+Shift+Alt+M
3. Tunggu reset kuota Supabase / upgrade plan
4. (Opsional) siapkan Firebase penuh mengikuti `FIREBASE-SETUP.md` untuk baca data non-auth
