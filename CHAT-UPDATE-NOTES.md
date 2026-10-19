# Webgal Chat Update v3

## Perbaikan
1. **Minimize / restore**
   - Tombol floating **💬 Chat** dipindah ke `document.body` agar tidak tertelan stacking context.
   - Z-index sangat tinggi (di atas stats-float, lock, dll).
   - Class `.is-visible` + `body.chat-is-min` untuk memaksa tampil.
   - Di HP restore → mode dock; desktop → float.
   - Escape juga mengembalikan dari minimize.

2. **Composer Balas / Ubah di desktop**
   - Lebar otomatis lebih besar di layar ≥900px (hingga ~560–640px).
   - Input utama chat juga lebih lega di desktop.

## File
- chat.html
- js/chat.js
- js/db.js (batas 8000, dari v2)
- css/style.css
