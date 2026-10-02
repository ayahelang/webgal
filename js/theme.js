(function () {
  var KEY = "sh_theme";
  var ORDER = ["youth", "adult", "senior"];
  var LABEL = { youth: "Tema Muda", adult: "Tema Dewasa", senior: "Tema Lansia" };

  function current() {
    var t = localStorage.getItem(KEY) || "youth";
    return ORDER.indexOf(t) >= 0 ? t : "youth";
  }
  function apply(t) {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem(KEY, t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var colors = { youth: "#081018", adult: "#161d26", senior: "#242018" };
      meta.setAttribute("content", colors[t] || "#081018");
    }
    var btn = document.getElementById("themeToggle");
    if (btn) {
      btn.setAttribute("data-theme-active", t);
      btn.title = "Ganti tema (sekarang: " + (LABEL[t] || t) + ")";
      var lab = btn.querySelector(".theme-label");
      if (lab) lab.textContent = LABEL[t] || t;
    }
  }
  function next() {
    var i = ORDER.indexOf(current());
    apply(ORDER[(i + 1) % ORDER.length]);
  }
  function ensureBtn() {
    if (document.getElementById("themeToggle")) return;
    var bar = document.querySelector(".topbar");
    if (!bar) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "themeToggle";
    btn.className = "theme-toggle";
    btn.innerHTML = '<span class="theme-dot" aria-hidden="true"></span><span class="theme-label"></span>';
    btn.addEventListener("click", next);
    // prefer after nav
    var nav = bar.querySelector(".topnav");
    if (nav && nav.parentNode === bar) {
      bar.insertBefore(btn, nav.nextSibling);
    } else {
      bar.appendChild(btn);
    }
    apply(current());
  }
  apply(current());
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureBtn);
  } else {
    ensureBtn();
  }
})();
