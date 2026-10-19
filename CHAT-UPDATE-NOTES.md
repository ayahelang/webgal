# Webgal Chat + Stats Float Update v4

## Fitur baru / perbaikan

### 1. Tombol floating chat lintas halaman
- Saat chat di-minimize, tombol **💬 Chat** (kanan bawah) tetap muncul di **semua halaman**.
- Klik dari halaman lain → membuka `chat.html` dan mengembalikan tampilan chat (dock di HP, float di desktop).
- Script baru: `js/chat-float.js` (sudah disisipkan di semua HTML).

### 2. Statistik floating bisa digeser
- Penyebab bug: CSS memakai `left`/`bottom` dengan `!important`, sehingga mengalahkan posisi dari JavaScript.
- Sekarang drag memakai **Pointer Events** (mouse + touch), posisi disimpan di localStorage, dan CSS tidak mengunci posisi lagi.
- Bisa digeser bebas di layar; posisi diingat setelah refresh.

## File yang perlu di-upload
- `js/chat.js`
- `js/chat-float.js` **(baru)**
- `js/stats-float.js`
- `js/db.js` (batas teks 8000, dari v2)
- `css/style.css`
- Semua `*.html` (script tag `chat-float.js` + `stats-float.js`)

Atau timpa seluruh isi folder zip ini ke root repo/hosting.
