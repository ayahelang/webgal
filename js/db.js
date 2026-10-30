/**
 * Silverhawk Gallery — data layer
 */
(function (global) {
  function cfg() {
    return global.GALLERY_SUPABASE || {};
  }
  function enabled() {
    const c = cfg();
    return !!(c.url && c.anonKey && String(c.url).trim() && String(c.anonKey).trim());
  }
  function client() {
    if (!enabled()) return null;
    if (!global.supabase || !global.supabase.createClient) return null;
    if (!global.__gallerySb) {
      global.__gallerySb = global.supabase.createClient(
        String(cfg().url).replace(/\/$/, ""),
        cfg().anonKey
      );
    }
    return global.__gallerySb;
  }

  function normLabel(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
  function normUrl(u) {
    return String(u || "").trim().replace(/\/+$/, "").toLowerCase();
  }
  function cleanWorkTitle(title, url) {
    let t = String(title || "")
      .replace(/\s*[·•\-–|]\s*Domain\s*$/i, "")
      .replace(/\bDomain\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!t) {
      try {
        t = new URL(url).hostname.replace(/^www\./, "");
      } catch (e) {
        t = "Website";
      }
    }
    return t;
  }

  const MAIN_ANGKATAN = ["angkatan-2024", "angkatan-2025"];
  const CLASS_OPTIONS = ["51", "52"];

  async function getSubmitCode() {
    const sb = client();
    if (!sb) return cfg().defaultSubmitCode || "";
    const { data, error } = await sb.from("gallery_settings").select("value").eq("key", "submit_code").maybeSingle();
    if (error) throw error;
    return (data && data.value) || cfg().defaultSubmitCode || "";
  }

  async function listAngkatan({ mainOnly } = { mainOnly: true }) {
    const sb = client();
    if (!sb) return [];
    const { data, error } = await sb.from("gallery_angkatan").select("id,label,label_norm,created_at").order("label");
    if (error) throw error;
    let rows = data || [];
    if (mainOnly !== false) {
      rows = rows.filter((a) => MAIN_ANGKATAN.includes(a.label_norm) || /^angkatan-20\d{2}$/.test(a.label_norm));
      // prefer exact main labels first
      rows.sort((a, b) => a.label.localeCompare(b.label));
    }
    return rows;
  }

  async function ensureAngkatan(label) {
    const sb = client();
    if (!sb) throw new Error("Database belum dikonfigurasi");
    const clean = String(label || "").trim();
    if (!clean) throw new Error("Nama angkatan wajib");
    const ln = normLabel(clean);
    const { data: existing } = await sb.from("gallery_angkatan").select("id,label,label_norm").eq("label_norm", ln).maybeSingle();
    if (existing) return { row: existing, created: false };
    const { data, error } = await sb
      .from("gallery_angkatan")
      .insert({ label: clean, label_norm: ln, source: "alumni" })
      .select("id,label,label_norm")
      .single();
    if (error) {
      if (error.code === "23505") {
        const { data: again } = await sb.from("gallery_angkatan").select("id,label,label_norm").eq("label_norm", ln).maybeSingle();
        if (again) return { row: again, created: false };
      }
      throw error;
    }
    return { row: data, created: true };
  }

  async function submitAlumni({ code, name, angkatanId, classCode, createNew, angkatanLabel, websites }) {
    const sb = client();
    if (!sb) throw new Error("Database belum dikonfigurasi.");
    const expected = await getSubmitCode();
    if (!code || String(code).trim() !== String(expected).trim()) throw new Error("Kode akses salah.");
    const nm = String(name || "").trim();
    if (nm.length < 2) throw new Error("Nama terlalu pendek.");
    const cls = String(classCode || "").trim();
    if (!CLASS_OPTIONS.includes(cls)) throw new Error("Pilih kelas 51 atau 52.");

    const links = (websites || [])
      .map((w) => ({
        title: String(w.title || "Website").trim() || "Website",
        url: String(w.url || "").trim(),
        category: String(w.category || "Web Kreatif").trim() || "Web Kreatif",
      }))
      .filter((w) => /^https?:\/\//i.test(w.url));
    if (!links.length) throw new Error("Minimal satu URL website valid.");

    let aid = angkatanId;
    if (createNew) {
      const { row } = await ensureAngkatan(angkatanLabel);
      aid = row.id;
    }
    if (!aid) throw new Error("Pilih angkatan.");

    const nameNorm = normLabel(nm);
    // unique per name + angkatan (class stored on row)
    let alumniId;
    const { data: existAl } = await sb
      .from("gallery_alumni")
      .select("id,class_code")
      .eq("name_norm", nameNorm)
      .eq("angkatan_id", aid)
      .maybeSingle();
    if (existAl) {
      alumniId = existAl.id;
      await sb.from("gallery_alumni").update({ class_code: cls }).eq("id", alumniId);
    } else {
      const { data: al, error: e1 } = await sb
        .from("gallery_alumni")
        .insert({
          name: nm,
          name_norm: nameNorm,
          angkatan_id: aid,
          class_code: cls,
          role: "Alumni",
        })
        .select("id")
        .single();
      if (e1) throw e1;
      alumniId = al.id;
    }

    let added = 0;
    for (const w of links) {
      const { error } = await sb.from("gallery_websites").insert({
        alumni_id: alumniId,
        title: cleanWorkTitle(w.title, w.url),
        url: w.url,
        category: w.category,
        description: "Ditambahkan via form gallery.",
      });
      if (error) {
        if (error.code === "23505") continue;
        throw error;
      }
      added++;
    }
    return { alumniId, added, skipped: links.length - added };
  }

  let __galleryCache = null;
  let __galleryCacheAt = 0;
  const GALLERY_CACHE_MS = 60 * 1000;

  async function fetchGalleryFromDb(opts) {
    opts = opts || {};
    if (!opts.force && __galleryCache && Date.now() - __galleryCacheAt < GALLERY_CACHE_MS) {
      return __galleryCache;
    }
    const sb = client();
    if (!sb) return null;
    const { data: alumni, error: e1 } = await sb
      .from("gallery_alumni")
      .select("id,name,school,role,legacy_id,class_code,angkatan_id,avatar_emoji");
    if (e1) throw e1;
    if (!alumni || !alumni.length) return { students: [] };

    const { data: angkatan, error: e2 } = await sb.from("gallery_angkatan").select("id,label,label_norm");
    if (e2) throw e2;
    const angMap = Object.fromEntries((angkatan || []).map((a) => [a.id, a]));

    const { data: websites, error: e3 } = await sb
      .from("gallery_websites")
      .select("id,alumni_id,title,url,category,description,tags");
    if (e3) throw e3;
    const byAlumni = {};
    (websites || []).forEach((w) => {
      if (!byAlumni[w.alumni_id]) byAlumni[w.alumni_id] = [];
      byAlumni[w.alumni_id].push(w);
    });

    // kontak + foto dari profil (alumni_id ATAU nama+angkatan)
    let contactByAlumni = {};
    let contactByNameYear = {};
    function nameKey(name, year) {
      return String(name || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ") +
        "|" +
        String(year || "").trim();
    }
    try {
      let profiles = null;
      // ambil profil yang sudah taut nama (bukan hanya yg punya alumni_id)
      let pr = await sb
        .from("gallery_profiles")
        .select(
          "linked_alumni_id,linked_student_name,linked_angkatan_year,linked_class_code,contact_wa,contact_ig,contact_fb,contact_twitter,contact_tiktok,contact_privacy,qris_image_url,avatar_url,profile_photo_url,display_name"
        )
        .not("linked_student_name", "is", null)
        .neq("linked_student_name", "");
      if (pr.error) {
        pr = await sb
          .from("gallery_profiles")
          .select(
            "linked_alumni_id,linked_student_name,linked_angkatan_year,linked_class_code,contact_wa,contact_ig,contact_fb,contact_twitter,contact_tiktok,contact_privacy,qris_image_url,avatar_url,profile_photo_url,display_name"
          )
          .not("linked_alumni_id", "is", null);
        if (pr.error) {
          pr = await sb
            .from("gallery_profiles")
            .select(
              "linked_alumni_id,linked_student_name,linked_angkatan_year,linked_class_code,contact_wa,contact_ig,contact_fb,contact_twitter,contact_tiktok,contact_privacy,qris_image_url,avatar_url"
            )
            .not("linked_alumni_id", "is", null);
          if (pr.error) {
            pr = await sb
              .from("gallery_profiles")
              .select(
                "linked_alumni_id,linked_student_name,linked_angkatan_year,linked_class_code,contact_wa,contact_ig,contact_fb,contact_twitter,contact_tiktok,contact_privacy"
              )
              .not("linked_alumni_id", "is", null);
          }
        }
      }
      profiles = pr.data;
      (profiles || []).forEach((p) => {
        if (p.linked_alumni_id) contactByAlumni[p.linked_alumni_id] = p;
        if (p.linked_student_name) {
          contactByNameYear[nameKey(p.linked_student_name, p.linked_angkatan_year)] = p;
        }
      });
    } catch (e) {
      console.warn("contact load", e);
    }

    const students = alumni
      .map((a) => {
        const ang = angMap[a.angkatan_id] || {};
        const classCode = a.class_code || "—";
        let angkatanYear = "";
        const m = String(ang.label || "").match(/20\d{2}/);
        if (m) angkatanYear = m[0];
        const seenUrl = new Set();
        const works = [];
        (byAlumni[a.id] || []).forEach((w) => {
          const u = normUrl(w.url);
          if (!u || seenUrl.has(u)) return;
          seenUrl.add(u);
          works.push({
            id: w.id,
            title: w.title,
            url: w.url,
            category: w.category || "Web Kreatif",
            tags: w.tags || [],
            description: w.description || "",
            thumb: "",
          });
        });
        // prioritaskan match alumni_id, lalu nama+tahun, lalu nama saja
        let c =
          contactByAlumni[a.id] ||
          contactByNameYear[nameKey(a.name, angkatanYear)] ||
          contactByNameYear[nameKey(a.name, "")] ||
          {};
        if (!c || (!c.profile_photo_url && !c.avatar_url)) {
          // cari profil dengan nama sama (abaikan tahun) yang punya foto
          const want = String(a.name || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");
          for (const k of Object.keys(contactByNameYear)) {
            if (k.split("|")[0] === want) {
              const cand = contactByNameYear[k];
              if (cand && (cand.profile_photo_url || cand.avatar_url)) {
                c = cand;
                break;
              }
            }
          }
        }
        // foto: hotlink kustom → avatar Google (jangan kosong hanya karena hotlink "")
        const customPhoto = String(c.profile_photo_url || "").trim();
        const googlePhoto = String(c.avatar_url || "").trim();
        const photoUrl = optimizePhotoUrl(customPhoto || googlePhoto || "");
        return {
          id: a.legacy_id || a.id,
          name: a.name,
          class: classCode,
          classLabel: `Kelas ${classCode} · ${ang.label || ""}`.trim(),
          angkatan: angkatanYear,
          angkatanLabel: ang.label || "",
          school: a.school || "SMA PMA",
          role: a.role || "Alumni",
          aiTool: "",
          avatar: a.avatar_emoji || "🎓",
          photoUrl,
          works,
          _dbId: a.id,
          contact: {
            wa: c.contact_wa || "",
            ig: c.contact_ig || "",
            fb: c.contact_fb || "",
            twitter: c.contact_twitter || "",
            tiktok: c.contact_tiktok || "",
            privacy: c.contact_privacy || {},
          },
          qrisImageUrl: c.qris_image_url || "",
        };
      })
      .filter((s) => s.works && s.works.length);

    const out = {
      meta: { title: "Gallery", source: "database", updated: new Date().toISOString().slice(0, 10) },
      students,
    };
    __galleryCache = out;
    __galleryCacheAt = Date.now();
    return out;
  }

  function defaultContactPrivacy(classCode, year) {
    return {
      wa: {
        public: false,
        allStudents: false,
        angkatan: {},
        classes: {},
        names: {},
        // default: sekelas
        classmatesOnly: true,
        classCode: String(classCode || ""),
        year: String(year || ""),
      },
      social: { public: true },
    };
  }

  async function updateMyContact({ wa, ig, fb, twitter, tiktok, privacy, qrisImageUrl, profilePhotoUrl }) {
    const sb = client();
    const session = await getSession();
    if (!session || !session.user) throw new Error("Belum login");
    const qris = String(qrisImageUrl || "").trim().slice(0, 500);
    const photo = String(profilePhotoUrl || "").trim().slice(0, 500);
    const payload = {
      contact_wa: String(wa || "").trim().slice(0, 32),
      contact_ig: String(ig || "").trim().slice(0, 120),
      contact_fb: String(fb || "").trim().slice(0, 120),
      contact_twitter: String(twitter || "").trim().slice(0, 120),
      contact_tiktok: String(tiktok || "").trim().slice(0, 120),
      contact_privacy: privacy || {},
      updated_at: new Date().toISOString(),
    };
    if (qris === "" || /^https?:\/\//i.test(qris)) {
      payload.qris_image_url = qris;
    }
    if (photo === "" || /^https?:\/\//i.test(photo)) {
      payload.profile_photo_url = photo;
    }
    const { data, error } = await sb
      .from("gallery_profiles")
      .update(payload)
      .eq("id", session.user.id)
      .select("*")
      .single();
    if (error) {
      // kolom belum ada di database — simpan tanpa kolom bermasalah
      let p2 = { ...payload };
      if (String(error.message || "").includes("qris_image_url")) delete p2.qris_image_url;
      if (String(error.message || "").includes("profile_photo_url")) delete p2.profile_photo_url;
      const r2 = await sb.from("gallery_profiles").update(p2).eq("id", session.user.id).select("*").single();
      if (r2.error) throw r2.error;
      try { __galleryCache = null; __galleryCacheAt = 0; } catch (e) {}
      return r2.data;
    }
    try { __galleryCache = null; __galleryCacheAt = 0; } catch (e) {}
    return data;
  }

  /** viewerCtx: { loggedIn, name, year, classCode } */
  function canViewContact(field, contact, owner, viewer) {
    const priv = (contact && contact.privacy) || {};
    if (field === "wa") {
      const w = priv.wa || {};
      if (w.public) return true;
      if (!viewer || !viewer.loggedIn) return false;
      if (w.allStudents) return true;
      if (w.classmatesOnly) {
        return (
          String(viewer.year) === String(w.year || owner.angkatan) &&
          String(viewer.classCode) === String(w.classCode || owner.class)
        );
      }
      const y = String(owner.angkatan || "");
      const c = String(owner.class || "");
      if (w.angkatan && w.angkatan[y]) return true;
      const ck = y + "-" + c;
      if (w.classes && w.classes[ck]) return true;
      if (w.names && viewer.name && w.names[normLabel(viewer.name)]) return true;
      // tree partial: selected names only
      if (w.names && Object.keys(w.names).some((k) => w.names[k])) {
        return !!(viewer.name && w.names[normLabel(viewer.name)]);
      }
      return false;
    }
    // social default public
    const s = priv.social || { public: true };
    if (s.public !== false) return true;
    if (!viewer || !viewer.loggedIn) return false;
    return true;
  }


  function mergeGallery(jsonData, dbData) {
    const base = jsonData && jsonData.students ? jsonData : { meta: {}, students: [] };
    const extra = dbData && dbData.students ? dbData.students : [];
    const urlOwner = new Map();
    const students = base.students.map((s) => {
      const copy = {
        ...s,
        angkatan: s.angkatan || "2025",
        classLabel: s.classLabel || `Kelas ${s.class} · Angkatan 2025`,
        works: (s.works || []).map((w) => ({ ...w })),
      };
      copy.works.forEach((w) => urlOwner.set(normUrl(w.url), true));
      return copy;
    });
    const byKey = new Map();
    students.forEach((s) => byKey.set(normLabel(s.name) + "|" + String(s.class), s));

    extra.forEach((s) => {
      const key = normLabel(s.name) + "|" + String(s.class);
      let target = byKey.get(key);
      if (!target) {
        for (const [k, st] of byKey) {
          if (k.startsWith(normLabel(s.name) + "|")) {
            target = st;
            break;
          }
        }
      }
      if (!target) {
        const neu = { ...s, works: [] };
        students.push(neu);
        byKey.set(key, neu);
        target = neu;
      }
      (s.works || []).forEach((w) => {
        const u = normUrl(w.url);
        if (!u || urlOwner.has(u)) return;
        urlOwner.set(u, true);
        target.works.push({ ...w });
      });
    });
    return {
      meta: { ...(base.meta || {}), source: "JSON + Supabase (merged)", updated: new Date().toISOString().slice(0, 10) },
      students,
    };
  }

  // ----- Auth admin (Supabase Google) -----
  function isAdminEmail(email) {
    const list = (cfg().adminEmails || []).map((e) => String(e).toLowerCase().trim());
    return list.includes(String(email || "").toLowerCase().trim());
  }

  async function getSession() {
    const sb = client();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session || null;
  }

  async function signInWithGoogle(opts) {
    const sb = client();
    if (!sb) throw new Error("Database belum dikonfigurasi");
    const o = opts || {};
    // simpan tujuan kembali
    try {
      if (o.returnTo) sessionStorage.setItem("sh_return", o.returnTo);
      else if (!sessionStorage.getItem("sh_return")) {
        sessionStorage.setItem("sh_return", location.href);
      }
    } catch (e) {}
    let redirectTo = o.redirectTo;
    if (!redirectTo) {
      // kembali ke halaman profil setelah OAuth (bukan selalu admin)
      const base = location.origin + location.pathname.replace(/[^/]+$/, "");
      redirectTo = base + "profile.html";
    }
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams: { prompt: "select_account" } },
    });
    if (error) throw error;
  }

  function getReturnUrl() {
    try {
      return sessionStorage.getItem("sh_return") || "";
    } catch (e) {
      return "";
    }
  }
  function clearReturnUrl() {
    try {
      sessionStorage.removeItem("sh_return");
    } catch (e) {}
  }
  function goLogin(returnTo) {
    try {
      sessionStorage.setItem("sh_return", returnTo || location.href);
    } catch (e) {}
    location.href = "profile.html?login=1";
  }

  async function signOut() {
    const sb = client();
    if (sb) await sb.auth.signOut();
  }

  async function requireAdmin() {
    const session = await getSession();
    if (!session || !session.user) return { ok: false, reason: "not_logged_in" };
    const email = session.user.email || "";
    try { await upsertMyProfileFromSession(); } catch (e) { console.warn(e); }
    if (isAdminEmail(email)) return { ok: true, email, session, main: true };
    try {
      const prof = await getMyProfile();
      if (prof && prof.is_admin) return { ok: true, email, session, main: false, permissions: prof.permissions || {} };
    } catch (e) {}
    return { ok: false, reason: "forbidden", email };
  }

  // ----- Admin CRUD helpers -----
  async function adminListAlumni() {
    const sb = client();
    const { data, error } = await sb
      .from("gallery_alumni")
      .select("id,name,class_code,role,angkatan_id,created_at, gallery_angkatan(label)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }
  async function adminDeleteAlumni(id) {
    const sb = client();
    const { error } = await sb.from("gallery_alumni").delete().eq("id", id);
    if (error) throw error;
  }
  async function adminListWebsites() {
    const sb = client();
    const { data, error } = await sb
      .from("gallery_websites")
      .select("id,title,url,category,alumni_id,created_at, gallery_alumni(name,class_code,angkatan_id, gallery_angkatan(label))")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw error;
    return data || [];
  }
  async function adminDeleteWebsite(id) {
    const sb = client();
    const { error } = await sb.from("gallery_websites").delete().eq("id", id);
    if (error) throw error;
  }
  async function adminListAngkatanAll() {
    return listAngkatan({ mainOnly: false });
  }
  async function adminDeleteAngkatan(id) {
    const sb = client();
    const { error } = await sb.from("gallery_angkatan").delete().eq("id", id);
    if (error) throw error;
  }

  async function adminUpsertAngkatan({ id, label }) {
    const sb = client();
    const clean = String(label || "").trim();
    if (!clean) throw new Error("Label angkatan wajib");
    const ln = normLabel(clean);
    if (id) {
      const { data, error } = await sb.from("gallery_angkatan").update({ label: clean, label_norm: ln }).eq("id", id).select("*").single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await sb.from("gallery_angkatan").insert({ label: clean, label_norm: ln, source: "admin" }).select("*").single();
    if (error) throw error;
    return data;
  }

  async function adminUpsertAlumni({ id, name, classCode, angkatanId, role }) {
    const sb = client();
    const nm = String(name || "").trim();
    if (nm.length < 2) throw new Error("Nama terlalu pendek");
    const cls = String(classCode || "").trim();
    const payload = {
      name: nm,
      name_norm: nm.toLowerCase().replace(/\s+/g, " "),
      class_code: cls || null,
      angkatan_id: angkatanId || null,
      role: String(role || "Santriwati").trim() || "Santriwati",
    };
    if (id) {
      const { data, error } = await sb.from("gallery_alumni").update(payload).eq("id", id).select("id,name,class_code,role,angkatan_id").single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await sb.from("gallery_alumni").insert(payload).select("id,name,class_code,role,angkatan_id").single();
    if (error) throw error;
    return data;
  }

  async function adminUpsertWebsite({ id, title, url, category, alumniId }) {
    const sb = client();
    const t = String(title || "").trim() || "Website";
    const u = String(url || "").trim();
    if (!/^https?:\/\//i.test(u)) throw new Error("URL harus http(s)");
    if (!alumniId && !id) throw new Error("Pilih alumni pemilik website");
    const payload = {
      title: t,
      url: u,
      category: String(category || "Web Kreatif").trim() || "Web Kreatif",
    };
    if (alumniId) payload.alumni_id = alumniId;
    if (id) {
      const { data, error } = await sb.from("gallery_websites").update(payload).eq("id", id).select("*").single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await sb.from("gallery_websites").insert(payload).select("*").single();
    if (error) throw error;
    return data;
  }

  async function adminUpdateVideo(id, { title, url, categoryId, description, ownerName }) {
    const sb = client();
    const parsed = assertPlayableVideoUrl(url);
    const patch = {
      title: title || "Video",
      url,
      platform: parsed.platform,
      embed_url: parsed.embed_url,
      category_id: categoryId || null,
      description: description || "",
    };
    if (ownerName !== undefined) {
      const on = String(ownerName || "").trim();
      patch.owner_name = on ? on.slice(0, 120) : null;
    }
    const { data, error } = await sb.from("gallery_videos").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return data;
  }

  // ----- Videos -----
  function parseVideoUrl(url) {
    const u = String(url || "").trim();
    let platform = "other";
    let embed = u;
    let id = null;
    let playable = true;
    let play_mode = "iframe"; // iframe | video | link
    let hint = "";

    // File video langsung (CDN IG/FB, .mp4, dll.)
    const isDirectVideo =
      /\.(mp4|webm|ogg|m4v)(\?|#|$)/i.test(u) ||
      /fbcdn\.net\/.*\.mp4/i.test(u) ||
      /cdninstagram\.com\/.*\.mp4/i.test(u) ||
      /instagram\.[a-z0-9.-]+\.fna\.fbcdn\.net\/.*\.mp4/i.test(u) ||
      /scontent[a-z0-9.-]*\.cdninstagram\.com\/.*\.mp4/i.test(u);
    if (isDirectVideo) {
      return {
        platform: "direct",
        embed_url: u,
        id: null,
        playable: true,
        play_mode: "video",
        hint: "",
      };
    }

    let m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
    if (m) {
      return {
        platform: "youtube",
        embed_url: "https://www.youtube.com/embed/" + m[1],
        id: m[1],
        playable: true,
        play_mode: "iframe",
        hint: "",
      };
    }

    m = u.match(/dailymotion\.com\/(?:video|embed\/video)\/([a-zA-Z0-9]+)/i) || u.match(/dai\.ly\/([a-zA-Z0-9]+)/i);
    if (m) {
      return {
        platform: "dailymotion",
        embed_url: "https://www.dailymotion.com/embed/video/" + m[1],
        id: m[1],
        playable: true,
        play_mode: "iframe",
        hint: "",
      };
    }

    // TikTok — embed resmi
    if (/tiktok\.com\//i.test(u)) {
      platform = "tiktok";
      m = u.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i) || u.match(/tiktok\.com\/.*?\/video\/(\d+)/i) || u.match(/[?&]item_id=(\d+)/i);
      if (m) {
        id = m[1];
        embed = "https://www.tiktok.com/embed/v2/" + id;
        return { platform, embed_url: embed, id, playable: true, play_mode: "iframe", hint: "" };
      }
      // vm.tiktok.com short links — buka sumber
      return {
        platform,
        embed_url: u,
        id: null,
        playable: true,
        play_mode: "link",
        hint: "Link pendek TikTok: buka dulu di browser, salin URL penuh berbentuk tiktok.com/@user/video/ANGKA.",
      };
    }

    // Instagram post/reel — embed path
    if (/instagram\.com\//i.test(u)) {
      platform = "instagram";
      m = u.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
      if (m) {
        id = m[1];
        const kind = (u.match(/instagram\.com\/(p|reel|tv)\//i) || [])[1] || "p";
        embed = "https://www.instagram.com/" + kind + "/" + id + "/embed";
        return {
          platform,
          embed_url: embed,
          id,
          playable: true,
          play_mode: "iframe",
          hint: "Jika embed IG kosong, gunakan URL file .mp4 langsung dari unduhan.",
        };
      }
      return {
        platform,
        embed_url: u,
        id: null,
        playable: false,
        play_mode: "none",
        hint:
          "Link Instagram tidak dikenali. Gunakan https://www.instagram.com/reel/KODE/ atau https://www.instagram.com/p/KODE/ atau URL .mp4 langsung.",
      };
    }

    // Twitter / X
    if (/(?:twitter\.com|x\.com)\//i.test(u)) {
      platform = "twitter";
      m = u.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/i);
      if (m) {
        id = m[1];
        embed = "https://platform.twitter.com/embed/Tweet.html?id=" + id;
        return {
          platform,
          embed_url: embed,
          id,
          playable: true,
          play_mode: "iframe",
          hint: "Jika video X tidak muncul, buka lewat tombol sumber.",
        };
      }
      return {
        platform,
        embed_url: u,
        id: null,
        playable: false,
        play_mode: "none",
        hint: "Gunakan link postingan penuh: https://x.com/user/status/ANGKA",
      };
    }

    // Facebook
    if (/facebook\.com\/|fb\.watch\//i.test(u)) {
      platform = "facebook";
      let href = u.split("#")[0];
      let fm = href.match(/facebook\.com\/reel\/(\d+)/i);
      if (fm) {
        id = fm[1];
        href = "https://www.facebook.com/reel/" + id + "/";
        embed =
          "https://www.facebook.com/plugins/video.php?href=" +
          encodeURIComponent(href) +
          "&show_text=0&width=560";
        return {
          platform,
          embed_url: embed,
          id,
          playable: true,
          play_mode: "iframe",
          hint: "Facebook sering memblokir putar di situs lain. Jika 'Video unavailable', buka sumber atau pakai URL .mp4.",
        };
      }
      if ((fm = href.match(/facebook\.com\/(?:[^/]+\/)?videos\/(?:[^/]+\/)?(\d+)/i))) {
        id = fm[1];
        href = "https://www.facebook.com/video.php?v=" + id;
        embed =
          "https://www.facebook.com/plugins/video.php?href=" +
          encodeURIComponent(href) +
          "&show_text=0&width=560";
        return { platform, embed_url: embed, id, playable: true, play_mode: "iframe", hint: "" };
      }
      if ((fm = href.match(/facebook\.com\/watch\/?\?v=(\d+)/i))) {
        id = fm[1];
        href = "https://www.facebook.com/video.php?v=" + id;
        embed =
          "https://www.facebook.com/plugins/video.php?href=" +
          encodeURIComponent(href) +
          "&show_text=0&width=560";
        return { platform, embed_url: embed, id, playable: true, play_mode: "iframe", hint: "" };
      }
      // share/v — tidak andal
      return {
        platform,
        embed_url: u,
        id: null,
        playable: false,
        play_mode: "none",
        hint:
          "Link Facebook share/v tidak bisa diputar di galeri. Buka di browser → salin URL akhir (facebook.com/reel/ANGKA atau watch?v=ANGKA), atau gunakan URL file .mp4.",
      };
    }

    return {
      platform: "other",
      embed_url: u,
      id: null,
      playable: false,
      play_mode: "none",
      hint:
        "Format tidak dikenali. Gunakan YouTube, Dailymotion, TikTok (/video/ANGKA), Instagram (/reel/KODE), X (/status/ANGKA), Facebook reel/ID, atau URL .mp4.",
    };
  }

  function assertPlayableVideoUrl(url) {
    const parsed = parseVideoUrl(url);
    if (parsed.platform === "other" || parsed.playable === false) {
      throw new Error(
        parsed.hint ||
          "Link tidak bisa diputar di galeri. Gunakan YouTube, Dailymotion, reel Facebook (…/reel/ANGKA), atau URL .mp4 langsung."
      );
    }
    return parsed;
  }

  /** Best-effort static thumbnail without network (YouTube / Dailymotion). */
  function videoThumbnailHint(url) {
    const p = parseVideoUrl(url);
    if (p.platform === "youtube" && p.id) {
      return "https://img.youtube.com/vi/" + p.id + "/hqdefault.jpg";
    }
    if (p.platform === "dailymotion" && p.id) {
      return "https://www.dailymotion.com/thumbnail/video/" + p.id;
    }
    return "";
  }

  async function fetchVideoMeta(url) {
    const parsed = parseVideoUrl(url);
    const tryUrls = [];
    if (parsed.platform === "youtube") {
      tryUrls.push("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(url));
    } else if (parsed.platform === "dailymotion") {
      tryUrls.push("https://www.dailymotion.com/services/oembed?url=" + encodeURIComponent(url));
    } else if (parsed.platform === "tiktok") {
      tryUrls.push("https://www.tiktok.com/oembed?url=" + encodeURIComponent(url));
    }
    // generic fallback
    tryUrls.push("https://noembed.com/embed?url=" + encodeURIComponent(url));

    for (const endpoint of tryUrls) {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) continue;
        const j = await res.json();
        const title = j.title || j.author_name || "";
        const description = j.author_name
          ? ("Oleh " + j.author_name + (j.provider_name ? " · " + j.provider_name : ""))
          : (j.provider_name || "");
        if (title || description) {
          return {
            title: title || "Video",
            description: description || "",
            thumbnail: j.thumbnail_url || "",
            platform: parsed.platform,
            embed_url: parsed.embed_url,
            provider: j.provider_name || parsed.platform,
          };
        }
      } catch (e) {
        /* coba endpoint berikutnya */
      }
    }
    // Facebook share/reel: oEmbed sering gagal → ambil og:image via proxy
    if (parsed.platform === "facebook") {
      try {
        const og = await fetchOpenGraphMeta(url);
        if (og && (og.image || og.title)) {
          return {
            title: og.title || "Video Facebook",
            description: "Facebook",
            thumbnail: og.image || "",
            platform: "facebook",
            embed_url: parsed.embed_url,
            provider: "Facebook",
          };
        }
      } catch (e) {}
    }
    let host = "";
    try { host = new URL(url).hostname.replace(/^www\./, ""); } catch (e) {}
    return {
      title: host ? ("Video · " + host) : "Video",
      description: "",
      thumbnail: "",
      platform: parsed.platform,
      embed_url: parsed.embed_url,
      provider: parsed.platform,
    };
  }

  /** Scrape og:image / og:title via public CORS proxy (best-effort). */
  async function fetchOpenGraphMeta(url) {
    const proxies = [
      "https://api.allorigins.win/raw?url=" + encodeURIComponent(url),
      "https://corsproxy.io/?" + encodeURIComponent(url),
    ];
    for (let i = 0; i < proxies.length; i++) {
      try {
        const res = await fetch(proxies[i]);
        if (!res.ok) continue;
        const html = await res.text();
        if (!html || html.length < 40) continue;
        let image = "";
        let title = "";
        let m =
          html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
          html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
        if (m) image = String(m[1]).replace(/&amp;/g, "&");
        m =
          html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
          html.match(/content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
        if (m) title = String(m[1]).replace(/&amp;/g, "&").replace(/&#xb7;/g, "·");
        if (image || title) return { image, title };
      } catch (e) {}
    }
    return null;
  }

  async function resolveMyAlumni() {
    const sb = client();
    const session = await getSession();
    if (!session || !session.user) throw new Error("Belum login Google");
    const prof = await getMyProfile();
    if (!prof || !prof.linked_student_name || !prof.linked_angkatan_year) {
      throw new Error("Tautkan dulu nama siswa + angkatan di halaman Profil.");
    }
    const year = String(prof.linked_angkatan_year);
    const classCode = String(prof.linked_class_code || "51");
    // cari angkatan
    let angList = await listAngkatan({ mainOnly: false });
    let ang = angList.find((a) => a.label_norm === "angkatan-" + year || a.label.includes(year));
    if (!ang) {
      const created = await ensureAngkatan("Angkatan " + year);
      ang = created.row;
    }
    const nameNorm = normLabel(prof.linked_student_name);
    let { data: al } = await sb
      .from("gallery_alumni")
      .select("id")
      .eq("name_norm", nameNorm)
      .eq("angkatan_id", ang.id)
      .maybeSingle();
    if (!al) {
      const ins = await sb
        .from("gallery_alumni")
        .insert({
          name: prof.linked_student_name,
          name_norm: nameNorm,
          angkatan_id: ang.id,
          class_code: classCode,
          role: "Santriwati / Alumni",
        })
        .select("id")
        .single();
      if (ins.error) throw ins.error;
      al = ins.data;
    } else {
      await sb.from("gallery_alumni").update({ class_code: classCode }).eq("id", al.id);
    }
    await sb.from("gallery_profiles").update({ linked_alumni_id: al.id }).eq("id", session.user.id);
    return { alumniId: al.id, profile: prof, angkatan: ang, classCode };
  }

  async function myWebsites() {
    const { alumniId } = await resolveMyAlumni();
    const sb = client();
    const { data, error } = await sb
      .from("gallery_websites")
      .select("*")
      .eq("alumni_id", alumniId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function addMyWebsite({ title, url, category }) {
    const { alumniId } = await resolveMyAlumni();
    const sb = client();
    const { data, error } = await sb
      .from("gallery_websites")
      .insert({
        alumni_id: alumniId,
        title: title || "Website",
        url,
        category: category || "Web Kreatif",
        description: "Dikelola pemilik akun Google.",
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async function updateMyWebsite(id, { title, url, category }) {
    const { alumniId } = await resolveMyAlumni();
    const sb = client();
    const { data, error } = await sb
      .from("gallery_websites")
      .update({
        title: title || "Website",
        url,
        category: category || "Web Kreatif",
      })
      .eq("id", id)
      .eq("alumni_id", alumniId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async function deleteMyWebsite(id) {
    const { alumniId } = await resolveMyAlumni();
    const sb = client();
    const { error } = await sb.from("gallery_websites").delete().eq("id", id).eq("alumni_id", alumniId);
    if (error) throw error;
  }

  async function myVideos() {
    const session = await getSession();
    if (!session || !session.user) throw new Error("Belum login");
    const sb = client();
    const prof = await getMyProfile();
    const uid = session.user.id;
    const name = (prof && prof.linked_student_name) || "";

    const { data: byUser, error: e1 } = await sb
      .from("gallery_videos")
      .select("*, gallery_video_categories(name,slug)")
      .eq("owner_user_id", uid)
      .order("created_at", { ascending: false });
    if (e1) throw e1;

    let byName = [];
    if (name) {
      const { data, error: e2 } = await sb
        .from("gallery_videos")
        .select("*, gallery_video_categories(name,slug)")
        .ilike("owner_name", name)
        .order("created_at", { ascending: false });
      if (e2) console.warn(e2);
      else byName = data || [];
    }

    const map = new Map();
    [...(byUser || []), ...byName].forEach((v) => {
      if (v && v.id) map.set(v.id, v);
    });
    const rows = [...map.values()].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

    // klaim video yang cocok nama tapi belum punya owner_user_id
    for (const v of rows) {
      if (!v.owner_user_id && name) {
        try {
          await sb
            .from("gallery_videos")
            .update({ owner_user_id: uid, owner_name: name })
            .eq("id", v.id)
            .is("owner_user_id", null);
          v.owner_user_id = uid;
        } catch (e) {
          /* RLS mungkin membatasi */
        }
      }
    }
    return rows;
  }

  async function addMyVideo({ title, url, description, categoryId }) {
    const session = await getSession();
    if (!session || !session.user) throw new Error("Belum login Google");
    const prof = await getMyProfile();
    if (!prof || !prof.linked_student_name) {
      throw new Error("Tautkan nama + angkatan di Profil dulu.");
    }
    const parsed = assertPlayableVideoUrl(url);
    const meta = await fetchVideoMeta(url);
    // YouTube/Dailymotion wajib embed; sosmed lain simpan link + meta
    if (parsed.platform === "other") {
      // still allow if meta found
    }
    const finalTitle = (title && String(title).trim()) || meta.title || "Video";
    const finalDesc =
      (description && String(description).trim()) ||
      meta.description ||
      ("Karya " + prof.linked_student_name + " · Angkatan " + (prof.linked_angkatan_year || ""));

    // default kategori Karya Siswa
    let catId = categoryId;
    if (!catId) {
      const cats = await listVideoCategories();
      const ks = cats.find((c) => c.slug === "karya-siswa");
      catId = ks ? ks.id : (cats[0] && cats[0].id) || null;
    }

    const sb = client();
    const { data, error } = await sb
      .from("gallery_videos")
      .insert({
        title: finalTitle,
        url,
        platform: meta.platform || parsed.platform,
        embed_url: parsed.embed_url || url,
        category_id: catId,
        description: finalDesc,
        created_by: session.user.email || "",
        owner_user_id: session.user.id,
        owner_name: prof.linked_student_name,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async function updateMyVideo(id, { title, url, description }) {
    const session = await getSession();
    if (!session || !session.user) throw new Error("Belum login");
    const patch = {};
    if (url) {
      const meta = await fetchVideoMeta(url);
      const parsed = assertPlayableVideoUrl(url);
      patch.url = url;
      patch.platform = meta.platform || parsed.platform;
      patch.embed_url = parsed.embed_url || url;
      if (!title) patch.title = meta.title;
      if (!description) patch.description = meta.description;
    }
    if (title) patch.title = title;
    if (description) patch.description = description;
    const sb = client();
    const { data, error } = await sb
      .from("gallery_videos")
      .update(patch)
      .eq("id", id)
      .eq("owner_user_id", session.user.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async function deleteMyVideo(id) {
    const session = await getSession();
    if (!session || !session.user) throw new Error("Belum login");
    const sb = client();
    const { error } = await sb.from("gallery_videos").delete().eq("id", id).eq("owner_user_id", session.user.id);
    if (error) throw error;
  }


  async function listVideoCategories() {
    const sb = client();
    if (!sb) return [];
    const { data, error } = await sb.from("gallery_video_categories").select("*").order("name");
    if (error) throw error;
    return data || [];
  }
  async function addVideoCategory(name) {
    const sb = client();
    const slug = normLabel(name);
    const { data, error } = await sb.from("gallery_video_categories").insert({ name, slug }).select("*").single();
    if (error) throw error;
    return data;
  }
  async function listVideos({ categoryId } = {}) {
    const sb = client();
    if (!sb) return [];
    let q = sb
      .from("gallery_videos")
      .select("id,title,url,platform,embed_url,description,created_at,category_id,owner_name,owner_user_id,created_by, gallery_video_categories(name,slug)")
      .order("created_at", { ascending: false });
    if (categoryId) q = q.eq("category_id", categoryId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }
  async function addVideo({ title, url, categoryId, description, createdBy, ownerName }) {
    const sb = client();
    const parsed = assertPlayableVideoUrl(url);
    const row = {
      title: title || "Video",
      url,
      platform: parsed.platform,
      embed_url: parsed.embed_url,
      category_id: categoryId || null,
      description: description || "",
      created_by: createdBy || "",
    };
    const on = String(ownerName || "").trim();
    if (on) row.owner_name = on.slice(0, 120);
    const { data, error } = await sb.from("gallery_videos").insert(row).select("*").single();
    if (error) throw error;
    return data;
  }
  async function deleteVideo(id) {
    await requireAdmin();
    const sb = client();
    const { error } = await sb.from("gallery_videos").delete().eq("id", id);
    if (error) throw error;
  }

  // Chat
  function isStaffProfile(prof) {
    if (!prof) return false;
    if (prof.is_admin) return true;
    const r = String(prof.role || "").toLowerCase().trim();
    return r === "teacher" || r === "pengajar" || r === "guru";
  }

  async function isCurrentUserStaff() {
    const session = await getSession();
    if (!session || !session.user) return false;
    if (isAdminEmail(session.user.email)) return true;
    const prof = await getMyProfile();
    return isStaffProfile(prof);
  }

  async function getProfileById(userId) {
    if (!userId) return null;
    const sb = client();
    if (!sb) return null;
    const { data, error } = await sb
      .from("gallery_profiles")
      .select("id,email,is_admin,role,display_name")
      .eq("id", userId)
      .maybeSingle();
    if (error) return null;
    return data;
  }

  /** Owner may edit/delete own; staff may moderate non-staff messages only. */
  async function canModerateChatMessage(msg) {
    const session = await getSession();
    if (!session || !session.user) return { ok: false, reason: "not_logged_in" };
    const myId = session.user.id;
    const ownerId = msg && msg.user_id ? String(msg.user_id) : "";
    if (ownerId && ownerId === myId) return { ok: true, as: "owner" };
    // Pesan lama tanpa user_id: cocokkan nama display login
    if (!ownerId) {
      try {
        const meta = session.user.user_metadata || {};
        const nm = String(meta.full_name || meta.name || "").trim().toLowerCase();
        const an = String((msg && msg.author_name) || "").trim().toLowerCase();
        if (nm && an && nm === an) return { ok: true, as: "owner_name" };
        const prof = await getMyProfile();
        const pn = String((prof && (prof.display_name || prof.linked_student_name)) || "").trim().toLowerCase();
        if (pn && an && pn === an) return { ok: true, as: "owner_name" };
      } catch (e) {}
    }
    const staff = await isCurrentUserStaff();
    if (!staff) return { ok: false, reason: "not_allowed" };
    if (ownerId) {
      const target = await getProfileById(ownerId);
      if (isStaffProfile(target) || (target && isAdminEmail(target.email))) {
        return { ok: false, reason: "peer_staff" };
      }
    }
    return { ok: true, as: "staff" };
  }

  /** Depth of reply chain: 0 = root, max allowed depth = 2 (3 levels total). */
  async function getChatReplyDepth(msgId, cacheMap) {
    if (!msgId) return 0;
    let depth = 0;
    let cur = String(msgId);
    const seen = Object.create(null);
    while (cur && depth < 10) {
      if (seen[cur]) break;
      seen[cur] = true;
      let row = cacheMap && cacheMap[cur];
      if (!row) {
        const sb = client();
        if (!sb) break;
        const { data } = await sb.from("gallery_chat").select("id,reply_to").eq("id", cur).maybeSingle();
        row = data;
        if (cacheMap && row) cacheMap[cur] = row;
      }
      if (!row || !row.reply_to) break;
      depth += 1;
      cur = String(row.reply_to);
    }
    return depth;
  }

  async function listChat({ angkatanId, roomId, limit }) {
    const sb = client();
    const colsFull = "id,author_name,body,created_at,updated_at,avatar_emoji,user_id,is_registered,angkatan_id,room_id,reply_to,edit_count,edit_history";
    const colsNoUpdated = "id,author_name,body,created_at,avatar_emoji,user_id,is_registered,angkatan_id,room_id,reply_to";
    const colsMinimal = "id,author_name,body,created_at,avatar_emoji,user_id,is_registered,angkatan_id";
    async function run(cols) {
      let q = sb
        .from("gallery_chat")
        .select(cols)
        .order("created_at", { ascending: true })
        .limit(limit || 100);
      if (roomId) {
        q = q.eq("room_id", roomId);
      } else if (angkatanId) {
        // pesan lama angkatan (abaikan room_id agar histori tidak hilang)
        q = q.eq("angkatan_id", angkatanId);
      } else {
        // global lama: angkatan_id null
        q = q.is("angkatan_id", null);
      }
      return q;
    }
    let { data, error } = await run(colsFull);
    if (error && /room_id/i.test(String(error.message || ""))) {
      // kolom room_id belum ada — fallback lama
      async function runLegacy(cols) {
        let q = sb.from("gallery_chat").select(cols).order("created_at", { ascending: true }).limit(limit || 100);
        if (angkatanId) q = q.eq("angkatan_id", angkatanId);
        else q = q.is("angkatan_id", null);
        return q;
      }
      let r = await runLegacy(colsFull.replace(",room_id", ""));
      if (r.error && /reply_to|updated_at/i.test(String(r.error.message || ""))) {
        r = await runLegacy(colsNoUpdated.replace(",room_id", ""));
        if (r.error && /reply_to/i.test(String(r.error.message || ""))) {
          r = await runLegacy(colsMinimal);
        }
      }
      if (r.error) throw r.error;
      return r.data || [];
    }
    if (error && /reply_to|updated_at/i.test(String(error.message || ""))) {
      const r2 = await run(colsNoUpdated);
      if (r2.error && /reply_to/i.test(String(r2.error.message || ""))) {
        const r3 = await run(colsMinimal);
        data = r3.data;
        error = r3.error;
      } else {
        data = r2.data;
        error = r2.error;
      }
    }
    if (error) throw error;
    return data || [];
  }
  async function sendChat({ angkatanId, roomId, authorName, body, avatarEmoji, replyTo }) {
    const sb = client();
    let userId = null;
    let isReg = false;
    try {
      const sess = await getSession();
      if (sess && sess.user) {
        userId = sess.user.id;
        isReg = true;
        await upsertMyProfileFromSession();
      }
    } catch (e) {}
    let replyId = replyTo ? String(replyTo).trim() : null;
    if (replyId) {
      const depth = await getChatReplyDepth(replyId, null);
      // Parent already at depth 2 → would become depth 3 (4th level) → block
      if (depth >= 2) throw new Error("Balasan maksimal 3 level kedalaman");
    }
    const payload = {
      author_name: String(authorName || "Anonim").slice(0, 60),
      body: String(body || "").trim().slice(0, 8000),
      angkatan_id: roomId ? null : (angkatanId || null),
      avatar_emoji: (avatarEmoji || "💬").slice(0, 8),
      user_id: userId,
      is_registered: isReg,
    };
    if (roomId) payload.room_id = roomId;
    if (replyId) payload.reply_to = replyId;
    let { data, error } = await sb.from("gallery_chat").insert(payload).select("*").single();
    if (error && roomId && /room_id/i.test(String(error.message || ""))) {
      delete payload.room_id;
      const r0 = await sb.from("gallery_chat").insert(payload).select("*").single();
      data = r0.data;
      error = r0.error;
    }
    if (error && replyId && /reply_to/i.test(String(error.message || ""))) {
      delete payload.reply_to;
      const r2 = await sb.from("gallery_chat").insert(payload).select("*").single();
      data = r2.data;
      error = r2.error;
      if (!error) {
        // column missing — still ok, message sent without thread
      }
    }
    if (error) throw error;
    return data;
  }

  async function updateChat({ id, body }) {
    const sb = client();
    if (!sb) throw new Error("Database belum dikonfigurasi");
    const msgId = String(id || "").trim();
    if (!msgId) throw new Error("ID pesan wajib");
    const text = String(body || "").trim().slice(0, 8000);
    if (!text) throw new Error("Pesan tidak boleh kosong");
    const { data: existing, error: e0 } = await sb.from("gallery_chat").select("*").eq("id", msgId).maybeSingle();
    if (e0) throw e0;
    if (!existing) throw new Error("Pesan tidak ditemukan");
    const gate = await canModerateChatMessage(existing);
    if (!gate.ok) {
      if (gate.reason === "not_logged_in") throw new Error("Login dulu untuk mengubah pesan");
      if (gate.reason === "peer_staff") throw new Error("Tidak dapat mengubah pesan admin/guru lain");
      throw new Error("Tidak berhak mengubah pesan ini");
    }
    // Maks 3x edit; simpan histori body lama (JSON kecil, ~teks singkat)
    let hist = [];
    try {
      if (Array.isArray(existing.edit_history)) hist = existing.edit_history.slice();
      else if (typeof existing.edit_history === "string" && existing.edit_history) {
        hist = JSON.parse(existing.edit_history);
        if (!Array.isArray(hist)) hist = [];
      }
    } catch (e) {
      hist = [];
    }
    const editCount = Number(existing.edit_count) || hist.length || 0;
    if (editCount >= 3) {
      throw new Error("Batas edit tercapai (maksimal 3 kali). Pesan tidak bisa diubah lagi.");
    }
    const prevBody = String(existing.body || "");
    if (prevBody && prevBody !== text) {
      hist.push({
        body: prevBody.length > 2000 ? prevBody.slice(0, 2000) + "…" : prevBody,
        at: existing.updated_at || existing.created_at || new Date().toISOString(),
      });
      // simpan maksimal 3 versi lama
      if (hist.length > 3) hist = hist.slice(-3);
    }
    const payload = {
      body: text,
      updated_at: new Date().toISOString(),
      edit_count: editCount + 1,
      edit_history: hist,
    };
    let { data, error } = await sb.from("gallery_chat").update(payload).eq("id", msgId).select("*").single();
    // kolom histori belum ada → coba tanpa edit_history/edit_count
    if (error && /edit_history|edit_count/i.test(String(error.message || ""))) {
      const r2 = await sb
        .from("gallery_chat")
        .update({ body: text, updated_at: payload.updated_at })
        .eq("id", msgId)
        .select("*")
        .single();
      if (r2.error && /updated_at/i.test(String(r2.error.message || ""))) {
        const r3 = await sb.from("gallery_chat").update({ body: text }).eq("id", msgId).select("*").single();
        data = r3.data;
        error = r3.error;
      } else {
        data = r2.data;
        error = r2.error;
      }
      if (!error && data) {
        // tempel histori di client saja (DB belum siap)
        data.edit_history = hist;
        data.edit_count = editCount + 1;
      }
    } else if (error && /updated_at/i.test(String(error.message || ""))) {
      const r2 = await sb
        .from("gallery_chat")
        .update({ body: text, edit_count: editCount + 1, edit_history: hist })
        .eq("id", msgId)
        .select("*")
        .single();
      data = r2.data;
      error = r2.error;
    }
    if (error) throw error;
    return data;
  }


  async function clearChatMessages({ roomId, angkatanId, legacyGlobal, messageIds }) {
    const sb = client();
    if (!sb) throw new Error("Database belum dikonfigurasi");
    const session = await getSession();
    if (!session || !session.user) throw new Error("Login dulu");
    const email = String(session.user.email || "").toLowerCase();
    const isAdmin = await isCurrentUserAdmin();
    let allowed = isAdmin;
    if (!allowed && roomId) {
      try {
        const { data: room } = await sb
          .from("gallery_chat_rooms")
          .select("id,created_by,name")
          .eq("id", roomId)
          .maybeSingle();
        const owner = String((room && room.created_by) || "").toLowerCase();
        if (owner && (owner === email || owner === String(session.user.id || "").toLowerCase())) {
          allowed = true;
        }
      } catch (e) {}
    }
    if (!allowed) throw new Error("Hanya admin atau pemilik ruang yang bisa membersihkan chat");

    let list = [];
    if (roomId || angkatanId || legacyGlobal) {
      let q = sb.from("gallery_chat").select("id,body");
      if (roomId) q = q.eq("room_id", roomId);
      else if (angkatanId) q = q.eq("angkatan_id", angkatanId);
      else q = q.is("angkatan_id", null);
      const { data: rows, error: e1 } = await q.limit(5000);
      if (e1) throw e1;
      list = rows || [];
    }
    // gabung id yang tampil di UI (histori digabung)
    if (messageIds && messageIds.length) {
      const have = Object.create(null);
      list.forEach(function (r) { if (r && r.id) have[r.id] = true; });
      messageIds.forEach(function (id) {
        if (id && !have[id]) list.push({ id: id, body: "" });
      });
    }
    if (!list.length) return { removed: 0 };

    // best-effort storage
    for (const row of list) {
      try {
        const body = String(row.body || "");
        const urls = body.match(/https?:\/\/[^\s|"']+/g) || [];
        for (const u of urls) {
          if (/chat-images|chat-voice|voice\//i.test(u)) {
            try { await deleteChatStorageByPublicUrl(u); } catch (e) {}
          }
        }
      } catch (e) {}
    }

    // hapus massal per filter, fallback per-id
    let removed = 0;
    if (roomId) {
      const { error: e2, count } = await sb.from("gallery_chat").delete({ count: "exact" }).eq("room_id", roomId);
      if (e2) {
        // fallback per id
        for (const row of list) {
          const { error } = await sb.from("gallery_chat").delete().eq("id", row.id);
          if (!error) removed++;
        }
      } else {
        removed = typeof count === "number" ? count : list.length;
      }
    } else if (angkatanId) {
      const { error: e2, count } = await sb.from("gallery_chat").delete({ count: "exact" }).eq("angkatan_id", angkatanId);
      if (e2) {
        for (const row of list) {
          const { error } = await sb.from("gallery_chat").delete().eq("id", row.id);
          if (!error) removed++;
        }
      } else {
        removed = typeof count === "number" ? count : list.length;
      }
    } else if (legacyGlobal) {
      const { error: e2, count } = await sb.from("gallery_chat").delete({ count: "exact" }).is("angkatan_id", null);
      if (e2) {
        for (const row of list) {
          const { error } = await sb.from("gallery_chat").delete().eq("id", row.id);
          if (!error) removed++;
        }
      } else {
        removed = typeof count === "number" ? count : list.length;
      }
    } else {
      for (const row of list) {
        const { error } = await sb.from("gallery_chat").delete().eq("id", row.id);
        if (!error) removed++;
      }
    }
    // pastikan id dari messageIds ikut terhapus
    if (messageIds && messageIds.length) {
      for (const id of messageIds) {
        try {
          await sb.from("gallery_chat").delete().eq("id", id);
        } catch (e) {}
      }
    }
    return { removed: removed || list.length };
  }

  async function deleteChat({ id }) {
    const sb = client();
    if (!sb) throw new Error("Database belum dikonfigurasi");
    const msgId = String(id || "").trim();
    if (!msgId) throw new Error("ID pesan wajib");
    const { data: existing, error: e0 } = await sb.from("gallery_chat").select("*").eq("id", msgId).maybeSingle();
    if (e0) throw e0;
    if (!existing) throw new Error("Pesan tidak ditemukan");
    const gate = await canModerateChatMessage(existing);
    if (!gate.ok) {
      if (gate.reason === "not_logged_in") throw new Error("Login dulu untuk menghapus pesan");
      if (gate.reason === "peer_staff") throw new Error("Tidak dapat menghapus pesan admin/guru lain");
      throw new Error("Tidak berhak menghapus pesan ini");
    }
    const { error } = await sb.from("gallery_chat").delete().eq("id", msgId);
    if (error) throw error;
    return { ok: true, id: msgId };
  }

  function subscribeChat({ angkatanId, roomId, onInsert, onUpdate, onDelete }) {
    const sb = client();
    if (!sb) return () => {};
    let filter;
    let chName;
    if (roomId) {
      filter = `room_id=eq.${roomId}`;
      chName = "gallery-chat-room-" + roomId;
    } else if (angkatanId) {
      filter = `angkatan_id=eq.${angkatanId}`;
      chName = "gallery-chat-" + angkatanId;
    } else {
      filter = "angkatan_id=is.null";
      chName = "gallery-chat-global";
    }
    const channel = sb
      .channel(chName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gallery_chat", filter }, (payload) => onInsert && onInsert(payload.new))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "gallery_chat", filter }, (payload) => onUpdate && onUpdate(payload.new))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "gallery_chat", filter }, (payload) => onDelete && onDelete(payload.old))
      .subscribe();
    return () => {
      try {
        sb.removeChannel(channel);
      } catch (_) {}
    };
  }

  async function listChatRooms({ activeOnly } = { activeOnly: true }) {
    const sb = client();
    if (!sb) return [];
    // Ambil SEMUA baris yang bisa dibaca; admin memakai activeOnly:false
    const colSets = [
      "id,name,description,access_password,allowed_angkatan_ids,allowed_class_codes,allowed_students,is_active,sort_order,created_at,source_angkatan_id,created_by",
      "id,name,description,access_password,allowed_angkatan_ids,allowed_class_codes,allowed_students,is_active,sort_order,created_at",
      "id,name,description,access_password,allowed_angkatan_ids,allowed_class_codes,is_active,sort_order,created_at",
      "id,name,description,access_password,is_active,sort_order,created_at",
      "id,name,description,access_password,is_active,created_at",
      "*",
    ];
    let data = null;
    let error = null;
    for (var i = 0; i < colSets.length; i++) {
      var cols = colSets[i];
      var q = sb.from("gallery_chat_rooms").select(cols);
      // Jangan filter is_active di admin (activeOnly:false)
      if (activeOnly !== false) {
        q = q.or("is_active.eq.true,is_active.is.null");
      }
      // Urut: terbaru dulu supaya ruang lama tetap terlihat di bawah/atas konsisten
      var r = await q.order("created_at", { ascending: false, nullsFirst: false });
      if (r.error && /created_at|order/i.test(String(r.error.message || ""))) {
        r = await q.order("name");
      }
      data = r.data;
      error = r.error;
      if (!error) break;
      if (!/column|schema cache|does not exist/i.test(String(error.message || ""))) break;
    }
    if (error) {
      if (/does not exist|relation/i.test(String(error.message || ""))) return [];
      throw error;
    }
    var rows = data || [];
    // sort stabil: sort_order lalu nama (setelah fetch)
    rows = rows.slice().sort(function (a, b) {
      var sa = a.sort_order != null ? Number(a.sort_order) : 0;
      var sb_ = b.sort_order != null ? Number(b.sort_order) : 0;
      if (sa !== sb_) return sa - sb_;
      var ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      var tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (ta !== tb) return ta - tb; // lama dulu
      return String(a.name || "").localeCompare(String(b.name || ""), "id");
    });
    return rows.map(function (r) {
      var stu = r.allowed_students;
      if (typeof stu === "string") {
        try {
          stu = JSON.parse(stu);
        } catch (e) {
          stu = [];
        }
      }
      return {
        id: r.id,
        name: r.name,
        description: r.description || "",
        needs_password: !!(r.access_password && String(r.access_password).trim()),
        allowed_angkatan_ids: r.allowed_angkatan_ids || [],
        allowed_class_codes: r.allowed_class_codes || [],
        allowed_students: Array.isArray(stu) ? stu : [],
        is_active: r.is_active === false ? false : true,
        sort_order: r.sort_order != null ? Number(r.sort_order) : 0,
        created_at: r.created_at || null,
        source_angkatan_id: r.source_angkatan_id || null,
        created_by: r.created_by || "",
        _password: r.access_password || "",
      };
    });
  }

  async function upsertChatRoom(payload) {
    if (!(await isCurrentUserAdmin())) throw new Error("Admin only");
    const sb = client();
    const row = {
      name: String(payload.name || "").trim().slice(0, 80),
      description: String(payload.description || "").trim().slice(0, 300),
      access_password: payload.access_password != null && String(payload.access_password).trim()
        ? String(payload.access_password).trim().slice(0, 80)
        : null,
      allowed_angkatan_ids: Array.isArray(payload.allowed_angkatan_ids) ? payload.allowed_angkatan_ids : [],
      allowed_class_codes: Array.isArray(payload.allowed_class_codes)
        ? payload.allowed_class_codes.map(function (c) { return String(c).trim(); }).filter(Boolean)
        : [],
      allowed_students: Array.isArray(payload.allowed_students) ? payload.allowed_students : [],
      is_active: payload.is_active !== false,
      sort_order: Number(payload.sort_order) || 0,
      created_by: payload.created_by || "",
    };
    if (!row.name) throw new Error("Nama ruang wajib");
    async function write(body) {
      if (payload.id) {
        return sb.from("gallery_chat_rooms").update(body).eq("id", payload.id).select("*").single();
      }
      return sb.from("gallery_chat_rooms").insert(body).select("*").single();
    }
    let { data, error } = await write(row);
    // Kolom allowed_students belum ada di DB — simpan tanpa kolom itu dulu
    if (error && /allowed_students|schema cache/i.test(String(error.message || ""))) {
      const slim = Object.assign({}, row);
      delete slim.allowed_students;
      const r2 = await write(slim);
      data = r2.data;
      error = r2.error;
      if (!error) {
        console.warn("[chat-rooms] allowed_students belum di DB — jalankan sql/patch-chat-rooms-allowed-students.sql");
      }
    }
    if (error && /allowed_angkatan|allowed_class|schema cache/i.test(String(error.message || ""))) {
      const minimal = {
        name: row.name,
        description: row.description,
        access_password: row.access_password,
        is_active: row.is_active,
        sort_order: row.sort_order,
        created_by: row.created_by,
      };
      const r3 = await write(minimal);
      data = r3.data;
      error = r3.error;
    }
    if (error) throw error;
    return data;
  }

  async function deleteChatRoom(id) {
    if (!(await isCurrentUserAdmin())) throw new Error("Admin only");
    const sb = client();
    const { error } = await sb.from("gallery_chat_rooms").delete().eq("id", id);
    if (error) throw error;
  }

  async function verifyChatRoomAccess({ roomId, password, angkatanId, classCode, studentName, angkatanYear }) {
    const sb = client();
    if (!sb || !roomId) return false;
    var isAdmin = false;
    try {
      isAdmin = await isCurrentUserAdmin();
    } catch (e) {
      isAdmin = false;
    }

    // Verifikasi client-side (admin + password benar → boleh, tanpa harus di daftar siswa)
    async function clientVerify() {
      const rooms = await listChatRooms({ activeOnly: false });
      const r = rooms.find(function (x) {
        return String(x.id) === String(roomId);
      });
      if (!r || !r.is_active) return false;

      var roomPw = null;
      var allowedStudents = r.allowed_students || [];
      try {
        const full = await sb
          .from("gallery_chat_rooms")
          .select("access_password,allowed_students,is_active")
          .eq("id", roomId)
          .maybeSingle();
        if (full.data) {
          if (full.data.is_active === false) return false;
          roomPw = full.data.access_password;
          if (full.data.allowed_students) allowedStudents = full.data.allowed_students;
        }
      } catch (e) {}

      // Password wajib jika ruang dilindungi
      if (roomPw && String(roomPw).trim()) {
        if (String(roomPw).trim() !== String(password || "").trim()) return false;
      }

      // Admin yang sudah lolos password (atau ruang tanpa password) boleh masuk
      if (isAdmin) return true;

      if (r.allowed_class_codes && r.allowed_class_codes.length) {
        const cls = String(classCode || "").trim().toLowerCase();
        if (
          !cls ||
          !r.allowed_class_codes.some(function (c) {
            return String(c).trim().toLowerCase() === cls;
          })
        )
          return false;
      }
      const stu = allowedStudents || [];
      if (stu.length) {
        const nm = String(studentName || "").trim().toLowerCase();
        const yr = String(angkatanYear || "").trim();
        const cls = String(classCode || "").trim().toLowerCase();
        if (!nm) return false;
        const ok = stu.some(function (t) {
          return (
            String(t.name || "").trim().toLowerCase() === nm &&
            (!t.class || String(t.class).trim().toLowerCase() === cls) &&
            (!t.year || String(t.year).trim() === yr)
          );
        });
        if (!ok) return false;
      }
      return true;
    }

    // Admin: prioritaskan client verify (RPC lama sering menolak admin karena bukan peserta)
    if (isAdmin) {
      try {
        return await clientVerify();
      } catch (e) {
        return false;
      }
    }

    try {
      const { data, error } = await sb.rpc("verify_chat_room_access_v2", {
        p_room_id: roomId,
        p_password: password || null,
        p_angkatan_id: angkatanId || null,
        p_class_code: classCode || null,
        p_student_name: studentName || null,
        p_angkatan_year: angkatanYear || null,
      });
      if (!error) return !!data;
      const r1 = await sb.rpc("verify_chat_room_access", {
        p_room_id: roomId,
        p_password: password || null,
        p_angkatan_id: angkatanId || null,
        p_class_code: classCode || null,
      });
      if (!r1.error) return !!r1.data;
      throw error || r1.error;
    } catch (e) {
      try {
        return await clientVerify();
      } catch (e2) {
        return false;
      }
    }
  }
  function joinTypingChannel({ roomKey, userName, avatarEmoji, onSync }) {
    const sb = client();
    if (!sb) return { setTyping() {}, leave() {} };
    const channel = sb.channel("typing-" + (roomKey || "global"), {
      config: { presence: { key: userName || "anon-" + Math.random().toString(36).slice(2, 8) } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const people = [];
        Object.values(state).forEach((arr) => (arr || []).forEach((p) => people.push(p)));
        onSync && onSync(people);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ name: userName || "Anonim", avatar: avatarEmoji || "💬", typing: false, at: Date.now() });
        }
      });
    return {
      async setTyping(isTyping) {
        try {
          await channel.track({ name: userName || "Anonim", avatar: avatarEmoji || "💬", typing: !!isTyping, at: Date.now() });
        } catch (_) {}
      },
      leave() {
        try {
          sb.removeChannel(channel);
        } catch (_) {}
      },
    };
  }


  // ----- Profiles & admin roles -----

  /** Perkecil URL foto Google agar loading ringan */
  function optimizePhotoUrl(url) {
    let u = String(url || "").trim();
    if (!u || !/^https?:\/\//i.test(u)) return "";
    try {
      if (/googleusercontent\.com/i.test(u)) {
        if (/=s\d+/i.test(u)) u = u.replace(/=s\d+(-[a-z])?/i, "=s96-c");
        else if (/=w\d+/i.test(u)) u = u.replace(/=w\d+(-h\d+)?/i, "=s96-c");
        else u = u.replace(/\/$/, "") + "=s96-c";
      }
    } catch (e) {}
    return u;
  }

  /** Ambil foto siswa by nama (hotlink → Google), untuk popup profil */
  async function resolveStudentPhoto(studentName, angkatanYear) {
    const sb = client();
    if (!sb || !studentName) return "";
    try {
      let q = sb
        .from("gallery_profiles")
        .select("profile_photo_url,avatar_url,linked_student_name,linked_angkatan_year")
        .ilike("linked_student_name", String(studentName).trim());
      const { data, error } = await q.limit(8);
      if (error) {
        const r2 = await sb
          .from("gallery_profiles")
          .select("avatar_url,linked_student_name,linked_angkatan_year")
          .ilike("linked_student_name", String(studentName).trim())
          .limit(8);
        const rows = r2.data || [];
        const year = String(angkatanYear || "").trim();
        let hit = rows.find((r) => year && String(r.linked_angkatan_year || "") === year) || rows[0];
        return optimizePhotoUrl(hit && hit.avatar_url);
      }
      const rows = data || [];
      const year = String(angkatanYear || "").trim();
      let hit =
        rows.find((r) => year && String(r.linked_angkatan_year || "") === year) ||
        rows.find((r) => String(r.profile_photo_url || "").trim() || String(r.avatar_url || "").trim()) ||
        rows[0];
      if (!hit) return "";
      const custom = String(hit.profile_photo_url || "").trim();
      const google = String(hit.avatar_url || "").trim();
      return optimizePhotoUrl(custom || google);
    } catch (e) {
      return "";
    }
  }

  async function upsertMyProfileFromSession() {
    const sb = client();
    if (!sb) return null;
    const session = await getSession();
    if (!session || !session.user) return null;
    const u = session.user;
    const meta = u.user_metadata || {};
    const email = (u.email || "").toLowerCase();
    const row = {
      id: u.id,
      email,
      display_name: meta.full_name || meta.name || "",
      avatar_url: meta.avatar_url || meta.picture || "",
      updated_at: new Date().toISOString(),
    };
    // seed is_admin from config allowlist on first touch
    const { data: existing } = await sb.from("gallery_profiles").select("id,is_admin,permissions").eq("id", u.id).maybeSingle();
    if (!existing) {
      row.is_admin = isAdminEmail(email);
      row.permissions = row.is_admin
        ? Object.fromEntries((cfg().adminPermissionKeys || []).map((k) => [k, true]))
        : {};
      row.created_at = new Date().toISOString();
    }
    const { data, error } = await sb.from("gallery_profiles").upsert(row, { onConflict: "id" }).select("*").single();
    if (error) throw error;
    return data;
  }

  async function getMyProfile() {
    const sb = client();
    if (!sb) return null;
    const session = await getSession();
    if (!session || !session.user) return null;
    const { data, error } = await sb.from("gallery_profiles").select("*").eq("id", session.user.id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function updateMyLink({ studentName, angkatanYear, classCode }) {
    const sb = client();
    const session = await getSession();
    if (!session || !session.user) throw new Error("Belum login");
    const name = String(studentName || "").trim();
    const year = parseInt(angkatanYear, 10) || null;
    const kelas = String(classCode || "").trim();
    if (!name || !year) throw new Error("Nama dan angkatan wajib.");

    // Cek apakah nama+angkatan sudah ditautkan akun lain
    const { data: taken, error: e0 } = await sb
      .from("gallery_profiles")
      .select("id,email,display_name,linked_student_name,linked_angkatan_year,link_allow_user_ids")
      .eq("linked_angkatan_year", year)
      .ilike("linked_student_name", name);
    if (e0) throw e0;
    const others = (taken || []).filter((p) => p.id !== session.user.id && p.linked_student_name);
    for (const o of others) {
      // nama cocok (case-insensitive exact after trim)
      if (normLabel(o.linked_student_name) !== normLabel(name)) continue;
      const allow = Array.isArray(o.link_allow_user_ids) ? o.link_allow_user_ids : [];
      if (!allow.includes(session.user.id)) {
        throw new Error(
          "Nama ini sudah ditautkan ke akun lain (" +
            (o.email || o.display_name || "user") +
            "). Minta izin ke pemilik tautan atau hubungi admin."
        );
      }
    }

    const { data, error } = await sb
      .from("gallery_profiles")
      .update({
        linked_student_name: name,
        linked_angkatan_year: year,
        linked_class_code: kelas,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id)
      .select("*")
      .single();
    if (error) throw error;

    // sinkron linked_alumni_id
    try {
      await resolveMyAlumni();
    } catch (e) {
      console.warn(e);
    }
    return data;
  }

  async function unlinkMyProfile() {
    const sb = client();
    const session = await getSession();
    if (!session || !session.user) throw new Error("Belum login");
    const { data, error } = await sb
      .from("gallery_profiles")
      .update({
        linked_student_name: "",
        linked_angkatan_year: null,
        linked_class_code: "",
        linked_alumni_id: null,
        link_allow_user_ids: [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  /** Pemilik tautan mengizinkan userId lain mengklaim nama yang sama (opsional) */
  async function allowLinkForUser(userId) {
    const sb = client();
    const session = await getSession();
    if (!session || !session.user) throw new Error("Belum login");
    const me = await getMyProfile();
    if (!me || !me.linked_student_name) throw new Error("Anda belum menautkan nama siswa.");
    const allow = Array.isArray(me.link_allow_user_ids) ? me.link_allow_user_ids.slice() : [];
    if (userId && !allow.includes(userId)) allow.push(userId);
    const { data, error } = await sb
      .from("gallery_profiles")
      .update({ link_allow_user_ids: allow })
      .eq("id", session.user.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  /** Pemilik tautan mencopot tautan akun lain yang memakai nama sama */
  async function revokeOtherLinksOnMyStudent() {
    const sb = client();
    const session = await getSession();
    if (!session || !session.user) throw new Error("Belum login");
    const me = await getMyProfile();
    if (!me || !me.linked_student_name || !me.linked_angkatan_year) {
      throw new Error("Anda belum menautkan nama siswa.");
    }
    const { data: rows, error: e1 } = await sb
      .from("gallery_profiles")
      .select("id,linked_student_name,linked_angkatan_year")
      .eq("linked_angkatan_year", me.linked_angkatan_year);
    if (e1) throw e1;
    const targets = (rows || []).filter(
      (r) => r.id !== session.user.id && normLabel(r.linked_student_name) === normLabel(me.linked_student_name)
    );
    for (const r of targets) {
      await sb
        .from("gallery_profiles")
        .update({
          linked_student_name: "",
          linked_angkatan_year: null,
          linked_class_code: "",
          linked_alumni_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", r.id);
    }
    return { removed: targets.length };
  }

  async function adminForceLinkProfile(userId, { studentName, angkatanYear, classCode }) {
    if (!(await isCurrentUserAdmin())) throw new Error("Admin only");
    const sb = client();
    const name = String(studentName || "").trim();
    const year = parseInt(angkatanYear, 10) || null;
    const kelas = String(classCode || "").trim();
    if (!userId || !name || !year) throw new Error("Lengkapi user, nama, dan angkatan.");
    // cabut tautan lain pada nama yang sama
    const { data: others } = await sb
      .from("gallery_profiles")
      .select("id,linked_student_name,linked_angkatan_year")
      .eq("linked_angkatan_year", year);
    for (const o of others || []) {
      if (o.id !== userId && normLabel(o.linked_student_name) === normLabel(name)) {
        await sb
          .from("gallery_profiles")
          .update({
            linked_student_name: "",
            linked_angkatan_year: null,
            linked_class_code: "",
            linked_alumni_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", o.id);
      }
    }
    const { data, error } = await sb
      .from("gallery_profiles")
      .update({
        linked_student_name: name,
        linked_angkatan_year: year,
        linked_class_code: kelas,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async function adminUnlinkProfile(userId) {
    if (!(await isCurrentUserAdmin())) throw new Error("Admin only");
    const sb = client();
    const { data, error } = await sb
      .from("gallery_profiles")
      .update({
        linked_student_name: "",
        linked_angkatan_year: null,
        linked_class_code: "",
        linked_alumni_id: null,
        link_allow_user_ids: [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async function adminListLinks() {
    if (!(await isCurrentUserAdmin())) throw new Error("Admin only");
    const sb = client();
    const { data, error } = await sb
      .from("gallery_profiles")
      .select("id,email,display_name,avatar_url,linked_student_name,linked_angkatan_year,linked_class_code,linked_alumni_id,created_at")
      .not("linked_student_name", "eq", "")
      .order("linked_angkatan_year", { ascending: false });
    if (error) throw error;
    return (data || []).filter((p) => p.linked_student_name && String(p.linked_student_name).trim());
  }


  async function isCurrentUserAdmin() {
    const session = await getSession();
    if (!session || !session.user) return false;
    if (isAdminEmail(session.user.email)) return true;
    const prof = await getMyProfile();
    return !!(prof && prof.is_admin);
  }

  async function currentPermissions() {
    const session = await getSession();
    if (!session || !session.user) return {};
    if (isAdminEmail(session.user.email)) {
      return Object.fromEntries((cfg().adminPermissionKeys || []).map((k) => [k, true]));
    }
    const prof = await getMyProfile();
    if (prof && prof.is_admin) return prof.permissions || {};
    return {};
  }

  async function hasPermission(key) {
    const p = await currentPermissions();
    return !!p[key];
  }

  async function listRegisteredUsers() {
    const sb = client();
    const { data, error } = await sb.from("gallery_profiles").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function setUserAdmin(userId, { isAdmin, permissions, role }) {
    const sb = client();
    if (!(await hasPermission("manage_admins")) && !(await isCurrentUserAdmin())) {
      // main allowlist always can
      const session = await getSession();
      if (!session || !isAdminEmail(session.user.email)) throw new Error("Tidak berhak mengelola admin");
    }
    const { data, error } = await sb
      .from("gallery_profiles")
      .update({
        is_admin: !!isAdmin,
        permissions: permissions || {},
        ...(role !== undefined ? { role: role || "" } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  /** Hapus profil user terdaftar (non-admin). Tidak menghapus auth.users Google. */
  async function adminDeleteUserProfile(userId) {
    const sb = client();
    const gate = await requireAdmin();
    if (!gate.ok) throw new Error("Tidak berhak menghapus user");
    const { data: target, error: e1 } = await sb.from("gallery_profiles").select("id,email,is_admin").eq("id", userId).maybeSingle();
    if (e1) throw e1;
    if (!target) throw new Error("User tidak ditemukan");
    if (target.is_admin) throw new Error("Tidak dapat menghapus user admin");
    if (isAdminEmail(target.email)) throw new Error("Tidak dapat menghapus email admin utama");
    const { error } = await sb.from("gallery_profiles").delete().eq("id", userId);
    if (error) throw error;
    return true;
  }

  // override requireAdmin to also accept is_admin profiles
  async function requireAdmin() {
    const session = await getSession();
    if (!session || !session.user) return { ok: false, reason: "not_logged_in" };
    const email = session.user.email || "";
    await upsertMyProfileFromSession();
    if (isAdminEmail(email)) return { ok: true, email, session, main: true };
    const prof = await getMyProfile();
    if (prof && prof.is_admin) return { ok: true, email, session, main: false, permissions: prof.permissions || {} };
    return { ok: false, reason: "forbidden", email };
  }



  // ----- Social: love & comment + stats -----
  function sessionId() {
    try {
      let s = localStorage.getItem("sh_sid");
      if (!s) {
        s = "s-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem("sh_sid", s);
      }
      return s;
    } catch (e) {
      return "anon";
    }
  }

  async function trackEvent(eventType, meta) {
    const sb = client();
    if (!sb) return;
    let userId = null;
    try {
      const sess = await getSession();
      if (sess && sess.user) userId = sess.user.id;
    } catch (e) {}
    try {
      await sb.from("gallery_events").insert({
        event_type: eventType,
        session_id: sessionId(),
        user_id: userId,
        meta: meta || {},
      });
    } catch (e) {
      console.warn("trackEvent", e);
    }
  }


  function docsExportUrl(editUrl) {
    const m = String(editUrl || "").match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) throw new Error("URL Google Docs tidak valid");
    return "https://docs.google.com/document/d/" + m[1] + "/export?format=txt";
  }

  async function fetchGoogleDocsText(editUrl) {
    const exp = docsExportUrl(editUrl);
    const res = await fetch(exp, { cache: "no-store" });
    if (!res.ok) throw new Error("Gagal unduh Docs (" + res.status + "). Pastikan share: Anyone with the link.");
    return await res.text();
  }

  /** Parse kasar testimoni / skills dari teks docs */
  function parseDocsContent(text) {
    const lines = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const refleksi = [];
    let current = null;
    for (const line of lines) {
      // Nama ALL CAPS or "Nama ·" patterns
      if (/^[A-ZÁÉÍÓÚÄÖÜ][A-Z0-9ÁÉÍÓÚÄÖÜ\s'.\-]{3,}$/.test(line) && line.length < 80) {
        if (current && current.body) refleksi.push(current);
        current = { name: line.replace(/\s+/g, " ").trim(), body: "" };
        continue;
      }
      if (current) {
        current.body += (current.body ? "\n" : "") + line;
      }
    }
    if (current && current.body) refleksi.push(current);
    // skills bullets: lines starting with - or •
    const skillsHints = lines.filter((l) => /^[-•*]\s+/.test(l)).map((l) => l.replace(/^[-•*]\s+/, ""));
    return { refleksi, skillsHints, rawLength: text.length, lineCount: lines.length };
  }

  async function syncFromGoogleDocs(editUrl) {
    if (!(await isCurrentUserAdmin())) throw new Error("Admin only");
    const sb = client();
    const text = await fetchGoogleDocsText(editUrl);
    const parsed = parseDocsContent(text);
    // simpan snapshot
    const { error: e1 } = await sb.from("gallery_content_snapshots").upsert(
      {
        id: "google-docs-main",
        source_url: editUrl,
        raw_text: text.slice(0, 500000),
        parsed: parsed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (e1) throw e1;
    // merge refleksi entries by name
    let added = 0;
    for (const r of parsed.refleksi) {
      const name = r.name;
      const { data: existing } = await sb
        .from("gallery_refleksi")
        .select("id,body")
        .ilike("student_name", name)
        .maybeSingle();
      if (existing) {
        // append if new body longer / different
        if (r.body && r.body !== existing.body) {
          const merged = existing.body && r.body.includes(existing.body) ? r.body : (existing.body || "") + "\n\n" + r.body;
          await sb.from("gallery_refleksi").update({ body: merged, updated_at: new Date().toISOString() }).eq("id", existing.id);
        }
      } else {
        await sb.from("gallery_refleksi").insert({
          student_name: name,
          body: r.body,
          source: "google_docs",
        });
        added++;
      }
    }
    // skills hints → append to skills meta notes (non-destructive)
    if (parsed.skillsHints.length) {
      const { data: sk } = await sb.from("gallery_skills_meta").select("*").eq("id", "main").maybeSingle();
      const notes = (sk && sk.sync_notes) || [];
      const mergedNotes = [...new Set([...(notes || []), ...parsed.skillsHints])].slice(0, 500);
      await sb.from("gallery_skills_meta").upsert({
        id: "main",
        sync_notes: mergedNotes,
        updated_at: new Date().toISOString(),
        docs_url: editUrl,
      });
    }
    return { refleksiParsed: parsed.refleksi.length, refleksiAdded: added, skillsHints: parsed.skillsHints.length, lines: parsed.lineCount };
  }

  async function loadRefleksiFromDb() {
    const sb = client();
    if (!sb) return null;
    const { data, error } = await sb.from("gallery_refleksi").select("*").order("student_name");
    if (error) throw error;
    return data || [];
  }

  async function loadSkillsMetaFromDb() {
    const sb = client();
    if (!sb) return null;
    const { data, error } = await sb.from("gallery_skills_meta").select("*").eq("id", "main").maybeSingle();
    if (error) throw error;
    return data;
  }


  function parseCsv(text) {
    const rows = [];
    let row = [], cur = "", inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i + 1];
      if (inQ) {
        if (c === '"' && n === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ",") { row.push(cur); cur = ""; }
        else if (c === "\n" || c === "\r") {
          if (c === "\r" && n === "\n") i++;
          row.push(cur); rows.push(row); row = []; cur = "";
        } else cur += c;
      }
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  async function fetchSheetCsv(sheetId, sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Gagal unduh sheet " + sheetName + " (" + res.status + ")");
    return await res.text();
  }

  function findHeaderIndex(rows) {
    for (let i = 0; i < Math.min(rows.length, 8); i++) {
      const lower = rows[i].map((c) => String(c || "").toLowerCase());
      if (lower.some((c) => c === "nama" || c.includes("nama"))) return i;
    }
    return 0;
  }

  function colIndex(header, names) {
    const h = header.map((c) => String(c || "").toLowerCase().trim());
    for (const n of names) {
      const i = h.findIndex((x) => x === n || x.includes(n));
      if (i >= 0) return i;
    }
    return -1;
  }

  /** Import nama + nickname + intro video dari Sheet 51 & 52 angkatan 2025 */

  /** Parse CSV text (header row required). Columns flexible: angkatan/year, kelas/class, nama/name */
  function parseStudentsCsv(text) {
    const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    function splitCsvLine(line) {
      const out = [];
      let cur = "";
      let q = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (q && line[i + 1] === '"') { cur += '"'; i++; }
          else q = !q;
        } else if (ch === "," && !q) {
          out.push(cur.trim());
          cur = "";
        } else cur += ch;
      }
      out.push(cur.trim());
      return out;
    }
    const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
    const idx = (cands) => {
      for (const c of cands) {
        const i = headers.findIndex((h) => h === c || h.includes(c));
        if (i >= 0) return i;
      }
      return -1;
    };
    const iYear = idx(["angkatan_year", "angkatan", "tahun", "year"]);
    const iClass = idx(["class_code", "kelas", "class"]);
    const iName = idx(["nama_siswa", "nama", "name", "student_name", "display_name"]);
    const iRole = idx(["role", "peran", "status", "tipe"]);
    if (iName < 0) throw new Error("Kolom nama wajib (nama / name / nama_siswa)");
    const rows = [];
    for (let li = 1; li < lines.length; li++) {
      const cols = splitCsvLine(lines[li]);
      if (!cols.length || cols.every((c) => !c)) continue;
      const name = (cols[iName] || "").trim();
      if (!name) continue;
      let year = iYear >= 0 ? String(cols[iYear] || "").trim() : "";
      year = year.replace(/[^\d]/g, "").slice(0, 4);
      let kelas = iClass >= 0 ? String(cols[iClass] || "").trim() : "";
      kelas = kelas.replace(/[^\d]/g, "").slice(0, 2);
      let roleRaw = iRole >= 0 ? String(cols[iRole] || "").trim().toLowerCase() : "";
      let role = "Santriwati";
      if (/pengajar|teacher|guru/.test(roleRaw)) role = "Pengajar";
      else if (/alumni/.test(roleRaw)) role = "Alumni";
      else if (/siswa|santri|student/.test(roleRaw) || !roleRaw) role = "Santriwati";
      rows.push({ name, angkatan_year: year, class_code: kelas, role });
    }
    return rows;
  }

  async function fetchSheetCsv(sheetIdOrUrl, gid) {
    let id = String(sheetIdOrUrl || "").trim();
    const m = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (m) id = m[1];
    if (!id) throw new Error("ID atau URL Google Sheet wajib");
    const g = gid != null && String(gid).trim() !== "" ? String(gid).trim() : "0";
    const url = "https://docs.google.com/spreadsheets/d/" + id + "/export?format=csv&gid=" + encodeURIComponent(g);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Gagal unduh Sheet (status " + res.status + "). Pastikan file dibagikan: Anyone with the link can view.");
    return await res.text();
  }

  async function importStudentsBulkFromRows(rows) {
    if (!(await isCurrentUserAdmin())) {
      const p = await getMyProfile();
      const ok = p && (p.is_admin || p.role === "teacher" || (p.permissions && (p.permissions.alumni || p.permissions.manage_attendance)));
      if (!ok) throw new Error("Tidak berhak mengimpor data Users");
    }
    const list = rows || [];
    if (!list.length) throw new Error("Tidak ada baris data");
    let angs = await adminListAngkatanAll();
    const ensureAng = async (year) => {
      const y = String(year || "").trim();
      if (!/^\d{4}$/.test(y)) throw new Error("Angkatan tidak valid: " + year);
      let hit = (angs || []).find((a) => String(a.label || "").includes(y));
      if (hit) return hit;
      hit = await adminUpsertAngkatan({ label: "Angkatan " + y });
      angs = await adminListAngkatanAll();
      return hit;
    };
    let added = 0,
      skipped = 0,
      errors = [];
    const existing = await adminListAlumni();
    const keyOf = (n, y, c, role) =>
      (n || "").toLowerCase().trim() + "|" + (y || "") + "|" + (c || "") + "|" + (role || "");
    const have = new Set(
      (existing || []).map((al) => {
        const ang = al.gallery_angkatan || {};
        const m = String(ang.label || "").match(/20\d{2}/);
        return keyOf(al.name, m ? m[0] : "", al.class_code || "", al.role || "Santriwati");
      })
    );
    for (const r of list) {
      try {
        const name = String(r.name || "").trim();
        const year = String(r.angkatan_year || "").trim();
        const kelas = String(r.class_code || "").trim();
        const role = String(r.role || "Santriwati").trim() || "Santriwati";
        if (!name) {
          skipped++;
          continue;
        }
        // Pengajar: nama wajib; angkatan/kelas opsional
        if (role === "Pengajar") {
          const k = keyOf(name, year || "", kelas || "", "Pengajar");
          if (have.has(k) || [...have].some((h) => h.startsWith(name.toLowerCase().trim() + "|") && h.endsWith("|Pengajar"))) {
            skipped++;
            continue;
          }
          let angId = null;
          if (year && /^\d{4}$/.test(year)) {
            const ang = await ensureAng(year);
            angId = ang && ang.id;
          }
          await adminUpsertAlumni({
            name,
            classCode: kelas || "",
            angkatanId: angId,
            role: "Pengajar",
          });
          have.add(k);
          added++;
          continue;
        }
        // Siswa / Alumni: butuh angkatan + kelas
        if (!year || !kelas) {
          skipped++;
          continue;
        }
        const k = keyOf(name, year, kelas, role);
        if (have.has(k)) {
          skipped++;
          continue;
        }
        const ang = await ensureAng(year);
        await adminUpsertAlumni({
          name,
          classCode: kelas,
          angkatanId: ang.id,
          role: role === "Alumni" ? "Alumni" : "Santriwati",
        });
        have.add(k);
        added++;
      } catch (e) {
        errors.push((r.name || "?") + ": " + (e.message || e));
      }
    }
    return { added, skipped, errors, total: list.length };
  }

  async function importStudentsBulkFromSheet(sheetIdOrUrl, gid) {
    const csv = await fetchSheetCsv(sheetIdOrUrl, gid);
    const rows = parseStudentsCsv(csv);
    return importStudentsBulkFromRows(rows);
  }

  async function importStudentsBulkFromCsvText(text) {
    const rows = parseStudentsCsv(text);
    return importStudentsBulkFromRows(rows);
  }

  async function importRosterFromSheet2025(sheetId) {
    if (!(await isCurrentUserAdmin())) throw new Error("Admin only");
    const sb = client();
    sheetId = sheetId || "1kr4Dvd2LcrCJLYvhwnYkWcRhUXPgTw9uZlOaeTK8SXE";
    const year = 2025;
    let aliasesUpserted = 0;
    let videosAdded = 0;
    let websitesHint = 0;

    // pastikan angkatan 2025
    let angList = await listAngkatan({ mainOnly: false });
    let ang = angList.find((a) => String(a.label || "").includes("2025"));
    if (!ang) {
      const { data } = await sb.from("gallery_angkatan").insert({ label: "Angkatan 2025", label_norm: "angkatan-2025" }).select("*").single();
      ang = data;
    }

    // kategori karya siswa
    const cats = await listVideoCategories();
    const ks = cats.find((c) => c.slug === "karya-siswa");
    const catId = ks ? ks.id : (cats[0] && cats[0].id) || null;

    for (const classCode of ["51", "52"]) {
      const csv = await fetchSheetCsv(sheetId, classCode);
      const rows = parseCsv(csv);
      const hi = findHeaderIndex(rows);
      const header = rows[hi] || [];
      const iNama = colIndex(header, ["nama"]);
      const iNick = colIndex(header, ["nickname", "nick"]);
      const iEmail = colIndex(header, ["email"]);
      const iIntro = colIndex(header, ["edited intro", "intro vid", "edited intro vid"]);
      const iGh = colIndex(header, ["hosting", "github"]);
      if (iNama < 0) throw new Error("Kolom NAMA tidak ketemu di sheet " + classCode);

      for (let r = hi + 1; r < rows.length; r++) {
        const row = rows[r];
        const official = String(row[iNama] || "").trim();
        if (!official || /^\d+$/.test(official) || official.toLowerCase() === "nama") continue;
        const nickname = iNick >= 0 ? String(row[iNick] || "").trim() : "";
        const email = iEmail >= 0 ? String(row[iEmail] || "").trim() : "";
        let intro = iIntro >= 0 ? String(row[iIntro] || "").trim() : "";
        // normalize dai.ly short links
        if (intro && intro.includes("dai.ly/") && !intro.includes("dailymotion.com")) {
          const id = intro.split("dai.ly/")[1].split(/[?\s]/)[0];
          intro = "https://www.dailymotion.com/video/" + id;
        }
        const gh = iGh >= 0 ? String(row[iGh] || "").trim().split(/\s+/)[0] : "";

        const { error: eA } = await sb.from("gallery_student_aliases").upsert(
          {
            official_name: official,
            nickname,
            angkatan_year: year,
            class_code: classCode,
            email,
            intro_video_url: intro,
            github_pages: gh,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "angkatan_year,class_code,official_name" }
        );
        if (!eA) aliasesUpserted++;

        // alumni + website github jika ada
        const nameNorm = normLabel(official);
        let { data: al } = await sb
          .from("gallery_alumni")
          .select("id")
          .eq("angkatan_id", ang.id)
          .eq("name_norm", nameNorm)
          .maybeSingle();
        if (!al) {
          const ins = await sb
            .from("gallery_alumni")
            .insert({
              name: official,
              name_norm: nameNorm,
              angkatan_id: ang.id,
              class_code: classCode,
              role: "Santriwati",
            })
            .select("id")
            .single();
          al = ins.data;
        }
        if (gh && al && gh.startsWith("http")) {
          const nu = normUrl(gh);
          const { data: existing } = await sb.from("gallery_websites").select("id,url").eq("alumni_id", al.id);
          const has = (existing || []).some((w) => normUrl(w.url) === nu);
          if (!has) {
            await sb.from("gallery_websites").insert({
              alumni_id: al.id,
              title: official + " · Web",
              url: gh.split("#")[0],
              category: "Web Kreatif",
              description: "Dari roster sheet 2025",
            });
            websitesHint++;
          }
        }

        // intro video
        if (intro && al && intro.startsWith("http")) {
          const { data: vids } = await sb
            .from("gallery_videos")
            .select("id,url")
            .ilike("owner_name", official);
          const hasV = (vids || []).some((v) => normUrl(v.url) === normUrl(intro) || String(v.url).includes(intro.slice(-8)));
          if (!hasV) {
            let embed = intro;
            const yt = intro.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{6,})/);
            if (yt) embed = "https://www.youtube.com/embed/" + yt[1];
            const dm = intro.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
            if (dm) embed = "https://www.dailymotion.com/embed/video/" + dm[1];
            await sb.from("gallery_videos").insert({
              title: "Intro · " + official,
              url: intro,
              platform: yt ? "youtube" : dm ? "dailymotion" : "other",
              embed_url: embed,
              category_id: catId,
              description: "Edited intro video · Kelas " + classCode + " · Angkatan 2025",
              owner_name: official,
              created_by: "sheet-import",
            });
            videosAdded++;
          }
        }
      }
    }

    return { aliasesUpserted, videosAdded, websitesHint, year, sheetId };
  }

  async function runAiDocsSync({ docsUrls, sheetId }) {
    if (!(await isCurrentUserAdmin())) throw new Error("Admin only");
    const session = await getSession();
    if (!session) throw new Error("Belum login");
    const c = cfg();
    const base = String(c.url || "").replace(/\/$/, "");
    const res = await fetch(base + "/functions/v1/sync-ai-docs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + session.access_token,
        apikey: c.anonKey,
      },
      body: JSON.stringify({ docsUrls, sheetId }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || j.detail || ("AI sync gagal " + res.status));
    return j;
  }

  async function loadAiSkills() {
    const sb = client();
    if (!sb) return null;
    const { data, error } = await sb.from("gallery_ai_skills").select("*").eq("id", "main").maybeSingle();
    if (error) throw error;
    return data;
  }


  async function listAnnouncementsAdmin() {
    if (!(await isCurrentUserAdmin())) throw new Error("Admin only");
    const sb = client();
    const { data, error } = await sb.from("gallery_announcements").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  function extractVoiceUrlsFromHtml(html) {
    const s = String(html || "");
    const out = [];
    const re = /data-voice-url=["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(s))) out.push(m[1]);
    const re2 = /<audio[^>]+src=["']([^"']+)["']/gi;
    while ((m = re2.exec(s))) out.push(m[1]);
    return [...new Set(out.filter(Boolean))];
  }

  async function deleteChatStorageByPublicUrl(publicUrl) {
    const sb = client();
    if (!sb || !publicUrl) return;
    try {
      const u = String(publicUrl);
      const marker = "/object/public/chat-images/";
      let path = "";
      const i = u.indexOf(marker);
      if (i >= 0) path = decodeURIComponent(u.slice(i + marker.length).split("?")[0]);
      else {
        const j = u.indexOf("/chat-images/");
        if (j >= 0) path = decodeURIComponent(u.slice(j + "/chat-images/".length).split("?")[0]);
      }
      if (!path) return;
      await sb.storage.from("chat-images").remove([path]);
    } catch (e) {
      console.warn("storage delete", e);
    }
  }

  async function upsertAnnouncement(payload) {
    if (!(await isCurrentUserAdmin())) throw new Error("Admin only");
    const sb = client();
    const session = await getSession();
    const nowIso = new Date().toISOString();
    let starts = payload.starts_at || nowIso;
    let ends = payload.ends_at || null;
    let duration_days = payload.duration_days != null && payload.duration_days !== "" ? Number(payload.duration_days) : null;
    let duration_hours = payload.duration_hours != null && payload.duration_hours !== "" ? Number(payload.duration_hours) : null;
    // Default: mulai sekarang (jika kosong), tampil 24 jam jika tidak ada selesai & tidak ada durasi
    if (!payload.starts_at) starts = nowIso;
    if (!ends && (duration_days == null || isNaN(duration_days)) && (duration_hours == null || isNaN(duration_hours))) {
      duration_hours = 24;
      duration_days = null;
    }
    const row = {
      title: payload.title || "",
      body_html: payload.body_html || "",
      audience: payload.audience || "public",
      target_students: payload.target_students || [],
      show_on: payload.show_on || "home",
      starts_at: starts,
      ends_at: ends,
      duration_days: duration_days != null && !isNaN(duration_days) ? duration_days : null,
      duration_hours: duration_hours != null && !isNaN(duration_hours) ? duration_hours : null,
      times_per_day: Number(payload.times_per_day) || 1,
      schedule_hours: payload.schedule_hours || [],
      schedule_days: Array.isArray(payload.schedule_days) ? payload.schedule_days : [],
      splash_seconds: Number(payload.splash_seconds) || 15,
      is_alarm: payload.is_alarm === true,
      active: payload.active !== false,
      created_by: (function () {
        const u = session && session.user;
        if (!u) return "";
        const meta = u.user_metadata || {};
        return meta.full_name || meta.name || u.email || "";
      })(),
      updated_at: nowIso,
    };
    if (payload.id) {
      // jika edit dan voice lama diganti/dihapus, bersihkan storage voice lama
      try {
        const { data: prev } = await sb.from("gallery_announcements").select("body_html").eq("id", payload.id).maybeSingle();
        const oldUrls = extractVoiceUrlsFromHtml(prev && prev.body_html);
        const newUrls = extractVoiceUrlsFromHtml(row.body_html);
        for (const u of oldUrls) {
          if (newUrls.indexOf(u) < 0) await deleteChatStorageByPublicUrl(u);
        }
      } catch (e) {}
      const { data, error } = await sb.from("gallery_announcements").update(row).eq("id", payload.id).select("*").single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await sb.from("gallery_announcements").insert(row).select("*").single();
    if (error) throw error;
    return data;
  }

  async function deleteAnnouncement(id) {
    if (!(await isCurrentUserAdmin())) throw new Error("Admin only");
    const sb = client();
    try {
      const { data: prev } = await sb.from("gallery_announcements").select("body_html").eq("id", id).maybeSingle();
      const urls = extractVoiceUrlsFromHtml(prev && prev.body_html);
      for (const u of urls) await deleteChatStorageByPublicUrl(u);
    } catch (e) {}
    const { error } = await sb.from("gallery_announcements").delete().eq("id", id);
    if (error) throw error;
  }

  async function fetchActiveAnnouncements() {
    const sb = client();
    if (!sb) return [];
    const { data, error } = await sb
      .from("gallery_announcements")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn(error);
      return [];
    }
    return data || [];
  }

  async function batchEngagement(urls) {
    const sb = client();
    const map = {};
    const list = [];
    (urls || []).forEach((u) => {
      const k = normUrl(u);
      if (!k) return;
      if (!map[k]) map[k] = { love: 0, comment: 0 };
      list.push(u);
      list.push(k);
    });
    if (!sb || !list.length) return map;
    try {
      const uniq = [...new Set(list)];
      const seen = new Set();
      for (let i = 0; i < uniq.length; i += 100) {
        const slice = uniq.slice(i, i + 100);
        const { data } = await sb
          .from("gallery_reactions")
          .select("id,target_id,reaction_type")
          .eq("target_type", "website")
          .in("target_id", slice);
        (data || []).forEach((r) => {
          if (seen.has(r.id)) return;
          seen.add(r.id);
          const k = normUrl(r.target_id);
          if (!map[k]) map[k] = { love: 0, comment: 0 };
          const t = String(r.reaction_type || "");
          if (t.indexOf("love") >= 0 || t === "like") map[k].love += 1;
          else if (t.indexOf("comment") >= 0) map[k].comment += 1;
        });
      }
    } catch (e) {
      console.warn("batchEngagement", e);
    }
    return map;
  }

  async function countReactions(targetType, targetId) {
    const sb = client();
    if (!sb) return { loveRed: 0, loveBlue: 0, commentRed: 0, commentBlue: 0 };
    const { data, error } = await sb
      .from("gallery_reactions")
      .select("reaction_type,is_registered")
      .eq("target_type", targetType)
      .eq("target_id", String(targetId));
    if (error) throw error;
    const c = { loveRed: 0, loveBlue: 0, commentRed: 0, commentBlue: 0 };
    (data || []).forEach((r) => {
      if (r.reaction_type === "love") {
        if (r.is_registered) c.loveBlue++;
        else c.loveRed++;
      } else if (r.reaction_type === "comment") {
        if (r.is_registered) c.commentBlue++;
        else c.commentRed++;
      }
    });
    return c;
  }

  async function listComments(targetType, targetId) {
    const sb = client();
    const { data, error } = await sb
      .from("gallery_reactions")
      .select("*")
      .eq("target_type", targetType)
      .eq("target_id", String(targetId))
      .eq("reaction_type", "comment")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  }

  async function addLove(targetType, targetId, authorName) {
    const sb = client();
    if (!sb) throw new Error("Layanan interaksi belum siap");
    let userId = null;
    let isReg = false;
    let name = String(authorName || "").trim();
    try {
      const sess = await getSession();
      if (sess && sess.user) {
        userId = sess.user.id;
        isReg = true;
        const meta = sess.user.user_metadata || {};
        name = name || meta.full_name || meta.name || sess.user.email || "User";
        await upsertMyProfileFromSession();
      }
    } catch (e) {}
    if (!isReg) {
      try {
        const saved = sessionStorage.getItem("sh_guest_name");
        if (saved) name = name || saved;
      } catch (e) {}
      if (name.length < 2) throw new Error("Isi nama dulu (sekali saja per kunjungan).");
      try { sessionStorage.setItem("sh_guest_name", name); } catch (e) {}
    }

    const row = {
      target_type: targetType,
      target_id: String(targetId),
      reaction_type: "love",
      is_registered: isReg,
      author_name: name.slice(0, 60),
      author_user_id: userId,
      body: "",
    };
    const { data, error } = await sb.from("gallery_reactions").insert(row).select("id").single();
    if (error) {
      if (error.code === "23505") throw new Error("Kamu sudah memberi love pada karya ini.");
      throw error;
    }
    try {
      sessionStorage.setItem("sh_love_" + targetType + "_" + targetId, data.id + "|" + (isReg ? "blue" : "red"));
    } catch (e) {}
    await trackEvent(isReg ? "love_blue" : "love_red", { targetType, targetId });
    const counts = await countReactions(targetType, targetId);
    return { counts, reactionId: data.id, isRegistered: isReg, active: true };
  }

  async function removeLove(targetType, targetId) {
    const sb = client();
    if (!sb) throw new Error("Layanan interaksi belum siap");
    let key = "sh_love_" + targetType + "_" + targetId;
    let reactionId = null;
    let wasReg = false;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parts = raw.split("|");
        reactionId = parts[0];
        wasReg = parts[1] === "blue";
      }
    } catch (e) {}

    const sess = await getSession();
    if (sess && sess.user) {
      const { data } = await sb
        .from("gallery_reactions")
        .select("id,is_registered")
        .eq("target_type", targetType)
        .eq("target_id", String(targetId))
        .eq("reaction_type", "love")
        .eq("author_user_id", sess.user.id)
        .maybeSingle();
      if (data) {
        reactionId = data.id;
        wasReg = !!data.is_registered;
      }
    }

    if (!reactionId) {
      // guest: match by saved name
      let name = "";
      try { name = sessionStorage.getItem("sh_guest_name") || ""; } catch (e) {}
      if (name) {
        const { data } = await sb
          .from("gallery_reactions")
          .select("id")
          .eq("target_type", targetType)
          .eq("target_id", String(targetId))
          .eq("reaction_type", "love")
          .eq("is_registered", false)
          .eq("author_name", name)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) reactionId = data.id;
      }
    }
    if (!reactionId) throw new Error("Belum ada love dari kamu pada karya ini.");
    const { error } = await sb.from("gallery_reactions").delete().eq("id", reactionId);
    if (error) throw error;
    try { sessionStorage.removeItem(key); } catch (e) {}
    const counts = await countReactions(targetType, targetId);
    return { counts, active: false, isRegistered: wasReg };
  }

  async function toggleLove(targetType, targetId, authorName) {
    let active = false;
    try {
      const raw = sessionStorage.getItem("sh_love_" + targetType + "_" + targetId);
      if (raw) active = true;
    } catch (e) {}
    const sess = await getSession();
    if (sess && sess.user) {
      const sb = client();
      const { data } = await sb
        .from("gallery_reactions")
        .select("id")
        .eq("target_type", targetType)
        .eq("target_id", String(targetId))
        .eq("reaction_type", "love")
        .eq("author_user_id", sess.user.id)
        .maybeSingle();
      if (data) active = true;
    }
    if (active) return removeLove(targetType, targetId);
    return addLove(targetType, targetId, authorName);
  }

  function getGuestName() {
    try { return sessionStorage.getItem("sh_guest_name") || ""; } catch (e) { return ""; }
  }
  function setGuestName(n) {
    try { sessionStorage.setItem("sh_guest_name", String(n || "").trim()); } catch (e) {}
  }
  function hasLovedLocal(targetType, targetId) {
    try { return !!sessionStorage.getItem("sh_love_" + targetType + "_" + targetId); } catch (e) { return false; }
  }

  async function addComment(targetType, targetId, authorName, body) {
    const sb = client();
    if (!sb) throw new Error("Database belum siap");
    const text = String(body || "").trim();
    if (text.length < 2) throw new Error("Komentar terlalu pendek.");
    let userId = null;
    let isReg = false;
    let name = String(authorName || "").trim();
    try {
      const sess = await getSession();
      if (sess && sess.user) {
        userId = sess.user.id;
        isReg = true;
        const meta = sess.user.user_metadata || {};
        name = name || meta.full_name || meta.name || sess.user.email || "User";
        await upsertMyProfileFromSession();
      }
    } catch (e) {}
    if (!isReg) {
      try {
        const saved = sessionStorage.getItem("sh_guest_name");
        if (saved) name = name || saved;
      } catch (e) {}
      if (name.length < 2) throw new Error("Isi nama dulu (sekali saja per kunjungan).");
      try { sessionStorage.setItem("sh_guest_name", name); } catch (e) {}
    }

    const { error } = await sb.from("gallery_reactions").insert({
      target_type: targetType,
      target_id: String(targetId),
      reaction_type: "comment",
      is_registered: isReg,
      author_name: name.slice(0, 60),
      author_user_id: userId,
      body: text.slice(0, 500),
    });
    if (error) throw error;
    await trackEvent(isReg ? "comment_blue" : "comment_red", { targetType, targetId });
    return countReactions(targetType, targetId);
  }

  async function getStatsSummary() {
    const sb = client();
    if (!sb) return null;
    const sinceToday = new Date();
    sinceToday.setHours(0, 0, 0, 0);
    const isoToday = sinceToday.toISOString();

    async function countType(type, since) {
      let q = sb.from("gallery_events").select("id", { count: "exact", head: true }).eq("event_type", type);
      if (since) q = q.gte("created_at", since);
      const { count, error } = await q;
      if (error) return 0;
      return count || 0;
    }

    const types = ["visit", "click", "signup", "love_red", "love_blue", "comment_red", "comment_blue"];
    const all = {};
    const today = {};
    for (const ty of types) {
      all[ty] = await countType(ty, null);
      today[ty] = await countType(ty, isoToday);
    }

    // reactions totals as backup
    const { data: reacts } = await sb.from("gallery_reactions").select("reaction_type,is_registered");
    let lr = 0, lb = 0, cr = 0, cb = 0;
    (reacts || []).forEach((r) => {
      if (r.reaction_type === "love") r.is_registered ? lb++ : lr++;
      if (r.reaction_type === "comment") r.is_registered ? cb++ : cr++;
    });
    if (all.love_red < lr) all.love_red = lr;
    if (all.love_blue < lb) all.love_blue = lb;
    if (all.comment_red < cr) all.comment_red = cr;
    if (all.comment_blue < cb) all.comment_blue = cb;

    // profiles = signup
    const { count: profiles } = await sb.from("gallery_profiles").select("id", { count: "exact", head: true });
    if ((profiles || 0) > all.signup) all.signup = profiles || 0;

    return { all, today };
  }

  /**
   * Online count — sederhana & andal:
   * 1) Langsung tampilkan minimal 1 (diri sendiri)
   * 2) Supabase Realtime Presence (tanpa tabel) = sumber utama antar-pengunjung
   * 3) Opsional: tabel gallery_online jika ada (heartbeat)
   */

  /** Realtime absensi: sesi + record berubah → callback (siswa & guru) */
  function subscribeAttendanceLive(onChange) {
    const sb = client();
    if (!sb || typeof onChange !== "function") return { leave() {} };
    let ch = null;
    try {
      ch = sb
        .channel("att-live-" + Math.random().toString(36).slice(2, 8))
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "gallery_attendance_sessions" },
          function () {
            try {
              onChange("sessions");
            } catch (e) {}
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "gallery_attendance_records" },
          function () {
            try {
              onChange("records");
            } catch (e) {}
          }
        )
        .subscribe();
    } catch (e) {
      console.warn("[att-live]", e);
    }
    return {
      leave() {
        try {
          if (ch) sb.removeChannel(ch);
        } catch (e) {}
      },
    };
  }

  function joinPresenceOnline(onCount) {
    const sb = client();
    let left = false;
    let channel = null;
    let heartbeat = null;
    let lastN = 1;

    function report(n) {
      if (left) return;
      const v = Math.max(1, parseInt(n, 10) || 1);
      lastN = v;
      try {
        if (typeof onCount === "function") onCount(v);
      } catch (e) {}
    }

    // SELALU langsung tampil (jangan biarkan "—")
    report(1);

    if (!sb) {
      return { leave() { left = true; } };
    }

    const key = sessionId();

    // --- Realtime Presence (inti, tanpa SQL tabel) ---
    try {
      channel = sb.channel("online-visitors", {
        config: { presence: { key: key } },
      });

      function countPresence() {
        try {
          const state = channel.presenceState() || {};
          const n = Object.keys(state).length;
          report(n > 0 ? n : lastN);
        } catch (e) {
          report(lastN);
        }
      }

      channel
        .on("presence", { event: "sync" }, countPresence)
        .on("presence", { event: "join" }, countPresence)
        .on("presence", { event: "leave" }, countPresence)
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            try {
              let loggedIn = false;
              let userId = null;
              try {
                const sess = await getSession();
                if (sess && sess.user) {
                  loggedIn = true;
                  userId = sess.user.id;
                }
              } catch (e) {}
              await channel.track({
                online_at: new Date().toISOString(),
                path: (location && location.pathname) || "/",
                logged_in: loggedIn,
                user_id: userId,
              });
              countPresence();
            } catch (e) {
              report(1);
            }
          }
        });
    } catch (e) {
      console.warn("[online] presence", e);
      report(1);
    }

    // --- Opsional: heartbeat ke tabel (jika sudah di-SQL) ---
    async function dbTick() {
      if (left || !sb) return;
      try {
        const row = {
          session_id: key,
          last_seen: new Date().toISOString(),
          path: (location && location.pathname) || "/",
        };
        const up = await sb.from("gallery_online").upsert(row, { onConflict: "session_id" });
        if (up.error) return; // tabel belum ada → abaikan
        const since = new Date(Date.now() - 60000).toISOString();
        const { count, error } = await sb
          .from("gallery_online")
          .select("session_id", { count: "exact", head: true })
          .gt("last_seen", since);
        if (!error && typeof count === "number" && count > 0) {
          // ambil max antara presence & db
          report(Math.max(count, lastN));
        }
      } catch (e) {
        /* diam — presence tetap jalan */
      }
    }

    dbTick();
    heartbeat = setInterval(dbTick, 20000);

    function onVis() {
      if (document.visibilityState === "visible") {
        try {
          if (channel) {
            channel.track({
              online_at: new Date().toISOString(),
              path: (location && location.pathname) || "/",
            });
          }
        } catch (e) {}
        dbTick();
      }
    }
    document.addEventListener("visibilitychange", onVis);

    return {
      leave() {
        left = true;
        try {
          if (heartbeat) clearInterval(heartbeat);
          document.removeEventListener("visibilitychange", onVis);
          if (channel && sb) sb.removeChannel(channel);
        } catch (e) {}
      },
    };
  }


  async function getStatsTimeseries(days) {
    const sb = client();
    if (!sb) return { labels: [], series: {} };
    const d = Math.min(Math.max(days || 14, 3), 60);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (d - 1));
    const { data, error } = await sb
      .from("gallery_events")
      .select("event_type,created_at")
      .gte("created_at", since.toISOString());
    if (error) throw error;
    const labels = [];
    for (let i = 0; i < d; i++) {
      const x = new Date(since);
      x.setDate(since.getDate() + i);
      labels.push(x.toISOString().slice(0, 10));
    }
    const keys = ["visit", "click", "signup", "love_red", "love_blue", "comment_red", "comment_blue"];
    const series = {};
    keys.forEach((k) => {
      series[k] = labels.map(() => 0);
    });
    (data || []).forEach((row) => {
      const day = String(row.created_at || "").slice(0, 10);
      const idx = labels.indexOf(day);
      if (idx < 0) return;
      const k = row.event_type;
      if (series[k]) series[k][idx]++;
    });
    return { labels, series };
  }

  async function sumReactionsForUrls(urls) {
    const sb = client();
    const list = (urls || []).map((u) => String(u || "").trim()).filter(Boolean);
    if (!sb || !list.length) return { loveRed: 0, loveBlue: 0, commentRed: 0, commentBlue: 0, score: 0 };
    // chunk in queries
    let loveRed = 0, loveBlue = 0, commentRed = 0, commentBlue = 0;
    const chunk = 50;
    for (let i = 0; i < list.length; i += chunk) {
      const part = list.slice(i, i + chunk);
      const { data, error } = await sb
        .from("gallery_reactions")
        .select("reaction_type,is_registered,target_id")
        .eq("target_type", "website")
        .in("target_id", part);
      if (error) throw error;
      (data || []).forEach((r) => {
        if (r.reaction_type === "love") {
          if (r.is_registered) loveBlue++;
          else loveRed++;
        } else if (r.reaction_type === "comment") {
          if (r.is_registered) commentBlue++;
          else commentRed++;
        }
      });
    }
    // skor: merah lebih ringan, biru lebih bernilai (login)
    const score = loveRed * 1 + loveBlue * 2 + commentRed * 2 + commentBlue * 3;
    return { loveRed, loveBlue, commentRed, commentBlue, score };
  }

  // ===== Absensi online =====
  function canManageAttendance(prof) {
    if (!prof) return false;
    if (prof.is_admin) return true;
    const p = prof.permissions || {};
    return !!(p.manage_attendance || p.attendance || p.is_teacher);
  }

  async function listAttendanceSessionsAdmin() {
    const sb = client();
    if (!sb) return [];
    if (!(await isCurrentUserAdmin()) && !(await (async () => {
      const p = await getMyProfile();
      return canManageAttendance(p);
    })())) throw new Error("Tidak berhak mengelola absensi");
    const { data, error } = await sb
      .from("gallery_attendance_sessions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function upsertAttendanceSession(payload) {
    const sb = client();
    if (!sb) throw new Error("Database belum dikonfigurasi");
    const session = await getSession();
    if (!session || !session.user) throw new Error("Sesi login habis. Silakan login ulang sebagai admin.");
    const prof = await getMyProfile();
    if (!(await isCurrentUserAdmin()) && !canManageAttendance(prof)) {
      throw new Error("Tidak berhak mengelola absensi (butuh admin atau izin manage_attendance).");
    }
    const normT = (v, fb) => {
      const s = String(v || "").trim();
      const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (!m) return fb;
      return (
        String(Math.min(23, parseInt(m[1], 10))).padStart(2, "0") +
        ":" +
        String(Math.min(59, parseInt(m[2], 10))).padStart(2, "0") +
        ":" +
        (m[3] ? String(Math.min(59, parseInt(m[3], 10))).padStart(2, "0") : "00")
      );
    };
    const weekdays = (payload.weekdays || [])
      .map((n) => parseInt(n, 10))
      .filter((n) => n >= 1 && n <= 7);
    const targets = Array.isArray(payload.target_students) ? payload.target_students : [];
    const row = {
      title: String(payload.title || "Sesi absensi").trim().slice(0, 200),
      subject_code: String(payload.subject_code || "SMM").slice(0, 32),
      subject_label: String(payload.subject_label || "Social Media Marketing").slice(0, 120),
      description: payload.description || "",
      audience: payload.audience || (targets.length ? "students" : "all_linked"),
      target_students: targets,
      target_years: (payload.target_years || []).map(String),
      target_classes: (payload.target_classes || []).map(String),
      session_date: payload.session_date || null,
      weekdays,
      checkin_start: normT(payload.checkin_start, "07:00:00"),
      checkin_end: normT(payload.checkin_end, "07:15:00"),
      checkout_start: normT(payload.checkout_start, "08:20:00"),
      checkout_end: normT(payload.checkout_end, "08:40:00"),
      timezone: payload.timezone || "Asia/Jakarta",
      require_checkout: payload.require_checkout !== false,
      allow_late: !!payload.allow_late,
      active: payload.active !== false,
      msg_checkin_ontime: String(payload.msg_checkin_ontime || "").trim().slice(0, 280),
      msg_checkin_late: String(payload.msg_checkin_late || "").trim().slice(0, 280),
      msg_checkout: String(payload.msg_checkout || "").trim().slice(0, 280),
      updated_at: new Date().toISOString(),
    };
    async function writeSession(isUpdate) {
      if (isUpdate) {
        const { data, error } = await sb.from("gallery_attendance_sessions").update(row).eq("id", payload.id).select("*").single();
        if (error) {
          // kolom allow_late belum ada
          if (/allow_late|msg_checkin|msg_checkout/i.test(String(error.message || ""))) {
            delete row.allow_late;
            delete row.msg_checkin_ontime;
            delete row.msg_checkin_late;
            delete row.msg_checkout;
            const r2 = await sb.from("gallery_attendance_sessions").update(row).eq("id", payload.id).select("*").single();
            if (r2.error) throw new Error(r2.error.message || JSON.stringify(r2.error));
            return r2.data;
          }
          throw new Error(error.message || JSON.stringify(error));
        }
        return data;
      }
      row.created_by = session.user.id;
      {
        const meta = (session.user && session.user.user_metadata) || {};
        row.created_by_email = meta.full_name || meta.name || session.user.email || "Pengajar";
      }
      const { data, error } = await sb.from("gallery_attendance_sessions").insert(row).select("*").single();
      if (error) {
        if (/allow_late|msg_checkin|msg_checkout/i.test(String(error.message || ""))) {
          delete row.allow_late;
          delete row.msg_checkin_ontime;
          delete row.msg_checkin_late;
          delete row.msg_checkout;
          const r2 = await sb.from("gallery_attendance_sessions").insert(row).select("*").single();
          if (r2.error) throw new Error(r2.error.message || JSON.stringify(r2.error));
          return r2.data;
        }
        throw new Error(error.message || JSON.stringify(error));
      }
      return data;
    }
    const saved = await writeSession(!!payload.id);
    // Setelah guru ubah batas check-in/out: hitung ulang status record (hindari "terlambat" palsu)
    try {
      if (saved && saved.id) {
        await recomputeAttendanceStatusesForSession(saved);
      }
    } catch (e) {
      console.warn("[att] recompute statuses", e);
    }
    return saved;
  }

  /** Hitung ulang on_time/late semua record sesi berdasarkan batas waktu SESI SAAT INI */
  async function recomputeAttendanceStatusesForSession(sess) {
    const sb = client();
    if (!sb || !sess || !sess.id) return;
    const toMin = (t) => {
      const p = String(t || "0:0").slice(0, 5).split(":");
      return parseInt(p[0], 10) * 60 + parseInt(p[1] || 0, 10);
    };
    const minsJak = (iso) => {
      if (!iso) return null;
      const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const parts = Object.fromEntries(fmt.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
      return parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10);
    };
    const ci1 = toMin(sess.checkin_end);
    const co1 = toMin(sess.checkout_end);
    const { data: recs, error } = await sb
      .from("gallery_attendance_records")
      .select("id,checkin_at,checkout_at,checkin_status,checkout_status")
      .eq("session_id", sess.id);
    if (error || !recs || !recs.length) return;
    for (const r of recs) {
      const patch = { updated_at: new Date().toISOString() };
      let changed = false;
      if (r.checkin_at) {
        const m = minsJak(r.checkin_at);
        const st = m != null && m > ci1 ? "late" : "on_time";
        if (st !== r.checkin_status) {
          patch.checkin_status = st;
          changed = true;
        }
      }
      if (r.checkout_at) {
        const m = minsJak(r.checkout_at);
        const st = m != null && m > co1 ? "late" : "on_time";
        if (st !== r.checkout_status) {
          patch.checkout_status = st;
          changed = true;
        }
      }
      if (changed) {
        await sb.from("gallery_attendance_records").update(patch).eq("id", r.id);
      }
    }
  }

  async function deleteAttendanceSession(id) {
    if (!(await isCurrentUserAdmin())) {
      const p = await getMyProfile();
      if (!canManageAttendance(p)) throw new Error("Tidak berhak");
    }
    const sb = client();
    const { error } = await sb.from("gallery_attendance_sessions").delete().eq("id", id);
    if (error) throw error;
  }

  async function listActiveAttendanceSessions() {
    const sb = client();
    if (!sb) return [];
    const { data, error } = await sb
      .from("gallery_attendance_sessions")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn(error);
      return [];
    }
    return data || [];
  }

  async function myAttendanceRecords() {
    const sb = client();
    const session = await getSession();
    if (!sb || !session) return [];
    const { data, error } = await sb
      .from("gallery_attendance_records")
      .select("*")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function listAttendanceRecords(filters) {
    filters = filters || {};
    const sb = client();
    if (!sb) return [];
    let q = sb.from("gallery_attendance_records").select("*, gallery_attendance_sessions(title,subject_code,subject_label,session_date)").order("checkin_at", { ascending: false }).limit(500);
    if (filters.session_id) q = q.eq("session_id", filters.session_id);
    if (filters.class_code) q = q.eq("class_code", filters.class_code);
    if (filters.student_name) q = q.ilike("student_name", "%" + filters.student_name + "%");
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function submitAttendanceCheckin({ sessionId, note }) {
    const sb = client();
    const session = await getSession();
    if (!sb || !session) throw new Error("Login dulu");
    const prof = await getMyProfile();
    if (!prof || !prof.linked_student_name) throw new Error("Tautkan nama siswa di Profil dulu");
    const now = new Date().toISOString();
    // status on_time / late dari jendela sesi
    let checkin_status = "on_time";
    try {
      const { data: sess } = await sb.from("gallery_attendance_sessions").select("checkin_start,checkin_end,allow_late,active").eq("id", sessionId).maybeSingle();
      if (sess) {
        const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false });
        const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
        const mins = parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10);
        const toMin = (t) => { const p = String(t || "0:0").slice(0, 5).split(":"); return parseInt(p[0], 10) * 60 + parseInt(p[1] || 0, 10); };
        const ci0 = toMin(sess.checkin_start);
        const ci1 = toMin(sess.checkin_end);
        if (mins > ci1) {
          if (sess.allow_late) checkin_status = "late";
          else throw new Error("Waktu check-in sudah ditutup. Admin tidak mengizinkan absen terlambat.");
        } else if (mins < ci0) {
          throw new Error("Belum masuk waktu check-in.");
        }
      }
    } catch (e) {
      if (e && e.message && (e.message.includes("check-in") || e.message.includes("terlambat"))) throw e;
    }
    const row = {
      session_id: sessionId,
      user_id: session.user.id,
      student_name: prof.linked_student_name,
      angkatan_year: String(prof.linked_angkatan_year || ""),
      class_code: String(prof.linked_class_code || ""),
      email: session.user.email || "",
      checkin_at: now,
      checkin_note: String(note || "").slice(0, 120),
      checkin_status,
      updated_at: now,
    };
    const { data: existing } = await sb
      .from("gallery_attendance_records")
      .select("id,checkin_at")
      .eq("session_id", sessionId)
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (existing && existing.checkin_at) throw new Error("Sudah check-in untuk sesi ini");
    if (existing) {
      const { data, error } = await sb.from("gallery_attendance_records").update(row).eq("id", existing.id).select("*").single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await sb.from("gallery_attendance_records").insert(row).select("*").single();
    if (error) throw error;
    return data;
  }

  async function submitAttendanceCheckout({ sessionId, note }) {
    const sb = client();
    const session = await getSession();
    if (!sb || !session) throw new Error("Login dulu");
    const now = new Date().toISOString();
    const { data: existing, error: e1 } = await sb
      .from("gallery_attendance_records")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (e1) throw e1;
    if (!existing || !existing.checkin_at) throw new Error("Belum check-in");
    if (existing.checkout_at) throw new Error("Sudah check-out");
    let checkout_status = "on_time";
    try {
      const { data: sess } = await sb
        .from("gallery_attendance_sessions")
        .select("checkout_start,checkout_end,allow_late")
        .eq("id", sessionId)
        .maybeSingle();
      if (sess) {
        const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false });
        const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
        const mins = parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10);
        const toMin = (x) => {
          const p = String(x || "0:0").slice(0, 5).split(":");
          return parseInt(p[0], 10) * 60 + parseInt(p[1] || 0, 10);
        };
        const co1 = toMin(sess.checkout_end);
        if (mins > co1) checkout_status = "late";
      }
    } catch (e) {}
    const { data, error } = await sb
      .from("gallery_attendance_records")
      .update({
        checkout_at: now,
        checkout_note: String(note || "").slice(0, 120),
        checkout_status,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }


  async function listDesigns() {
    const sb = client();
    if (!sb) return [];
    const { data, error } = await sb.from("gallery_designs").select("*").eq("active", true).order("created_at", { ascending: false });
    if (error) {
      console.warn(error);
      return [];
    }
    return data || [];
  }


  async function listDesignsPublic() {
    const sb = client();
    if (!sb) return [];
    const { data, error } = await sb
      .from("gallery_designs")
      .select("id,title,image_url,category,author_name,description,created_at")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(120);
    if (error) throw error;
    return data || [];
  }
  async function adminListDesigns() {
    const sb = client();
    if (!sb) return [];
    if (!(await isCurrentUserAdmin()) && !(await hasPermission("designs"))) throw new Error("Tidak berhak");
    const { data, error } = await sb.from("gallery_designs").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function myDesigns() {
    const sb = client();
    const session = await getSession();
    if (!sb || !session) return [];
    const { data, error } = await sb
      .from("gallery_designs")
      .select("*")
      .eq("author_user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  /** Upload 1 file gambar ke bucket designs → public URL */
  async function uploadDesignFile(file) {
    const sb = client();
    const session = await getSession();
    if (!sb || !session) throw new Error("Login dulu");
    if (!file || !file.type || !String(file.type).startsWith("image/")) {
      throw new Error("File harus gambar (JPG/PNG/WebP/GIF)");
    }
    if (file.size > 8 * 1024 * 1024) throw new Error("Maks 8 MB per file");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = session.user.id + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    const { error } = await sb.storage.from("designs").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    const { data } = sb.storage.from("designs").getPublicUrl(path);
    return data && data.publicUrl ? data.publicUrl : null;
  }

  /**
   * Upload gambar chat (sudah dikompres di klien) ke bucket chat-images.
   * Path: {userId|anon}/{timestamp}-{rand}.jpg — dihapus cron setelah 24 jam.
   */
  async function uploadChatImage(blobOrFile) {
    const sb = client();
    if (!sb) throw new Error("Database belum dikonfigurasi");
    if (!blobOrFile) throw new Error("Tidak ada file gambar");
    const type = blobOrFile.type || "image/jpeg";
    if (!String(type).startsWith("image/")) throw new Error("File harus gambar");
    if (blobOrFile.size > 1.5 * 1024 * 1024) throw new Error("Gambar terlalu besar (maks ~1.5 MB setelah kompres)");
    let folder = "anon";
    try {
      const sess = await getSession();
      if (sess && sess.user) folder = sess.user.id;
    } catch (e) {}
    const path =
      folder +
      "/" +
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2, 8) +
      ".jpg";
    const { error } = await sb.storage.from("chat-images").upload(path, blobOrFile, {
      cacheControl: "86400",
      upsert: false,
      contentType: "image/jpeg",
    });
    if (error) throw error;
    const { data } = sb.storage.from("chat-images").getPublicUrl(path);
    return data && data.publicUrl ? data.publicUrl : null;
  }

  /**
   * Upload pesan suara (webm/ogg/mp4) ke bucket chat-images/voice/.
   * Retensi diurus klien + cron opsional (3j / 24j / selamanya).
   */
  async function uploadChatAudio(blobOrFile) {
    const sb = client();
    if (!sb) throw new Error("Database belum dikonfigurasi");
    if (!blobOrFile) throw new Error("Tidak ada file audio");
    const type = String(blobOrFile.type || "audio/webm");
    if (!type.startsWith("audio/") && type !== "video/webm") {
      throw new Error("File harus audio");
    }
    if (blobOrFile.size > 3 * 1024 * 1024) throw new Error("Pesan suara terlalu besar (maks ~3 MB)");
    let folder = "anon";
    try {
      const sess = await getSession();
      if (sess && sess.user) folder = sess.user.id;
    } catch (e) {}
    let ext = "webm";
    if (/ogg/i.test(type)) ext = "ogg";
    else if (/mp4|m4a|aac/i.test(type)) ext = "m4a";
    else if (/mpeg|mp3/i.test(type)) ext = "mp3";
    const path =
      "voice/" +
      folder +
      "/" +
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2, 8) +
      "." +
      ext;
    const { error } = await sb.storage.from("chat-images").upload(path, blobOrFile, {
      cacheControl: "86400",
      upsert: false,
      contentType: type.indexOf("audio/") === 0 ? type : "audio/webm",
    });
    if (error) throw error;
    const { data } = sb.storage.from("chat-images").getPublicUrl(path);
    return data && data.publicUrl ? data.publicUrl : null;
  }

  async function upsertDesign(payload) {
    const sb = client();
    const session = await getSession();
    if (!sb || !session) throw new Error("Login dulu");
    const isAdmin = await isCurrentUserAdmin();
    const canPerm = (await hasPermission("designs")) || (await hasPermission("websites"));
    // siswa taut nama boleh kelola karya sendiri
    let authorName = String(payload.author_name || "").trim();
    try {
      const prof = await getMyProfile();
      if (prof && prof.linked_student_name) authorName = authorName || prof.linked_student_name;
    } catch (e) {}
    if (!isAdmin && !canPerm) {
      // siswa: hanya insert/update milik sendiri
      if (!authorName) {
        // tetap izinkan jika login
        authorName = (session.user.user_metadata && session.user.user_metadata.full_name) || "Siswa";
      }
    }
    const row = {
      title: String(payload.title || "").trim().slice(0, 200),
      image_url: String(payload.image_url || "").trim().slice(0, 800),
      category: String(payload.category || "Umum").trim().slice(0, 80),
      description: String(payload.description || "").trim().slice(0, 500),
      author_name: authorName.slice(0, 120),
      author_user_id: session.user.id,
      active: payload.active !== false,
      updated_at: new Date().toISOString(),
    };
    if (!row.title || !row.image_url) throw new Error("Judul dan gambar (URL/file) wajib");
    if (payload.id) {
      let q = sb.from("gallery_designs").update(row).eq("id", payload.id);
      if (!isAdmin && !canPerm) q = q.eq("author_user_id", session.user.id);
      const { data, error } = await q.select("*").single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await sb.from("gallery_designs").insert(row).select("*").single();
    if (error) throw error;
    return data;
  }

  async function deleteDesign(id) {
    const sb = client();
    const session = await getSession();
    if (!sb || !session) throw new Error("Login dulu");
    const isAdmin = await isCurrentUserAdmin();
    const canPerm = await hasPermission("designs");
    let q = sb.from("gallery_designs").delete().eq("id", id);
    if (!isAdmin && !canPerm) q = q.eq("author_user_id", session.user.id);
    const { error } = await q;
    if (error) throw error;
  }

  /** Bulk: upload banyak file → tiap file jadi 1 baris desain */
  async function bulkUploadDesignFiles(files, { category, titlePrefix } = {}) {
    const list = Array.from(files || []).filter((f) => f && f.type && String(f.type).startsWith("image/"));
    if (!list.length) throw new Error("Pilih minimal 1 file gambar");
    const cat = String(category || "Umum").trim().slice(0, 80);
    const prefix = String(titlePrefix || "Desain").trim();
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const url = await uploadDesignFile(f);
      if (!url) continue;
      const base = (f.name || "karya").replace(/\.[^.]+$/, "").slice(0, 80);
      const row = await upsertDesign({
        title: prefix + " — " + base,
        image_url: url,
        category: cat,
        description: "",
      });
      out.push(row);
    }
    return out;
  }

  async function deleteUserProfiles(ids) {
    if (!(await isCurrentUserAdmin())) throw new Error("Hanya admin utama");
    const sb = client();
    const list = (ids || []).filter(Boolean);
    if (!list.length) return { removed: 0 };
    // jangan hapus admin
    const { data: admins } = await sb.from("gallery_profiles").select("id,is_admin,email").in("id", list);
    const safe = (admins || []).filter((u) => !u.is_admin).map((u) => u.id);
    if (!safe.length) return { removed: 0, skippedAdmin: true };
    const { error } = await sb.from("gallery_profiles").delete().in("id", safe);
    if (error) throw error;
    return { removed: safe.length };
  }

  async function setUserRole(userId, role) {
    if (!(await isCurrentUserAdmin())) throw new Error("Hanya admin");
    const sb = client();
    const session = await getSession();
    const r = String(role || "").toLowerCase();
    if (r && r !== "student" && r !== "teacher" && r !== "alumni") throw new Error("Peran tidak valid");
    const { data, error } = await sb
      .from("gallery_profiles")
      .update({
        role: r,
        approved_at: r ? new Date().toISOString() : null,
        approved_by: r && session && session.user ? session.user.id : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async function setAppSetting(key, value) {
    if (!(await isCurrentUserAdmin())) throw new Error("Hanya admin");
    const sb = client();
    const { data, error } = await sb
      .from("gallery_app_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async function getAppSetting(key) {
    const sb = client();
    if (!sb) return null;
    const { data } = await sb.from("gallery_app_settings").select("*").eq("key", key).maybeSingle();
    return data;
  }



  async function recordAnnouncementRead(announcementId, via) {
    const sb = client();
    const session = await getSession();
    if (!sb || !session || !session.user) return null;
    const prof = await getMyProfile();
    const row = {
      announcement_id: announcementId,
      user_id: session.user.id,
      student_name: (prof && prof.linked_student_name) || "",
      angkatan_year: String((prof && prof.linked_angkatan_year) || ""),
      class_code: String((prof && prof.linked_class_code) || ""),
      email: session.user.email || "",
      via: via || "view",
      read_at: new Date().toISOString(),
    };
    const { data, error } = await sb
      .from("gallery_announcement_reads")
      .upsert(row, { onConflict: "announcement_id,user_id" })
      .select("*")
      .maybeSingle();
    if (error) {
      console.warn("ann read", error);
      return null;
    }
    return data;
  }

  async function listAnnouncementReads(announcementId) {
    const sb = client();
    if (!sb) return [];
    const { data, error } = await sb
      .from("gallery_announcement_reads")
      .select("*")
      .eq("announcement_id", announcementId)
      .order("read_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data || [];
  }


  function sheetCsvUrl(input) {
    const s = String(input || "").trim();
    if (!s) throw new Error("Link Google Sheet kosong");
    // already csv export
    if (/export\?format=csv/i.test(s) || /\.csv(\?|$)/i.test(s)) return s;
    const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!m) throw new Error("Link Google Sheet tidak dikenali");
    const id = m[1];
    let gid = "0";
    const g = s.match(/[#&?]gid=([0-9]+)/);
    if (g) gid = g[1];
    return "https://docs.google.com/spreadsheets/d/" + id + "/export?format=csv&gid=" + gid;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cur = "";
    let inQ = false;
    const s = String(text || "").replace(/^\uFEFF/, "");
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (inQ) {
        if (c === '"') {
          if (s[i + 1] === '"') {
            cur += '"';
            i++;
          } else inQ = false;
        } else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ",") {
        row.push(cur);
        cur = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && s[i + 1] === "\n") i++;
        row.push(cur);
        cur = "";
        if (row.some((x) => String(x).trim())) rows.push(row);
        row = [];
      } else cur += c;
    }
    if (cur.length || row.length) {
      row.push(cur);
      if (row.some((x) => String(x).trim())) rows.push(row);
    }
    return rows;
  }

  function normalizeHeader(h) {
    return String(h || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function mapSheetRows(csvText, kind) {
    const table = parseCsv(csvText);
    if (!table.length) return [];
    const headers = table[0].map(normalizeHeader);
    const idx = (aliases) => {
      for (let a of aliases) {
        const i = headers.indexOf(a);
        if (i >= 0) return i;
      }
      // partial
      for (let a of aliases) {
        const i = headers.findIndex((h) => h.includes(a));
        if (i >= 0) return i;
      }
      return -1;
    };
    let map;
    if (kind === "website") {
      map = {
        title: idx(["nama website", "judul", "title", "nama", "name"]),
        description: idx(["deskripsi", "description", "desc", "keterangan"]),
        url: idx(["link", "url", "tautan", "website", "alamat"]),
      };
    } else if (kind === "video") {
      map = {
        title: idx(["nama video", "judul", "title", "nama", "name"]),
        category: idx(["kategori", "category", "cat"]),
        url: idx(["link", "url", "tautan", "video"]),
      };
    } else {
      map = {
        title: idx(["judul karya", "judul", "title", "nama", "name"]),
        description: idx(["deskripsi", "description", "desc", "keterangan"]),
        url: idx(["link", "url", "tautan", "gambar", "image", "image_url"]),
      };
    }
    if (map.title < 0 || map.url < 0) {
      throw new Error("Kolom wajib tidak ditemukan di baris header Sheet (butuh judul/nama + link). Header: " + headers.join(" | "));
    }
    const out = [];
    for (let r = 1; r < table.length; r++) {
      const line = table[r];
      const title = String(line[map.title] || "").trim();
      const url = String(line[map.url] || "").trim();
      if (!title || !url) continue;
      if (!/^https?:\/\//i.test(url)) continue;
      const item = { title, url };
      if (map.description >= 0) item.description = String(line[map.description] || "").trim();
      if (map.category >= 0) item.category = String(line[map.category] || "").trim();
      out.push(item);
    }
    return out;
  }

  async function fetchSheetRows(sheetUrl, kind) {
    const csvUrl = sheetCsvUrl(sheetUrl);
    const res = await fetch(csvUrl, { mode: "cors" });
    if (!res.ok) {
      throw new Error(
        "Gagal unduh Sheet (HTTP " +
          res.status +
          "). Pastikan share: «Siapa saja yang memiliki link dapat melihat»."
      );
    }
    const text = await res.text();
    if (/<!DOCTYPE html>/i.test(text) && /sign in/i.test(text)) {
      throw new Error("Sheet terkunci. Ubah akses menjadi publik (viewer).");
    }
    return mapSheetRows(text, kind);
  }

  async function assertCanBulkImport() {
    const session = await getSession();
    if (!session || !session.user) throw new Error("Login Google dulu");
    await upsertMyProfileFromSession();
    const prof = await getMyProfile();
    const isTeacher = !!(prof && (prof.is_admin || prof.role === "teacher"));
    const isStudent = !!(prof && prof.linked_student_name && String(prof.linked_student_name).trim());
    if (!isTeacher && !isStudent) {
      throw new Error("Akses ditolak. Siswa harus taut nama; pengajar harus disetujui admin.");
    }
    return { session, prof, isTeacher, isStudent };
  }

  async function bulkImportWebsites(sheetUrl) {
    const { session, prof, isTeacher } = await assertCanBulkImport();
    const items = await fetchSheetRows(sheetUrl, "website");
    if (!items.length) throw new Error("Tidak ada baris valid di Sheet website");
    const sb = client();
    let ok = 0;
    const errors = [];
    for (const it of items) {
      try {
        const payload = {
          title: it.title.slice(0, 200),
          url: it.url.slice(0, 500),
          category: "Web Kreatif",
          description: (it.description || "").slice(0, 500),
          owner_user_id: session.user.id,
          owner_name: isTeacher
            ? (prof.display_name || "Pengajar")
            : prof.linked_student_name,
        };
        // reuse addMyWebsite if student path exists
        if (!isTeacher) {
          await addMyWebsite({ title: payload.title, url: payload.url, category: payload.category });
        } else {
          const { error } = await sb.from("gallery_websites").insert({
            title: payload.title,
            url: payload.url,
            category: payload.category,
            owner_user_id: payload.owner_user_id,
            owner_name: payload.owner_name,
            angkatan_year: prof.linked_angkatan_year || null,
            class_code: prof.linked_class_code || "",
          });
          if (error) throw error;
        }
        ok++;
      } catch (e) {
        errors.push((it.title || "") + ": " + (e.message || e));
      }
    }
    return { ok, total: items.length, errors };
  }

  async function bulkImportVideos(sheetUrl) {
    const { session, prof, isTeacher } = await assertCanBulkImport();
    const items = await fetchSheetRows(sheetUrl, "video");
    if (!items.length) throw new Error("Tidak ada baris valid di Sheet video");
    let ok = 0;
    const errors = [];
    for (const it of items) {
      try {
        await addMyVideo({
          title: it.title,
          url: it.url,
          description: it.description || it.category || "",
        });
        ok++;
      } catch (e) {
        // teacher without linked name: insert directly
        if (isTeacher) {
          try {
            const meta = await fetchVideoMeta(it.url);
            const parsed = parseVideoUrl(it.url);
            const cats = await listVideoCategories();
            let catId = null;
            if (it.category) {
              const hit = cats.find(
                (c) =>
                  String(c.name || "").toLowerCase() === String(it.category).toLowerCase() ||
                  String(c.slug || "").toLowerCase() === String(it.category).toLowerCase()
              );
              catId = hit ? hit.id : null;
            }
            if (!catId) {
              const ks = cats.find((c) => c.slug === "karya-siswa") || cats[0];
              catId = ks ? ks.id : null;
            }
            const sb = client();
            const { error } = await sb.from("gallery_videos").insert({
              title: it.title,
              url: it.url,
              platform: meta.platform || parsed.platform,
              embed_url: parsed.embed_url || it.url,
              category_id: catId,
              description: it.description || it.category || "",
              created_by: session.user.email || "",
              owner_user_id: session.user.id,
              owner_name: prof.display_name || "Pengajar",
            });
            if (error) throw error;
            ok++;
            continue;
          } catch (e2) {
            errors.push((it.title || "") + ": " + (e2.message || e2));
            continue;
          }
        }
        errors.push((it.title || "") + ": " + (e.message || e));
      }
    }
    return { ok, total: items.length, errors };
  }

  async function bulkImportDesigns(sheetUrl) {
    const { session, prof, isTeacher } = await assertCanBulkImport();
    const items = await fetchSheetRows(sheetUrl, "design");
    if (!items.length) throw new Error("Tidak ada baris valid di Sheet desain");
    let ok = 0;
    const errors = [];
    const sb = client();
    for (const it of items) {
      try {
        const { error } = await sb.from("gallery_designs").insert({
          title: it.title.slice(0, 200),
          image_url: it.url.slice(0, 500),
          category: "Umum",
          description: (it.description || "").slice(0, 500),
          author_name: isTeacher
            ? (prof.display_name || "Pengajar")
            : (prof.linked_student_name || ""),
          author_user_id: session.user.id,
          active: true,
        });
        if (error) throw error;
        ok++;
      } catch (e) {
        errors.push((it.title || "") + ": " + (e.message || e));
      }
    }
    return { ok, total: items.length, errors };
  }



  /* ===== Chat message emoji reactions (WA-style) ===== */
  async function listChatReactions(messageIds) {
    const sb = client();
    if (!sb || !messageIds || !messageIds.length) return {};
    const ids = messageIds.filter(Boolean).slice(0, 300);
    const map = {};
    ids.forEach(function (id) {
      map[id] = [];
    });
    try {
      const { data, error } = await sb
        .from("gallery_chat_reactions")
        .select("id,message_id,emoji,author_name,author_user_id,created_at")
        .in("message_id", ids);
      if (error) throw error;
      (data || []).forEach(function (r) {
        if (!map[r.message_id]) map[r.message_id] = [];
        map[r.message_id].push(r);
      });
    } catch (e) {
      console.warn("listChatReactions", e && e.message ? e.message : e);
    }
    return map;
  }

  async function toggleChatReaction(messageId, emoji, authorName) {
    const sb = client();
    if (!sb) throw new Error("Supabase belum siap");
    if (!messageId) throw new Error("Pesan tidak valid");
    const em = String(emoji || "").trim().slice(0, 16);
    if (!em) throw new Error("Emoji kosong");
    let uid = null;
    try {
      const session = await getSession();
      if (session && session.user) uid = session.user.id;
    } catch (e) {}
    const name = String(authorName || getGuestName() || "Anonim").slice(0, 80);

    let mine = null;
    try {
      let q = sb
        .from("gallery_chat_reactions")
        .select("id,emoji,author_name,author_user_id")
        .eq("message_id", messageId)
        .limit(5);
      if (uid) q = q.eq("author_user_id", uid);
      else q = q.is("author_user_id", null).eq("author_name", name);
      const { data, error } = await q;
      if (!error && data && data.length) mine = data[0];
    } catch (e) {}

    if (mine && mine.emoji === em) {
      const { error } = await sb.from("gallery_chat_reactions").delete().eq("id", mine.id);
      if (error) throw error;
    } else if (mine) {
      const { error } = await sb
        .from("gallery_chat_reactions")
        .update({ emoji: em, author_name: name })
        .eq("id", mine.id);
      if (error) throw error;
    } else {
      const row = {
        message_id: messageId,
        emoji: em,
        author_name: name,
        author_user_id: uid || null,
      };
      const { error } = await sb.from("gallery_chat_reactions").insert(row);
      if (error) throw error;
    }

    const map = await listChatReactions([messageId]);
    return map[messageId] || [];
  }

  global.GalleryDB = {
    enabled,
    client,
    CLASS_OPTIONS,
    getSubmitCode,
    listAngkatan,
    ensureAngkatan,
    submitAlumni,
    fetchGalleryFromDb,
    fetchGalleryData: fetchGalleryFromDb,
    mergeGallery,
    isAdminEmail,
    getSession,
    signInWithGoogle,
    getReturnUrl,
    clearReturnUrl,
    goLogin,
    signOut,
    requireAdmin,
    adminListAlumni,
    adminDeleteAlumni,
    adminListWebsites,
    adminDeleteWebsite,
    adminListAngkatanAll,
    adminDeleteAngkatan,
    adminUpsertAngkatan,
    adminUpsertAlumni,
    adminUpsertWebsite,
    adminUpdateVideo,
    parseVideoUrl,
    fetchVideoMeta,
    listVideoCategories,
    addVideoCategory,
    listVideos,
    addVideo,
    deleteVideo,
    resolveMyAlumni,
    myWebsites,
    addMyWebsite,
    updateMyWebsite,
    deleteMyWebsite,
    myVideos,
    addMyVideo,
    updateMyVideo,
    deleteMyVideo,
    listChat,
    sendChat,
    updateChat,
    deleteChat,
    deleteChatStorageByPublicUrl,
    canModerateChatMessage,
    isCurrentUserStaff,
    subscribeChat,
    joinTypingChannel,
    uploadChatImage,
    uploadChatAudio,
    videoThumbnailHint,
    normLabel,
    upsertMyProfileFromSession,
    resolveStudentPhoto,
    optimizePhotoUrl,
    getMyProfile,
    updateMyLink,
    adminListLinks,
    adminUnlinkProfile,
    adminForceLinkProfile,
    revokeOtherLinksOnMyStudent,
    allowLinkForUser,
    unlinkMyProfile,
    updateMyContact,
    defaultContactPrivacy,
    canViewContact,
    isCurrentUserAdmin,
    currentPermissions,
    hasPermission,
    listRegisteredUsers,
    setUserAdmin,
    adminDeleteUserProfile,
    trackEvent,
    batchEngagement,
    syncFromGoogleDocs,
    importRosterFromSheet2025,
    parseStudentsCsv,
    importStudentsBulkFromSheet,
    importStudentsBulkFromCsvText,
    importStudentsBulkFromRows,
    fetchSheetCsv,
    runAiDocsSync,
    loadAiSkills,

    listChatRooms,
    upsertChatRoom,
    deleteChatRoom,
    clearChatMessages,
    verifyChatRoomAccess,
    listAnnouncementsAdmin,
    upsertAnnouncement,
    deleteAnnouncement,
    fetchActiveAnnouncements,
    listAttendanceSessionsAdmin,
    upsertAttendanceSession,
    deleteAttendanceSession,
    listActiveAttendanceSessions,
    myAttendanceRecords,
    listAttendanceRecords,
    listDesigns,
    bulkImportWebsites,
    bulkImportVideos,
    bulkImportDesigns,
    fetchSheetRows,
    recordAnnouncementRead,
    listAnnouncementReads,
    adminListDesigns,
    listDesignsPublic,
    myDesigns,
    uploadDesignFile,
    bulkUploadDesignFiles,
    upsertDesign,
    deleteDesign,
    deleteUserProfiles,
    setUserRole,
    setAppSetting,
    getAppSetting,
    submitAttendanceCheckin,
    submitAttendanceCheckout,
    canManageAttendance,
    loadRefleksiFromDb,
    loadSkillsMetaFromDb,
    fetchGoogleDocsText,
    cleanWorkTitle,
    countReactions,
    listComments,
    addLove,
    removeLove,
    toggleLove,
    getGuestName,
    setGuestName,
    hasLovedLocal,
    addComment,
    getStatsSummary,
    joinPresenceOnline,
    subscribeAttendanceLive,
    sessionId,
    getStatsTimeseries,
    sumReactionsForUrls,
    listChatReactions,
    toggleChatReaction,
  };
})(window);
