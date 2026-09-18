/**
 * Silverhawk Gallery — Supabase data layer
 * Gallery load: Supabase dulu, fallback JSON jika belum dikonfigurasi / offline.
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
    if (!global.supabase || !global.supabase.createClient) {
      console.warn("Supabase JS SDK belum dimuat");
      return null;
    }
    if (!global.__gallerySb) {
      global.__gallerySb = global.supabase.createClient(String(cfg().url).replace(/\/$/, ""), cfg().anonKey);
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

  async function getSubmitCode() {
    const sb = client();
    if (!sb) return cfg().defaultSubmitCode || "";
    const { data, error } = await sb.from("gallery_settings").select("value").eq("key", "submit_code").maybeSingle();
    if (error) throw error;
    return (data && data.value) || cfg().defaultSubmitCode || "";
  }

  async function listAngkatan() {
    const sb = client();
    if (!sb) return [];
    const { data, error } = await sb.from("gallery_angkatan").select("id,label,label_norm,created_at").order("label");
    if (error) throw error;
    return data || [];
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
      if (String(error.message || "").includes("duplicate") || error.code === "23505") {
        const { data: again } = await sb.from("gallery_angkatan").select("id,label,label_norm").eq("label_norm", ln).maybeSingle();
        if (again) return { row: again, created: false };
      }
      throw error;
    }
    return { row: data, created: true };
  }

  async function submitAlumni({ code, name, angkatanLabel, createNew, websites }) {
    const sb = client();
    if (!sb) throw new Error("Supabase belum dikonfigurasi. Hubungi admin gallery.");
    const expected = await getSubmitCode();
    if (!code || String(code).trim() !== String(expected).trim()) {
      throw new Error("Kode akses salah.");
    }
    const nm = String(name || "").trim();
    if (nm.length < 2) throw new Error("Nama terlalu pendek.");
    const links = (websites || []).map((w) => ({
      title: String(w.title || "Website").trim() || "Website",
      url: String(w.url || "").trim(),
      category: String(w.category || "Web Kreatif").trim() || "Web Kreatif",
    })).filter((w) => /^https?:\/\//i.test(w.url));
    if (!links.length) throw new Error("Minimal satu URL website valid (http/https).");

    let angkatanId;
    if (createNew) {
      const { row } = await ensureAngkatan(angkatanLabel);
      angkatanId = row.id;
    } else {
      const list = await listAngkatan();
      const found = list.find((a) => a.id === angkatanLabel || a.label === angkatanLabel || a.label_norm === normLabel(angkatanLabel));
      if (!found) throw new Error("Angkatan tidak ditemukan.");
      angkatanId = found.id;
    }

    const nameNorm = normLabel(nm);
    let alumniId;
    const { data: existAl } = await sb
      .from("gallery_alumni")
      .select("id")
      .eq("name_norm", nameNorm)
      .eq("angkatan_id", angkatanId)
      .maybeSingle();
    if (existAl) {
      alumniId = existAl.id;
    } else {
      const { data: al, error: e1 } = await sb
        .from("gallery_alumni")
        .insert({ name: nm, name_norm: nameNorm, angkatan_id: angkatanId, role: "Alumni" })
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
        description: "Ditambahkan alumni via form gallery.",
      });
      if (error) {
        if (error.code === "23505" || String(error.message || "").includes("duplicate")) continue;
        throw error;
      }
      added++;
    }
    return { alumniId, added, skipped: links.length - added };
  }

  /** Ubah baris DB → format GALLERY_DATA lama agar app.js lama tetap jalan */
  async function fetchGalleryData() {
    const sb = client();
    if (!sb) return null;
    const { data: alumni, error: e1 } = await sb
      .from("gallery_alumni")
      .select("id,name,school,role,legacy_id,angkatan_id, gallery_angkatan(label), gallery_websites(id,title,url,category,description,tags,created_at)");
    if (e1) throw e1;
    const students = (alumni || []).map((a, idx) => {
      const label = (a.gallery_angkatan && a.gallery_angkatan.label) || "—";
      const classCode = String(label).replace(/^Kelas\s+/i, "").trim() || label;
      const works = (a.gallery_websites || []).map((w, i) => ({
        title: w.title,
        url: w.url,
        category: w.category || "Web Kreatif",
        tags: w.tags || [],
        description: w.description || "",
        thumb: "", // thumbnail dinamis di UI
      }));
      return {
        id: a.legacy_id || a.id,
        name: a.name,
        class: classCode,
        school: a.school || "SMA PMA",
        role: a.role || "Alumni",
        aiTool: "",
        works,
      };
    }).filter((s) => s.works && s.works.length);
    return {
      meta: {
        title: "Galeri Web Kreasi Santriwati",
        subtitle: "Kenang-kenangan karya digital — live dari database",
        brand: "Silverhawk",
        source: "Supabase gallery_*",
        updated: new Date().toISOString().slice(0, 10),
      },
      students,
    };
  }

  async function listChat({ angkatanId, limit }) {
    const sb = client();
    if (!sb) return [];
    let q = sb.from("gallery_chat").select("id,angkatan_id,author_name,body,created_at").order("created_at", { ascending: true }).limit(limit || 100);
    if (angkatanId) q = q.eq("angkatan_id", angkatanId);
    else q = q.is("angkatan_id", null);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function sendChat({ angkatanId, authorName, body }) {
    const sb = client();
    if (!sb) throw new Error("Supabase belum dikonfigurasi");
    const name = String(authorName || "").trim() || "Anonim";
    const text = String(body || "").trim();
    if (!text) throw new Error("Pesan kosong");
    const row = {
      author_name: name.slice(0, 60),
      body: text.slice(0, 1000),
      angkatan_id: angkatanId || null,
    };
    const { data, error } = await sb.from("gallery_chat").insert(row).select("*").single();
    if (error) throw error;
    return data;
  }

  function subscribeChat({ angkatanId, onInsert }) {
    const sb = client();
    if (!sb) return () => {};
    const filter = angkatanId
      ? `angkatan_id=eq.${angkatanId}`
      : "angkatan_id=is.null";
    const channel = sb
      .channel("gallery-chat-" + (angkatanId || "global"))
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gallery_chat", filter },
        (payload) => onInsert && onInsert(payload.new)
      )
      .subscribe();
    return () => {
      try { sb.removeChannel(channel); } catch (_) {}
    };
  }

  global.GalleryDB = {
    enabled,
    client,
    getSubmitCode,
    listAngkatan,
    ensureAngkatan,
    submitAlumni,
    fetchGalleryData,
    listChat,
    sendChat,
    subscribeChat,
    normLabel,
  };
})(window);
