// Salin nilai dari Firebase Console → Project settings → Your apps (Web)
// Jangan commit API key sensitif bila repo privat lebih aman; untuk web client Firebase key memang publik + dibatasi domain.
window.FIREBASE_CONFIG = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PROJECT_ID.firebaseapp.com",
  projectId: "PROJECT_ID",
  storageBucket: "PROJECT_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID",
};
// true = izinkan app mencoba Firebase saat Supabase error kuota
window.SH_FIREBASE_ENABLED = false;
