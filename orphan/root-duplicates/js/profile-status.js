/** Status otomatis dari tahun angkatan vs tahun sekarang */
window.SHStatus = {
  compute(angkatanYear, now) {
    const y = (now || new Date()).getFullYear();
    const a = parseInt(angkatanYear, 10);
    if (!a || isNaN(a)) return { key: "guest", label: "Pengunjung" };
    // Pola: tahun sekarang Y
    // angkatan >= Y-1 → Siswa Aktif (contoh 2026: 2025 & 2026)
    // angkatan === Y-2 → Kakak Kelas (contoh 2026: 2024)
    // angkatan <= Y-3 → Alumni (contoh 2026: 2023 ke bawah)
    if (a >= y - 1) {
      return { key: "aktif", label: "Siswa Aktif yang masih belajar SMM" };
    }
    if (a === y - 2) {
      return { key: "kakak", label: "Kakak Kelas yang pernah belajar SMM" };
    }
    return { key: "alumni", label: "Alumni yang pernah belajar SMM" };
  },
};
