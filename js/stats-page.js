(() => {
  const labelsMap = {
    visit: "Kunjungan",
    click: "Klik karya",
    signup: "Signup",
    love_red: "Love merah",
    love_blue: "Love biru",
    comment_red: "Komentar merah",
    comment_blue: "Komentar biru",
  };

  function chartBars(values, color) {
    const max = Math.max(1, ...values);
    return `<div class="chart-bars">${values
      .map((v) => {
        const h = Math.round((v / max) * 100);
        return `<div class="chart-col" title="${v}"><i style="height:${h}%;background:${color}"></i><span>${v}</span></div>`;
      })
      .join("")}</div>`;
  }

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
        document.getElementById("statsGrid").innerHTML = "<p class='muted'>Data belum tersedia.</p>";
        return;
      }
      document.getElementById("statsGrid").innerHTML = Object.keys(labelsMap)
        .map((k) => {
          const total = s.all[k] || 0;
          const today = s.today[k] || 0;
          return `<article class="stat-card summary-card">
            <div class="eyebrow">${labelsMap[k]}</div>
            <div class="stat-num">${total}</div>
            <div class="muted">+${today} hari ini</div>
          </article>`;
        })
        .join("");

      const ts = await GalleryDB.getStatsTimeseries(14);
      const host = document.getElementById("charts");
      if (host && ts) {
        const colors = {
          visit: "#7de3ff",
          love_red: "#ff8a9a",
          love_blue: "#7db8ff",
          comment_red: "#fbbf24",
          comment_blue: "#a78bfa",
          click: "#8ff5bd",
          signup: "#f472b6",
        };
        host.innerHTML = Object.keys(labelsMap)
          .map((k) => {
            const vals = (ts.series && ts.series[k]) || [];
            return `<article class="summary-card chart-card">
              <div class="eyebrow">${labelsMap[k]} · 14 hari</div>
              <div class="chart-labels muted">${(ts.labels || []).map((d) => d.slice(5)).join(" · ")}</div>
              ${chartBars(vals, colors[k] || "#7de3ff")}
            </article>`;
          })
          .join("");
      }
    } catch (e) {
      document.getElementById("statsGrid").textContent = e.message || String(e);
    }
  }
  boot();
})();
