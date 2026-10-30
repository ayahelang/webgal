/**
 * SHFloatDrag — buat elemen fixed/floating bisa digeser, posisi tersimpan.
 * Usage: SHFloatDrag.enable(el, { key: "share-bar", handle: el })
 */
(function (global) {
  "use strict";

  function storageKey(key) {
    return "sh_float_pos_" + key;
  }

  function loadPos(key) {
    try {
      return JSON.parse(localStorage.getItem(storageKey(key)) || "null");
    } catch (e) {
      return null;
    }
  }

  function savePos(key, x, y) {
    try {
      localStorage.setItem(storageKey(key), JSON.stringify({ x: x, y: y }));
    } catch (e) {}
  }

  function enable(el, opts) {
    if (!el || el.getAttribute("data-sh-drag") === "1") return;
    opts = opts || {};
    var key = opts.key || el.id || "float";
    var handle = opts.handle || el;
    var exclude = opts.exclude || "a,button,input,select,textarea,label";

    el.setAttribute("data-sh-drag", "1");
    el.style.position = "fixed";
    el.style.touchAction = "none";
    if (!el.style.zIndex) el.style.zIndex = el.style.zIndex || "";

    var pos = loadPos(key);
    if (pos && typeof pos.x === "number" && typeof pos.y === "number") {
      el.style.left = pos.x + "px";
      el.style.top = pos.y + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
    }

    var dragging = false;
    var ox = 0,
      oy = 0;

    function point(ev) {
      if (ev.touches && ev.touches[0])
        return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
      return { x: ev.clientX, y: ev.clientY };
    }

    function onDown(ev) {
      if (ev.target && ev.target.closest && exclude) {
        try {
          if (ev.target.closest(exclude) && ev.target.closest(exclude) !== handle)
            return;
        } catch (e) {}
      }
      // jangan drag dari link/button di dalam (kecuali handle = seluruh el dan exclude)
      if (ev.target && ev.target.closest) {
        var skip = ev.target.closest("a,button,input,select,textarea");
        if (skip && handle !== el) return;
        if (skip && handle === el && skip !== el) return;
      }
      dragging = true;
      var r = el.getBoundingClientRect();
      var p = point(ev);
      ox = p.x - r.left;
      oy = p.y - r.top;
      el.classList.add("is-dragging");
      try {
        el.setPointerCapture && ev.pointerId != null && el.setPointerCapture(ev.pointerId);
      } catch (e) {}
      ev.preventDefault();
    }

    function onMove(ev) {
      if (!dragging) return;
      var p = point(ev);
      var x = Math.max(0, Math.min(window.innerWidth - 40, p.x - ox));
      var y = Math.max(0, Math.min(window.innerHeight - 40, p.y - oy));
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
      ev.preventDefault();
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("is-dragging");
      var r = el.getBoundingClientRect();
      savePos(key, r.left, r.top);
    }

    handle.style.cursor = handle.style.cursor || "grab";
    handle.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function enableSelector(sel, opts) {
    var el = document.querySelector(sel);
    if (el) enable(el, opts);
  }

  function bootKnown() {
    enableSelector("#sh-share-bar", { key: "share-bar" });
    enableSelector("#sh-float-stats", { key: "float-stats" });
    enableSelector("#shHealthBtn", { key: "health-btn" });
    enableSelector(".chat-win-restore", { key: "chat-restore" });
    enableSelector("#shChatFloatWrap", {
      key: "chat-float",
      handle: document.getElementById("shChatFloatBar") || undefined,
    });
    // announcement float buttons
    document.querySelectorAll(".sh-ann-float-btn").forEach(function (btn, i) {
      enable(btn, { key: "ann-btn-" + (btn.id || i) });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(bootKnown, 400);
    });
  } else {
    setTimeout(bootKnown, 400);
  }
  // late widgets
  setTimeout(bootKnown, 1500);
  setTimeout(bootKnown, 4000);

  global.SHFloatDrag = { enable: enable, enableSelector: enableSelector, bootKnown: bootKnown };
})(window);
