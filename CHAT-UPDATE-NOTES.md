# Webgal Chat Update v6 — Floating chat lintas halaman

## Fitur
Jika chat dalam **mode floating**, saat pindah halaman lewat menu header panel chat tetap muncul mengambang (iframe `chat.html?embed=1`).

- Mode **float / max** di halaman lain → panel chat floating
- Mode **min** → tombol FAB 💬 Chat (seperti sebelumnya)
- Mode **dock** → hanya di halaman chat.html (penuh)
- Panel bisa digeser (drag bar), minimize, atau buka halaman chat penuh (↗)
- Di layar sempit (<720px), tombol FAB mengarah ke halaman chat penuh

## File
- `js/chat-float.js`
- `js/chat.js`
- `css/style.css`

Script `chat-float.js` sudah ada di semua HTML dari v4; cukup timpa 3 file ini.
