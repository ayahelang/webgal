/**
 * Login darurat admin (cadangan saat Supabase Auth/kuota bermasalah).
 * Isi gasUrl setelah deploy Google Apps Script (lihat docs/ADMIN-EMERGENCY-LOGIN.md).
 * JANGAN simpan password di file ini — password hanya di Script Properties.
 */
window.SH_ADMIN_EMERGENCY = {
  /** URL Web App GAS, contoh: https://script.google.com/macros/s/XXXX/exec */
  gasUrl: "",
  /** Lama sesi darurat (jam) setelah login berhasil */
  sessionHours: 4,
  /** Label di panel */
  label: "Admin darurat",
};
