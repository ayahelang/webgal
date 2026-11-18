/**
 * Login darurat admin via Google Apps Script (Script Properties).
 * Tidak menggantikan login Google normal; hanya cadangan saat Supabase Auth gagal/kuota.
 */
(function (global) {
  "use strict";
  var LS = "sh_admin_emergency_v1";

  function cfg() {
    return global.SH_ADMIN_EMERGENCY || {};
  }

  function readSession() {
    try {
      var raw = localStorage.getItem(LS);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.ok || !o.exp) return null;
      if (Date.now() > Number(o.exp)) {
        localStorage.removeItem(LS);
        return null;
      }
      return o;
    } catch (e) {
      return null;
    }
  }

  function writeSession(meta) {
    var hours = Number((cfg().sessionHours != null ? cfg().sessionHours : 4)) || 4;
    var o = {
      ok: true,
      exp: Date.now() + hours * 60 * 60 * 1000,
      via: "gas",
      label: (meta && meta.label) || cfg().label || "Admin darurat",
      at: Date.now(),
    };
    try {
      localStorage.setItem(LS, JSON.stringify(o));
    } catch (e) {}
    try {
      sessionStorage.setItem("sh_admin_emergency_boot", "1");
    } catch (e2) {}
    return o;
  }

  function clearSession() {
    try {
      localStorage.removeItem(LS);
    } catch (e) {}
  }

  function isActive() {
    return !!readSession();
  }

  function asAuthResult() {
    var s = readSession();
    if (!s) return { ok: false, reason: "not_logged_in" };
    var email = s.label || "admin-darurat@local";
    return {
      ok: true,
      email: email,
      session: {
        user: {
          id: "emergency-admin",
          email: email,
          user_metadata: {
            full_name: email,
            name: "Admin darurat",
          },
        },
      },
      main: true,
      emergency: true,
      via: "gas",
    };
  }

  async function loginWithPassword(password) {
    var url = String((cfg().gasUrl || "").trim());
    if (!url) {
      throw new Error(
        "URL Apps Script belum diisi. Edit data/admin-emergency-config.js (gasUrl) — lihat docs/ADMIN-EMERGENCY-LOGIN.md"
      );
    }
    var pass = String(password || "");
    if (!pass) throw new Error("Masukkan password admin.");

    // text/plain menghindari preflight CORS di banyak browser
    var res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "adminLogin", password: pass }),
      redirect: "follow",
    });
    var text = await res.text();
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // kadang GAS membungkus / redirect HTML
      throw new Error(
        "Respons Apps Script tidak valid. Pastikan Web App di-deploy sebagai \"Anyone\" dan gasUrl benar. Detail: " +
          String(text).slice(0, 120)
      );
    }
    if (!data || !data.ok) {
      throw new Error((data && data.error) || "Password salah atau akses ditolak.");
    }
    return writeSession({ label: data.label || cfg().label });
  }

  function bindGateUI() {
    var form = document.getElementById("adminEmergencyForm");
    if (!form || form.dataset.bound === "1") return;
    form.dataset.bound = "1";
    var input = document.getElementById("adminEmergencyPass");
    var msg = document.getElementById("adminEmergencyMsg");
    var btn = document.getElementById("adminEmergencyBtn");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!btn) return;
      btn.disabled = true;
      if (msg) {
        msg.style.color = "";
        msg.textContent = "Memverifikasi…";
      }
      loginWithPassword(input && input.value)
        .then(function () {
          if (msg) {
            msg.style.color = "#8ff5bd";
            msg.textContent = "Berhasil. Membuka panel…";
          }
          location.reload();
        })
        .catch(function (err) {
          if (msg) {
            msg.style.color = "#ff8a8a";
            msg.textContent = err.message || String(err);
          }
          btn.disabled = false;
        });
    });
  }

  global.SHAdminEmergency = {
    isActive: isActive,
    readSession: readSession,
    clearSession: clearSession,
    loginWithPassword: loginWithPassword,
    asAuthResult: asAuthResult,
    bindGateUI: bindGateUI,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindGateUI);
  } else {
    bindGateUI();
  }
})(typeof window !== "undefined" ? window : this);
