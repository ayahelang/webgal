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
        var wantPw =
          opts.inputType === "password" ||
          opts.password === true ||
          /password|kata sandi|kode akses/i.test(String(opts.title || "") + " " + String(opts.message || ""));
        if (wantPw) {
          input.type = "password";
          input.setAttribute("data-sh-pw", "1");
          input.setAttribute("autocomplete", opts.autocomplete || "current-password");
          try {
            enhancePasswordInput(input);
          } catch (ePw) {}
        } else {
          input.type = "text";
          input.removeAttribute("data-sh-pw");
          // lepas wrap jika ada dari prompt sebelumnya
          if (input.parentElement && input.parentElement.classList.contains("sh-pw-wrap")) {
            var w = input.parentElement;
            w.parentNode.insertBefore(input, w);
            w.remove();
            input.dataset.shPwToggle = "";
            delete input.dataset.shPwToggle;
          }
        }
        setTimeout(function () {
          try { input.focus(); input.select(); } catch (e) {}
        }, 30);
      } else {
        field.hidden = true;
        input.type = "text";
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

  var EYE_SHOW = '<svg class="sh-pw-ico-show" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_HIDE = '<svg class="sh-pw-ico-hide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  function enhancePasswordInput(input) {
    if (!input || input.nodeType !== 1) return;
    if (input.dataset.shPwToggle === "1") return;
    var isPw =
      input.type === "password" ||
      input.getAttribute("data-sh-pw") === "1" ||
      (input.getAttribute("name") === "access_password");
    if (!isPw) return;
    // jangan double-wrap
    if (input.parentElement && input.parentElement.classList.contains("sh-pw-wrap")) {
      input.dataset.shPwToggle = "1";
      return;
    }
    input.dataset.shPwToggle = "1";
    if (input.type !== "password" && input.getAttribute("name") === "access_password") {
      input.type = "password";
    }
    input.classList.add("sh-pw-input");
    var wrap = document.createElement("div");
    wrap.className = "sh-pw-wrap";
    var parent = input.parentNode;
    if (!parent) return;
    parent.insertBefore(wrap, input);
    wrap.appendChild(input);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sh-pw-toggle";
    btn.setAttribute("aria-label", "Tampilkan password");
    btn.setAttribute("title", "Tampilkan / sembunyikan password");
    btn.tabIndex = 0;
    btn.innerHTML = EYE_SHOW + EYE_HIDE;
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.classList.toggle("is-shown", show);
      btn.setAttribute("aria-label", show ? "Sembunyikan password" : "Tampilkan password");
      try {
        input.focus();
      } catch (err) {}
    });
    wrap.appendChild(btn);
  }

  function enhancePasswordFields(root) {
    root = root || document;
    try {
      root.querySelectorAll(
        'input[type="password"], input[name="access_password"], input[data-sh-pw="1"]'
      ).forEach(enhancePasswordInput);
    } catch (e) {}
  }

  function bootPasswordToggles() {
    enhancePasswordFields(document);
    try {
      var mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === "childList") {
            m.addedNodes.forEach(function (n) {
              if (n.nodeType !== 1) return;
              if (n.matches && (n.matches('input[type="password"]') || n.matches('input[name="access_password"]') || n.matches('[data-sh-pw="1"]'))) {
                enhancePasswordInput(n);
              } else if (n.querySelectorAll) {
                enhancePasswordFields(n);
              }
            });
          } else if (m.type === "attributes" && m.target && m.attributeName === "type") {
            if (m.target.type === "password") enhancePasswordInput(m.target);
          }
        }
      });
      mo.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["type"],
      });
    } catch (e2) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootPasswordToggles);
  } else {
    bootPasswordToggles();
  }
  global.SHPasswordToggle = { enhance: enhancePasswordFields, wrap: enhancePasswordInput };

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
    prompt: function (message, defaultValue, title, extra) {
      extra = extra || {};
      if (defaultValue && typeof defaultValue === "object" && !Array.isArray(defaultValue)) {
        extra = defaultValue;
        defaultValue = extra.defaultValue != null ? extra.defaultValue : "";
        title = extra.title || title;
      }
      return openDialog({
        mode: "prompt",
        message: String(message || ""),
        title: title || "Input",
        defaultValue: defaultValue != null ? defaultValue : "",
        okLabel: "OK",
        cancelLabel: "Batal",
        inputType: extra.inputType || (extra.password ? "password" : undefined),
        password: !!extra.password,
        placeholder: extra.placeholder,
        autocomplete: extra.autocomplete,
      });
    },
  };
})(typeof window !== "undefined" ? window : this);
