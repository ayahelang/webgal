/**
 * PDF flip-page untuk hotlink desain (multi-halaman).
 * Menggunakan PDF.js (CDN). Butuh URL yang mengizinkan CORS.
 */
(function (global) {
  var pdfjsLib = null;
  var loading = null;

  function loadPdfJs() {
    if (pdfjsLib) return Promise.resolve(pdfjsLib);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      if (window.pdfjsLib) {
        pdfjsLib = window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(pdfjsLib);
        return;
      }
      var s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = function () {
        pdfjsLib = window.pdfjsLib;
        if (!pdfjsLib) {
          reject(new Error("PDF.js gagal dimuat"));
          return;
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(pdfjsLib);
      };
      s.onerror = function () {
        reject(new Error("Tidak bisa memuat PDF.js"));
      };
      document.head.appendChild(s);
    });
    return loading;
  }

  function isPdfUrl(url) {
    var u = String(url || "").trim().toLowerCase();
    if (!u) return false;
    if (/\.pdf(\?|#|$)/i.test(u)) return true;
    if (/application%2fpdf/i.test(u)) return true;
    if (/drive\.google\.com/.test(u) && /\/file\/d\//.test(u)) return true;
    if (/docs\.google\.com\/.*\/export\?.*format=pdf/i.test(u)) return true;
    return false;
  }

  /** Normalisasi hotlink agar lebih mudah di-fetch (Drive/Dropbox). */
  function normalizePdfUrl(url) {
    var u = String(url || "").trim();
    // Google Drive: /file/d/ID/view → direct-ish
    var m = u.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (m) {
      return "https://drive.google.com/uc?export=download&id=" + m[1];
    }
    // Dropbox
    if (/dropbox\.com/.test(u)) {
      return u.replace(/[?&]dl=0/, "").replace(/\?dl=0/, "") + (u.indexOf("?") >= 0 ? "&dl=1" : "?dl=1");
    }
    return u;
  }

  /**
   * Mount flip viewer ke container.
   * @param {HTMLElement} host
   * @param {string} url
   * @param {{ title?: string }} opts
   */
  function mount(host, url, opts) {
    opts = opts || {};
    if (!host || !url) return;
    host.classList.add("pdf-flip");
    host.innerHTML =
      '<div class="pdf-flip-stage">' +
      '  <div class="pdf-flip-sheet">' +
      '    <canvas class="pdf-flip-canvas"></canvas>' +
      "  </div>" +
      '  <div class="pdf-flip-loading">Memuat PDF…</div>' +
      "</div>" +
      '<div class="pdf-flip-controls">' +
      '  <button type="button" class="pdf-flip-btn" data-pdf-prev aria-label="Halaman sebelumnya">‹</button>' +
      '  <span class="pdf-flip-page">—</span>' +
      '  <button type="button" class="pdf-flip-btn" data-pdf-next aria-label="Halaman berikutnya">›</button>' +
      '  <a class="pdf-flip-open" href="' +
      String(url).replace(/"/g, "&quot;") +
      '" target="_blank" rel="noopener">Buka PDF</a>' +
      "</div>";

    var canvas = host.querySelector(".pdf-flip-canvas");
    var sheet = host.querySelector(".pdf-flip-sheet");
    var loadingEl = host.querySelector(".pdf-flip-loading");
    var pageLabel = host.querySelector(".pdf-flip-page");
    var btnPrev = host.querySelector("[data-pdf-prev]");
    var btnNext = host.querySelector("[data-pdf-next]");
    var pageNum = 1;
    var pdfDoc = null;
    var rendering = false;
    var pending = null;

    function setLabel() {
      if (!pdfDoc) {
        pageLabel.textContent = "—";
        return;
      }
      pageLabel.textContent = pageNum + " / " + pdfDoc.numPages;
      btnPrev.disabled = pageNum <= 1;
      btnNext.disabled = pageNum >= pdfDoc.numPages;
    }

    function renderPage(num, flipDir) {
      if (!pdfDoc || rendering) {
        pending = { num: num, flipDir: flipDir };
        return;
      }
      rendering = true;
      pageNum = num;
      setLabel();
      if (flipDir && sheet) {
        sheet.classList.remove("flip-left", "flip-right");
        // force reflow
        void sheet.offsetWidth;
        sheet.classList.add(flipDir === "next" ? "flip-left" : "flip-right");
        setTimeout(function () {
          sheet.classList.remove("flip-left", "flip-right");
        }, 420);
      }
      pdfDoc
        .getPage(num)
        .then(function (page) {
          var stage = host.querySelector(".pdf-flip-stage");
          var maxW = (stage && stage.clientWidth) || 320;
          var maxH = (stage && stage.clientHeight) || 360;
          var base = page.getViewport({ scale: 1 });
          var scale = Math.min(maxW / base.width, maxH / base.height) * (window.devicePixelRatio || 1);
          if (scale < 0.5) scale = 0.5;
          var viewport = page.getViewport({ scale: scale });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = viewport.width / (window.devicePixelRatio || 1) + "px";
          canvas.style.height = viewport.height / (window.devicePixelRatio || 1) + "px";
          var ctx = canvas.getContext("2d");
          return page.render({ canvasContext: ctx, viewport: viewport }).promise;
        })
        .then(function () {
          if (loadingEl) loadingEl.hidden = true;
          rendering = false;
          if (pending) {
            var p = pending;
            pending = null;
            if (p.num !== pageNum) renderPage(p.num, p.flipDir);
          }
        })
        .catch(function (err) {
          rendering = false;
          if (loadingEl) {
            loadingEl.hidden = false;
            loadingEl.textContent =
              "Gagal render halaman. " + (err && err.message ? err.message : "");
          }
        });
    }

    btnPrev.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (pageNum > 1) renderPage(pageNum - 1, "prev");
    });
    btnNext.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (pdfDoc && pageNum < pdfDoc.numPages) renderPage(pageNum + 1, "next");
    });

    // swipe ringan
    var touchX = 0;
    host.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches && e.touches[0]) touchX = e.touches[0].clientX;
      },
      { passive: true }
    );
    host.addEventListener(
      "touchend",
      function (e) {
        if (!e.changedTouches || !e.changedTouches[0]) return;
        var dx = e.changedTouches[0].clientX - touchX;
        if (dx > 40 && pageNum > 1) renderPage(pageNum - 1, "prev");
        else if (dx < -40 && pdfDoc && pageNum < pdfDoc.numPages) renderPage(pageNum + 1, "next");
      },
      { passive: true }
    );

    loadPdfJs()
      .then(function (lib) {
        var src = normalizePdfUrl(url);
        return lib.getDocument({ url: src, withCredentials: false }).promise;
      })
      .then(function (doc) {
        pdfDoc = doc;
        setLabel();
        renderPage(1);
      })
      .catch(function (err) {
        if (loadingEl) {
          loadingEl.hidden = false;
          loadingEl.innerHTML =
            "PDF tidak bisa dipratinjau di sini (CORS/akses).<br>" +
            '<a href="' +
            String(url).replace(/"/g, "&quot;") +
            '" target="_blank" rel="noopener">Buka di tab baru</a>';
        }
        console.warn("pdf-flip", err);
      });
  }

  global.SHPdfFlip = {
    isPdfUrl: isPdfUrl,
    normalizePdfUrl: normalizePdfUrl,
    mount: mount,
    loadPdfJs: loadPdfJs,
  };
})(window);
