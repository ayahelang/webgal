(function (global) {
  var root = null;
  function ensureRoot() {
    if (root && document.body.contains(root)) return root;
    root = document.createElement("div");
    root.id = "shDialogRoot";
    root.className = "sh-dialog-root";
    root.innerHTML =
      '<div class="sh-dialog-backdrop" data-shd="backdrop"></div>' +
      '<div class="sh-dialog" role="dialog" aria-modal="true">' +
      '  <div class="sh-dialog-title" id="shDialogTitle"></div>' +
      '  <div class="sh-dialog-body" id="shDialogBody"></div>' +
      '  <div class="sh-dialog-field" id="shDialogField" hidden>' +
      '    <input type="text" id="shDialogInput" class="sh-dialog-input" autocomplete="off">' +
      "  </div>" +
      '  <div class="sh-dialog-actions">' +
      '    <button type="button" class="btn btn-ghost" id="shDialogCancel">Batal</button>' +
      '    <button type="button" class="btn btn-primary" id="shDialogOk">OK</button>' +
      "  </div>" +
      "</div>";
    document.body.appendChild(root);
    return root;
  }
  function openDialog(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var el = ensureRoot();
      var title = el.querySelector("#shDialogTitle");
      var body = el.querySelector("#shDialogBody");
      var field = el.querySelector("#shDialogField");
      var input = el.querySelector("#shDialogInput");
      var btnOk = el.querySelector("#shDialogOk");
      var btnCancel = el.querySelector("#shDialogCancel");
      var backdrop = el.querySelector('[data-shd="backdrop"]');
      title.textContent = opts.title || "";
      title.hidden = !opts.title;
      body.textContent = opts.message || "";
      body.hidden = !opts.message;
      var mode = opts.mode || "alert";
      btnCancel.hidden = mode === "alert";
      btnCancel.textContent = opts.cancelLabel || "Batal";
      btnOk.textContent = opts.okLabel || "OK";
      if (mode === "prompt") {
        field.hidden = false;
        input.value = opts.defaultValue != null ? String(opts.defaultValue) : "";
        input.placeholder = opts.placeholder || "";
        setTimeout(function () {
          try { input.focus(); input.select(); } catch (e) {}
        }, 30);
      } else {
        field.hidden = true;
      }
      function close(val) {
        el.classList.remove("is-open");
        btnOk.onclick = null;
        btnCancel.onclick = null;
        backdrop.onclick = null;
        document.removeEventListener("keydown", onKey);
        resolve(val);
      }
      function onKey(ev) {
        if (ev.key === "Escape") {
          ev.preventDefault();
          close(mode === "confirm" ? false : mode === "prompt" ? null : undefined);
        } else if (ev.key === "Enter" && mode === "prompt" && document.activeElement === input) {
          ev.preventDefault();
          close(input.value);
        }
      }
      btnOk.onclick = function () {
        if (mode === "prompt") close(input.value);
        else if (mode === "confirm") close(true);
        else close(undefined);
      };
      btnCancel.onclick = function () {
        if (mode === "prompt") close(null);
        else close(false);
      };
      backdrop.onclick = function () {
        if (mode === "alert") close(undefined);
        else if (mode === "confirm") close(false);
        else close(null);
      };
      document.addEventListener("keydown", onKey);
      el.classList.add("is-open");
    });
  }
  global.SHDialog = {
    alert: function (message, title) {
      return openDialog({ mode: "alert", message: String(message || ""), title: title || "Info", okLabel: "OK" });
    },
    confirm: function (message, title) {
      return openDialog({
        mode: "confirm",
        message: String(message || ""),
        title: title || "Konfirmasi",
        okLabel: "Ya",
        cancelLabel: "Tidak",
      });
    },
    prompt: function (message, defaultValue, title) {
      return openDialog({
        mode: "prompt",
        message: String(message || ""),
        title: title || "Input",
        defaultValue: defaultValue != null ? defaultValue : "",
        okLabel: "OK",
        cancelLabel: "Batal",
      });
    },
  };
})(typeof window !== "undefined" ? window : this);
