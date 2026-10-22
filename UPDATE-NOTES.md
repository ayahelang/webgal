# Player klasik (standar HTML5)

Pola umum player audio:
- seek.max = durasi (detik)
- seek.value = currentTime
- timeupdate → update slider + angka
- input pada slider → audio.currentTime = seek.value

UI dalam satu kotak: ▶/❚❚ · ⏹ · waktu · slider · ⬇

File: js/voice-kit.js, css/style.css (+ chat/admin/announce jika perlu)
