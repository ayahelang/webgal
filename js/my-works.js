(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  function esc(t) {
    return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }

  function bindPreviews() {
    const vp = document.getElementById("vidPreview");
    if (vp) vp.onclick = () => {
      const f = document.getElementById("vidForm");
      SHPreview.previewVideo({
        title: f.querySelector("[name=title]").value,
        url: f.querySelector("[name=url]").value,
        description: (f.querySelector("[name=description]") || {}).value || "",
        owner: "Karya saya",
      });
    };
    const wp = document.getElementById("webPreview");
    if (wp) wp.onclick = async () => {
      try {
        const prof = await GalleryDB.getMyProfile();
        const rows = await GalleryDB.myWebsites();
        const form = document.getElementById("webForm");
        // jika form sedang diisi URL baru yang belum tersimpan, sertakan di preview
        const draftTitle = form && form.querySelector("[name=title]") ? form.querySelector("[name=title]").value : "";
        const draftUrl = form && form.querySelector("[name=url]") ? form.querySelector("[name=url]").value.trim() : "";
        const draftCat = form && form.querySelector("[name=category]") ? form.querySelector("[name=category]").value : "Web";
        const works = (rows || []).map((w) => ({ title: w.title, url: w.url, category: w.category }));
        if (draftUrl && !works.some((w) => String(w.url).replace(/\/+$/, "") === draftUrl.replace(/\/+$/, ""))) {
          works.unshift({ title: draftTitle || "Website baru", url: draftUrl, category: draftCat || "Web" });
        }
        SHPreview.previewMyWebsitesCard({
          name: (prof && prof.linked_student_name) || "Saya",
          classLabel: "Kelas " + ((prof && prof.linked_class_code) || "") + " · " + ((prof && prof.linked_angkatan_year) || ""),
          works,
        });
      } catch (e) {
        alert(e.message || e);
      }
    };
  }
  async function boot() {
    bindPreviews();

    const session = await GalleryDB.getSession();
    if (!session) {
      $("#needLogin").hidden = false;
      $("#works").hidden = true;
      return;
    }
    try {
      await GalleryDB.upsertMyProfileFromSession();
      const prof = await GalleryDB.getMyProfile();
      const isTeacher = !!(prof && (prof.is_admin || prof.role === "teacher"));
      const isStudent = !!(prof && prof.linked_student_name && prof.linked_angkatan_year);
      if (!isTeacher && !isStudent) {
        $("#needLogin").innerHTML =
          `<p class="muted">Siswa: tautkan nama & angkatan di Profil. Pengajar: minta admin menyetujui peran pengajar.</p>
           <p><a class="btn btn-primary" href="profile.html">Buka Profil</a></p>`;
        return;
      }
    } catch (e) {
      $("#needLogin").textContent = e.message || String(e);
      return;
    }

    $("#needLogin").hidden = true;
    $("#works").hidden = false;

    $$("#tabs .filter").forEach((b) =>
      b.addEventListener("click", () => {
        $$("#tabs .filter").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        $$("[data-pane]").forEach((p) => {
          p.hidden = p.getAttribute("data-pane") !== b.dataset.tab;
        });
      })
    );

    $("#webReset").onclick = () => {
      $("#webForm").reset();
      $("#webForm [name=id]").value = "";
    };
    $("#vidReset").onclick = () => {
      $("#vidForm").reset();
      $("#vidForm [name=id]").value = "";
    };

    $("#webForm").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      $("#webMsg").textContent = "Menyimpan...";
      try {
        const id = fd.get("id");
        const payload = { title: fd.get("title"), url: fd.get("url"), category: fd.get("category") || "Web Kreatif" };
        if (id) await GalleryDB.updateMyWebsite(id, payload);
        else await GalleryDB.addMyWebsite(payload);
        $("#webMsg").textContent = "Tersimpan.";
        ev.target.reset();
        $("#webForm [name=id]").value = "";
        await loadWeb();
      } catch (e) {
        $("#webMsg").textContent = e.message || String(e);
      }
    };

    $("#vidForm").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      $("#vidMsg").textContent = "Mengambil info video & menyimpan...";
      try {
        const id = fd.get("id");
        const payload = {
          title: fd.get("title"),
          url: fd.get("url"),
          description: fd.get("description"),
        };
        if (id) await GalleryDB.updateMyVideo(id, payload);
        else await GalleryDB.addMyVideo(payload);
        $("#vidMsg").textContent = "Tersimpan (meta otomatis jika judul/deskripsi kosong).";
        ev.target.reset();
        $("#vidForm [name=id]").value = "";
        await loadVid();
      } catch (e) {
        $("#vidMsg").textContent = e.message || String(e);
      }
    };

    $("#desReset") &&
      ($("#desReset").onclick = () => {
        $("#desForm").reset();
        $("#desForm [name=id]").value = "";
      });

    $("#desForm") &&
      ($("#desForm").onsubmit = async (ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        const msg = $("#desMsg");
        if (msg) msg.textContent = "Menyimpan...";
        try {
          const id = fd.get("id");
          const title = fd.get("title");
          const category = fd.get("category") || "Umum";
          const description = fd.get("description") || "";
          const imageUrl = (fd.get("image_url") || "").toString().trim();
          if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
            throw new Error("Isi URL gambar yang valid (https://…)");
          }
          await GalleryDB.upsertDesign({
            id: id || undefined,
            title,
            category,
            description,
            image_url: imageUrl,
          });
          if (msg) msg.textContent = "Tersimpan.";
          ev.target.reset();
          $("#desForm [name=id]").value = "";
          await loadDes();
        } catch (e) {
          if (msg) msg.textContent = e.message || String(e);
        }
      });

    await loadWeb();
    await loadVid();
    await loadDes();

    function bindBulk(btnId, inputId, msgId, fn) {
      const btn = document.getElementById(btnId);
      if (!btn || btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", async () => {
        const url = (document.getElementById(inputId) || {}).value || "";
        const msg = document.getElementById(msgId);
        if (msg) msg.textContent = "Mengunduh & mengimpor Sheet…";
        btn.disabled = true;
        try {
          const r = await fn(url.trim());
          let t = "Berhasil " + r.ok + " dari " + r.total + " baris.";
          if (r.errors && r.errors.length) t += " Gagal: " + r.errors.slice(0, 3).join("; ");
          if (msg) msg.textContent = t;
          await loadWeb();
          await loadVid();
        } catch (e) {
          if (msg) msg.textContent = e.message || String(e);
        }
        btn.disabled = false;
      });
    }
    bindBulk("bulkRunWeb", "bulkSheetWeb", "bulkMsgWeb", (u) => GalleryDB.bulkImportWebsites(u));
    bindBulk("bulkRunVid", "bulkSheetVid", "bulkMsgVid", (u) => GalleryDB.bulkImportVideos(u));
    bindBulk("bulkRunDes", "bulkSheetDes", "bulkMsgDes", async (u) => {
      const r = await GalleryDB.bulkImportDesigns(u);
      await loadDes();
      return r;
    });
  }

  async function loadDes() {
    if (!window.GalleryDB || typeof GalleryDB.myDesigns !== "function") return;
    const host = $("#desList");
    if (!host) return;
    try {
      const rows = await GalleryDB.myDesigns();
      host.innerHTML =
        rows
          .map(
            (d) => `<div class="admin-row">
        <div style="display:flex;gap:10px;align-items:center">
          <img src="${esc(d.image_url)}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px;background:#0a1218">
          <div><strong>${esc(d.title)}</strong> · <small>${esc(d.category)}</small><br>
          <small><a href="${esc(d.image_url)}" target="_blank" rel="noopener">buka gambar</a></small></div>
        </div>
        <div style="display:flex;gap:6px">
          <button type="button" data-edit-des='${esc(
            JSON.stringify({
              id: d.id,
              title: d.title,
              category: d.category || "Umum",
              description: d.description || "",
              image_url: d.image_url,
            })
          )}'>Edit</button>
          <button type="button" data-del-des="${d.id}">Hapus</button>
        </div></div>`
          )
          .join("") || "<p class='muted'>Belum ada desain. Tambah lewat hotlink URL gambar.</p>";

      $$("#desList [data-edit-des]").forEach((b) =>
        b.addEventListener("click", () => {
          const d = JSON.parse(b.getAttribute("data-edit-des"));
          const form = $("#desForm");
          if (!form) return;
          form.scrollIntoView({ behavior: "smooth", block: "start" });
          form.querySelector("[name=id]").value = d.id;
          form.querySelector("[name=title]").value = d.title || "";
          form.querySelector("[name=category]").value = d.category || "Umum";
          form.querySelector("[name=description]").value = d.description || "";
          form.querySelector("[name=image_url]").value = d.image_url || "";
        })
      );
      $$("#desList [data-del-des]").forEach((b) =>
        b.addEventListener("click", async () => {
          if (!confirm("Hapus desain ini?")) return;
          await GalleryDB.deleteDesign(b.dataset.delDes);
          await loadDes();
        })
      );
    } catch (e) {
      host.innerHTML = "<p class='muted'>" + esc(e.message || e) + "</p>";
    }
  }

  async function loadWeb() {
    const rows = await GalleryDB.myWebsites();
    $("#webList").innerHTML =
      rows
        .map(
          (w) => `<div class="admin-row">
        <div><strong>${esc(w.title)}</strong><br><small><a href="${esc(w.url)}" target="_blank">${esc(w.url)}</a></small></div>
        <div style="display:flex;gap:6px">
          <button type="button" data-edit-web='${esc(JSON.stringify(w))}'>Edit</button>
          <button type="button" data-del-web="${w.id}">Hapus</button>
        </div></div>`
        )
        .join("") || "<p class='muted'>Belum ada website.</p>";

    $$("#webList [data-edit-web]").forEach((b) =>
      b.addEventListener("click", () => {
        const w = JSON.parse(b.getAttribute("data-edit-web"));
        try { (document.querySelector("#webForm")||document.querySelector("form")).scrollIntoView({behavior:"smooth",block:"start"}); } catch(e) {}
        const form = document.getElementById("webForm") || document.querySelector("#myWebForm, form");
        if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
        $("#webForm [name=id]").value = w.id;
        $("#webForm [name=title]").value = w.title || "";
        $("#webForm [name=url]").value = w.url || "";
        $("#webForm [name=category]").value = w.category || "";
      })
    );
    $$("#webList [data-del-web]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Hapus website ini?")) return;
        await GalleryDB.deleteMyWebsite(b.dataset.delWeb);
        await loadWeb();
      })
    );
  }

  async function loadVid() {
    const rows = await GalleryDB.myVideos();
    $("#vidList").innerHTML =
      rows
        .map(
          (v) => `<div class="admin-row">
        <div><strong>${esc(v.title)}</strong> · <small>${esc(v.platform)}</small><br>
        <small><a href="${esc(v.url)}" target="_blank">${esc(v.url)}</a></small>
        ${v.description ? `<br><small>${esc(v.description)}</small>` : ""}</div>
        <div style="display:flex;gap:6px">
          <button type="button" data-edit-vid='${esc(JSON.stringify({ id: v.id, title: v.title, url: v.url, description: v.description || "" }))}'>Edit</button>
          <button type="button" data-del-vid="${v.id}">Hapus</button>
        </div></div>`
        )
        .join("") || "<p class='muted'>Belum ada video.</p>";

    $$("#vidList [data-edit-vid]").forEach((b) =>
      b.addEventListener("click", () => {
        const v = JSON.parse(b.getAttribute("data-edit-vid"));
        try { (document.querySelector("#vidForm")||document.querySelector("#videoForm")||document.querySelector("form")).scrollIntoView({behavior:"smooth",block:"start"}); } catch(e) {}
        $("#vidForm [name=id]").value = v.id;
        $("#vidForm [name=title]").value = v.title || "";
        $("#vidForm [name=url]").value = v.url || "";
        $("#vidForm [name=description]").value = v.description || "";
      })
    );
    $$("#vidList [data-del-vid]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Hapus video ini?")) return;
        await GalleryDB.deleteMyVideo(b.dataset.delVid);
        await loadVid();
      })
    );
  }

  boot();
})();


  
