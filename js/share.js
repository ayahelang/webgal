/**
 * Tombol bagikan gallery via WhatsApp & Gmail
 */
(function () {
  const SHARE_URL = "https://webgal.silverhawk.web.id/";
  const SHARE_TITLE = "Silverhawk Student Web Gallery";
  const SHARE_TEXT =
    "Lihat karya website santriwati di Silverhawk Student Web Gallery — portfolio digital, video, dan apresiasi karya.";

  function build() {
    if (document.getElementById("sh-share-bar")) return;
    const bar = document.createElement("div");
    bar.id = "sh-share-bar";
    bar.innerHTML = `
      <span class="sh-share-label">Bagikan</span>
      <a class="sh-share-btn sh-wa" href="#" target="_blank" rel="noopener" title="Bagikan via WhatsApp" aria-label="WhatsApp">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M17.47 14.38c-.28-.14-1.64-.81-1.9-.9-.25-.1-.44-.14-.62.14-.18.28-.71.9-.87 1.08-.16.18-.32.2-.6.07-.28-.14-1.17-.43-2.23-1.37-.82-.73-1.38-1.64-1.54-1.92-.16-.28-.02-.43.12-.57.13-.13.28-.32.42-.48.14-.16.18-.28.28-.46.1-.18.05-.34-.02-.48-.07-.14-.62-1.49-.85-2.04-.22-.53-.45-.46-.62-.47h-.53c-.18 0-.48.07-.73.34-.25.28-.96.94-.96 2.3 0 1.36.98 2.67 1.12 2.85.14.18 1.93 2.95 4.68 4.13.65.28 1.16.45 1.56.58.66.21 1.26.18 1.73.11.53-.08 1.64-.67 1.87-1.32.23-.65.23-1.2.16-1.32-.07-.11-.25-.18-.53-.32z"/><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12c0 1.77.46 3.43 1.27 4.87L2.05 22l5.27-1.38A9.96 9.96 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.6 0-3.09-.47-4.34-1.28l-.31-.18-3.13.82.84-3.05-.2-.33A7.96 7.96 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/></svg>
        WA
      </a>
      <a class="sh-share-btn sh-mail" href="#" target="_blank" rel="noopener" title="Bagikan via Gmail" aria-label="Gmail">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"/></svg>
        Email
      </a>
    `;
    document.body.appendChild(bar);

    const pageUrl = location.href.split("#")[0];
    const text = SHARE_TEXT + "\n" + pageUrl;
    const wa = bar.querySelector(".sh-wa");
    const mail = bar.querySelector(".sh-mail");
    wa.href =
      "https://wa.me/?text=" + encodeURIComponent(text);
    mail.href =
      "https://mail.google.com/mail/?view=cm&fs=1&su=" +
      encodeURIComponent(SHARE_TITLE) +
      "&body=" +
      encodeURIComponent(text);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
