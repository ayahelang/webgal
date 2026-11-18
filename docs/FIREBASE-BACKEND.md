# Firebase & Google Sheet — cadangan saat Supabase terbatas

## A. Firebase (project `webgal-44a7b`)

### 1. Firestore
1. Buka https://console.firebase.google.com/project/webgal-44a7b/firestore
2. Create database (jika belum) — lokasi misalnya `asia-southeast2`

### 2. Rules (uji dulu, lalu kunci)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sh_meta/{doc} {
      allow read: if true;
      allow write: if true; // uji; produksi: batasi auth admin
    }
    match /{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```
Publish rules.

### 3. Collection yang dipakai app
| Collection | Doc ID | Isi |
|------------|--------|-----|
| `sh_meta` | `backend` | `"supabase"` / `"firebase"` |
| `sh_meta` | `quotaMode` | `"hemat"` / `"normal"` |
| `sh_meta` | `ping` | opsional |

Di panel admin → tab **Mode Kuota** → **Cek koneksi backend** harus menunjukkan Firebase: OK.

### 4. File di repo
- `js/firebase-config.js` — sudah berisi project Anda, `SH_FIREBASE_ENABLED = true`
- `js/db-failover.js` — init SDK + ping + writeMeta

### 5. Batas realistis saat ini
Firebase **sudah berguna** untuk:
- menyimpan preferensi backend & mode hemat
- cek koneksi saat Supabase gagal

Belum otomatis menyalin semua tabel gallery/chat (itu migrasi besar). Data konten tetap dari Supabase atau impor Sheet.

---

## B. Google Sheet

### Dipakai untuk apa
- Import roster siswa / alias (tab **Sync Docs** / bulk users)
- Cadangan data nama-kelas saat DB utama bermasalah

### Yang perlu Anda siapkan
1. Sheet terstruktur, contoh kolom:
   - `nama,role,angkatan,kelas`
2. Bagikan Sheet: **Anyone with the link = Viewer** (untuk impor CSV publik) **atau** pakai deploy Apps Script yang sudah ada
3. Di admin → **Sync Docs** / form import: tempel URL atau ID Sheet
4. Template CSV juga bisa diunduh dari tombol template di tab Users (bila ada)

### Alur saat Supabase kena kuota
1. Login darurat (password)
2. Tab **Mode Kuota** → **Hemat ON**
3. Backend **Firebase** (meta/mode)
4. Data siswa: impor dari **Google Sheet** lewat Sync / bulk
5. Konten video/web: tunggu kuota Supabase atau isi manual bertahap nanti

---

## C. Cek di admin
1. Login darurat
2. Tab **Mode Kuota** harus terbuka otomatis (mode darurat)
3. Toggle Hemat, pilih backend, **Cek koneksi backend**
