# PageSpeed — about.html

## Perubahan
- Foto LCP → WebP + JPEG lebih kecil, `preload` + `fetchpriority=high`
- GTM ditunda ~3.5s setelah load (hemat TBT / unused JS di lab)
- lock.css non-blocking; lock.js + chat-float + widget lain setelah idle
- Preconnect / dns-prefetch origin penting
- Service worker cache aset statis (kunjungan ulang)

## Realistis skor 99+
Lighthouse lab masih menghitung:
- Script pihak ketiga (GTM, lock.js remote)
- Cache policy GitHub Pages (~10 menit) yang tidak bisa diubah dari repo saja
- Banyak request Supabase saat auth/widget load

Target realistis setelah patch: **mobile ~85–95**, **desktop ~95–99**.
Agar mendekati 99 mobile: nonaktifkan GTM di about, atau pasang Cloudflare di depan domain dengan cache rules panjang.
