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
    if (!sb) throw new Error("Supabase belum dikonfigurasi");
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
    if (!sb) throw new Error("Supabase belum dikonfigurasi.");
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
        title: w.title,
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

  async function fetchGalleryFromDb() {
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

    const students = alumni
      .map((a) => {
        const ang = angMap[a.angkatan_id] || {};
        const classCode = a.class_code || "—";
        let angkatanYear = "";
        const m = String(ang.label || "").match(/20\d{2}/);
        if (m) angkatanYear = m[0];
        const works = (byAlumni[a.id] || []).map((w) => ({
          title: w.title,
          url: w.url,
          category: w.category || "Web Kreatif",
          tags: w.tags || [],
          description: w.description || "",
          thumb: "",
        }));
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
          works,
          _dbId: a.id,
        };
      })
      .filter((s) => s.works && s.works.length);

    return {
      meta: { title: "Gallery", source: "Supabase", updated: new Date().toISOString().slice(0, 10) },
      students,
    };
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
    if (!sb) throw new Error("Supabase belum dikonfigurasi");
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
      .select("id,title,url,category,alumni_id,created_at, gallery_alumni(name)")
      .order("created_at", { ascending: false })
      .limit(500);
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

  // ----- Videos -----
  function parseVideoUrl(url) {
    const u = String(url || "").trim();
    let platform = "other";
    let embed = u;
    let id = null;
    let m;
    m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
    if (m) {
      platform = "youtube";
      id = m[1];
      embed = "https://www.youtube.com/embed/" + id;
      return { platform, embed_url: embed, id };
    }
    m = u.match(/dailymotion\.com\/(?:video|embed\/video)\/([a-zA-Z0-9]+)/i) || u.match(/dai\.ly\/([a-zA-Z0-9]+)/i);
    if (m) {
      platform = "dailymotion";
      id = m[1];
      embed = "https://www.dailymotion.com/embed/video/" + id;
      return { platform, embed_url: embed, id };
    }
    if (/tiktok\.com\//i.test(u)) {
      platform = "tiktok";
      embed = u; // oEmbed dipakai untuk meta; embed iframe via player jika perlu
      return { platform, embed_url: embed, id: null };
    }
    if (/instagram\.com\//i.test(u)) {
      platform = "instagram";
      return { platform, embed_url: u, id: null };
    }
    if (/facebook\.com\/|fb\.watch\//i.test(u)) {
      platform = "facebook";
      return { platform, embed_url: u, id: null };
    }
    return { platform, embed_url: embed, id };
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
    const { data, error } = await sb
      .from("gallery_videos")
      .select("*, gallery_video_categories(name,slug)")
      .eq("owner_user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function addMyVideo({ title, url, description, categoryId }) {
    const session = await getSession();
    if (!session || !session.user) throw new Error("Belum login Google");
    const prof = await getMyProfile();
    if (!prof || !prof.linked_student_name) {
      throw new Error("Tautkan nama + angkatan di Profil dulu.");
    }
    const meta = await fetchVideoMeta(url);
    const parsed = parseVideoUrl(url);
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
      const parsed = parseVideoUrl(url);
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
  async function addVideo({ title, url, categoryId, description, createdBy }) {
    const sb = client();
    const parsed = parseVideoUrl(url);
    if (parsed.platform === "other") throw new Error("Link harus YouTube atau Dailymotion.");
    const { data, error } = await sb
      .from("gallery_videos")
      .insert({
        title: title || "Video",
        url,
        platform: parsed.platform,
        embed_url: parsed.embed_url,
        category_id: categoryId || null,
        description: description || "",
        created_by: createdBy || "",
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  async function deleteVideo(id) {
    const sb = client();
    const { error } = await sb.from("gallery_videos").delete().eq("id", id);
    if (error) throw error;
  }

  // Chat (unchanged API)
  async function listChat({ angkatanId, limit }) {
    const sb = client();
    if (!sb) return [];
    let q = sb
      .from("gallery_chat")
      .select("id,angkatan_id,author_name,avatar_emoji,body,created_at")
      .order("created_at", { ascending: true })
      .limit(limit || 100);
    if (angkatanId) q = q.eq("angkatan_id", angkatanId);
    else q = q.is("angkatan_id", null);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }
  async function sendChat({ angkatanId, authorName, body, avatarEmoji }) {
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
    const { data, error } = await sb
      .from("gallery_chat")
      .insert({
        author_name: String(authorName || "Anonim").slice(0, 60),
        body: String(body || "").trim().slice(0, 1000),
        angkatan_id: angkatanId || null,
        avatar_emoji: (avatarEmoji || "💬").slice(0, 8),
        user_id: userId,
        is_registered: isReg,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  function subscribeChat({ angkatanId, onInsert }) {
    const sb = client();
    if (!sb) return () => {};
    const filter = angkatanId ? `angkatan_id=eq.${angkatanId}` : "angkatan_id=is.null";
    const channel = sb
      .channel("gallery-chat-" + (angkatanId || "global"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gallery_chat", filter }, (payload) => onInsert && onInsert(payload.new))
      .subscribe();
    return () => {
      try {
        sb.removeChannel(channel);
      } catch (_) {}
    };
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
    const { data, error } = await sb
      .from("gallery_profiles")
      .update({
        linked_student_name: String(studentName || "").trim(),
        linked_angkatan_year: parseInt(angkatanYear, 10) || null,
        linked_class_code: String(classCode || "").trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
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

  async function setUserAdmin(userId, { isAdmin, permissions }) {
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
    if (!sb) throw new Error("Supabase belum siap");
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

  function joinPresenceOnline(onCount) {
    const sb = client();
    if (!sb) return { leave() {} };
    const channel = sb.channel("gallery-online", {
      config: { presence: { key: sessionId() } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        let n = 0;
        Object.values(state).forEach((arr) => {
          n += (arr || []).length;
        });
        onCount && onCount(n);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ at: Date.now(), path: location.pathname });
        }
      });
    return {
      leave() {
        try {
          sb.removeChannel(channel);
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
    subscribeChat,
    joinTypingChannel,
    normLabel,
    upsertMyProfileFromSession,
    getMyProfile,
    updateMyLink,
    isCurrentUserAdmin,
    currentPermissions,
    hasPermission,
    listRegisteredUsers,
    setUserAdmin,
    adminDeleteUserProfile,
    trackEvent,
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
    sessionId,
    getStatsTimeseries,
    sumReactionsForUrls,
  };
})(window);
