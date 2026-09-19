(() => {
  const labels = {
    visit: "Kunjungan website",
    click: "Klik karya",
    signup: "Register / signup",
    love_red: "Love merah (tamu)",
    love_blue: "Love biru (login)",
    comment_red: "Komentar merah",
    comment_blue: "Komentar biru",
  };

  async function boot() {
    if (GalleryDB.enabled()) {
      GalleryDB.trackEvent("visit", { page: "stats" });
      GalleryDB.joinPresenceOnline((n) => {
        document.getElementById("onlineNow").textContent = n;
      });
    }
    try {
      const s = await GalleryDB.getStatsSummary();
      if (!s) {
        document.getElementById("statsGrid").innerHTML = "<p class='muted'>Supabase belum siap.</p>";
        return;
      }
      const grid = document.getElementById("statsGrid");
      grid.innerHTML = Object.keys(labels)
        .map((k) => {
          const total = s.all[k] || 0;
          const today = s.today[k] || 0;
          return `<article class="stat-card summary-card">
            <div class="eyebrow">${labels[k]}</div>
            <div class="stat-num">${total}</div>
            <div class="muted">+${today} hari ini</div>
          </article>`;
        })
        .join("");
    } catch (e) {
      document.getElementById("statsGrid").textContent = e.message || String(e);
    }
  }
  boot();
})();
