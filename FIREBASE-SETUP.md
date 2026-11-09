# Dual Database: Supabase + Firebase (failover kuota)

Silverhawk Webgal memakai **Supabase** sebagai database utama.
Bila kuota bulanan Supabase (gratis) habis, mode failover dapat dialihkan ke **Firebase**.

> Catatan jujur: sinkron penuh dua arah real-time antara Supabase ↔ Firebase
> untuk *semua* tabel memerlukan backend/Cloud Functions. Paket ini menyediakan
> **switch backend + panel mode hemat** agar situs tetap bisa dikurangi bebannya
> dan Firebase siap dipasang bertahap.

## 1. Mode hemat (tanpa Firebase)

Di halaman mana pun tekan:

**Ctrl + Shift + Alt + M**

Panel cepat muncul → centang **Mode hemat aktif**.

Efek:
- Flag `localStorage.sh_economy_mode = 1`
- Class `html.sh-economy` (CSS bisa menyembunyikan widget non-kritis)
- `window.SH_ECONOMY === true` (skrip lain bisa menghormati)

## 2. Setup Firebase (sekali)

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. **Add project** → nama misalnya `silverhawk-webgal`
3. Nonaktifkan Google Analytics bila tidak perlu (opsional)
4. Di project: **Build → Firestore Database → Create database**
   - Mode: **production** (atau test sementara, max 30 hari)
   - Lokasi: pilih yang dekat (mis. `asia-southeast2`)
5. **Build → Authentication** (opsional) → enable **Google** bila ingin login sama
6. **Project settings** (ikon gerigi) → **Your apps** → ikon **Web (</>)**
   - App nickname: `webgal`
   - Salin objek `firebaseConfig`
7. Edit file di repo: `js/firebase-config.js`
   - Tempel nilai `apiKey`, `projectId`, dll.
   - Set `window.SH_FIREBASE_ENABLED = true;`
8. **Firestore → Rules** (contoh ketat-bertahap; sesuaikan!):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Untuk produksi, batasi per collection (`gallery_websites`, `gallery_chat`, …).

9. (Opsional) **Storage** untuk gambar chat/desain bila Supabase Storage ikut limit.

## 3. File di repo

| File | Fungsi |
|------|--------|
| `js/economy-mode.js` | Shortcut panel + mode hemat |
| `js/db-failover.js` | Deteksi error kuota + preferensi backend |
| `js/firebase-config.js` | Konfigurasi Firebase (edit manual) |

Sertakan di HTML **sebelum** `js/db.js` / `js/app.js`:

```html
<script src="js/firebase-config.js"></script>
<script src="js/db-failover.js"></script>
<script src="js/economy-mode.js"></script>
```

## 4. Perilaku yang diharapkan

1. Normal → semua data lewat Supabase.
2. Kuota Supabase habis → request gagal dengan pesan limit/402/429.
3. Panel **Cek koneksi DB** menampilkan error; bila Firebase sudah diisi, failover mencatat backend `firebase`.
4. Mode hemat tetap bisa dipakai meski masih di Supabase (mengurangi traffic).

## 5. Migrasi data (manual, saat perlu)

Firestore tidak otomatis terisi dari Supabase. Opsi:

- Export CSV/JSON dari Supabase → import script ke Firestore
- Atau isi ulang lewat panel admin setelah backend Firebase di-wire penuh

## 6. Batas layanan gratis (ringkas)

| Layanan | Batas tipikal gratis |
|---------|----------------------|
| Supabase | DB size, bandwidth, MAU auth / bulan |
| Firebase Spark | Firestore reads/writes/day, storage |

Gunakan **mode hemat** + kurangi realtime/polling agar jarang menabrak kuota.

## 7. Keamanan

- Kunci Firebase API di **App Check** / restriksi HTTP referrer domain `webgal.silverhawk.web.id`
- Jangan biarkan rules `allow write: if true` di produksi
