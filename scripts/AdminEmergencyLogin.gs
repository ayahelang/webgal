/**
 * Silverhawk WebGal — Login darurat admin
 *
 * SETUP:
 * 1. Google Drive → New → Apps Script, tempel seluruh file ini.
 * 2. Project Settings → Script Properties → Add:
 *      ADMIN_EMERGENCY_PASSWORD = (password rahasia Anda)
 *      (opsional) ADMIN_EMERGENCY_LABEL = Admin darurat
 * 3. Deploy → New deployment → Type: Web app
 *      Execute as: Me
 *      Who has access: Anyone
 * 4. Salin URL Web App ke data/admin-emergency-config.js → gasUrl
 *
 * Keamanan: password HANYA di Script Properties, bukan di repo GitHub.
 */

function doPost(e) {
  return handle_(e);
}

function doGet(e) {
  // GET hanya untuk uji: ?ping=1
  if (e && e.parameter && e.parameter.ping === "1") {
    return json_({ ok: true, service: "webgal-admin-emergency", ts: Date.now() });
  }
  return json_({ ok: false, error: "Gunakan POST JSON { action:\"adminLogin\", password:\"...\" }" });
}

function handle_(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      body = e.parameter;
    }
    var action = String(body.action || "");
    if (action !== "adminLogin") {
      return json_({ ok: false, error: "action tidak dikenal" });
    }
    var props = PropertiesService.getScriptProperties();
    var expected = props.getProperty("ADMIN_EMERGENCY_PASSWORD");
    if (!expected) {
      return json_({ ok: false, error: "ADMIN_EMERGENCY_PASSWORD belum di-set di Script Properties" });
    }
    var given = String(body.password || "");
    if (!given || given !== expected) {
      // jeda kecil anti brute-force kasar
      Utilities.sleep(400);
      return json_({ ok: false, error: "Password salah" });
    }
    var label = props.getProperty("ADMIN_EMERGENCY_LABEL") || "Admin darurat";
    return json_({
      ok: true,
      label: label,
      expHintHours: 4,
    });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
