// Hapus file di bucket chat-images yang lebih tua dari 24 jam.
// Dipanggil via Storage API (bukan DELETE langsung ke storage.objects).
//
// Deploy: supabase functions deploy cleanup-chat-images
// Jadwal: Dashboard → Edge Functions → Schedules (atau cron.schedule + net.http_post)
//
// Auth: Authorization: Bearer <SERVICE_ROLE_KEY>
//   atau header x-cleanup-secret: <CLEANUP_CHAT_SECRET> (opsional, set di Secrets)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cleanup-secret",
};

const BUCKET = "chat-images";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const cleanupSecret = Deno.env.get("CLEANUP_CHAT_SECRET") || "";
    const auth = req.headers.get("Authorization") || "";
    const bearer = auth.replace(/^Bearer\s+/i, "").trim();
    const headerSecret = req.headers.get("x-cleanup-secret") || "";

    const ok =
      (serviceKey && bearer === serviceKey) ||
      (cleanupSecret && headerSecret === cleanupSecret);

    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const cutoff = Date.now() - MAX_AGE_MS;
    const toDelete: string[] = [];
    const limit = 100;
    let offset = 0;

    // List recursive via prefix folders: list root, then each folder
    async function listAll(prefix = ""): Promise<void> {
      let page = 0;
      for (;;) {
        const { data, error } = await admin.storage.from(BUCKET).list(prefix, {
          limit,
          offset: page * limit,
          sortBy: { column: "created_at", order: "asc" },
        });
        if (error) throw error;
        if (!data || !data.length) break;

        for (const item of data) {
          const path = prefix ? `${prefix}/${item.name}` : item.name;
          // Folder entries often have id null and no metadata
          const isFolder =
            !item.id &&
            (item.metadata == null ||
              item.metadata?.mimetype == null ||
              item.metadata?.size == null);

          if (isFolder) {
            await listAll(path);
            continue;
          }

          const created =
            item.created_at ||
            item.updated_at ||
            (item.metadata && (item.metadata as { lastModified?: string }).lastModified) ||
            null;
          const t = created ? Date.parse(String(created)) : 0;
          if (t && t < cutoff) {
            toDelete.push(path);
          }
        }

        if (data.length < limit) break;
        page += 1;
        if (page > 50) break; // safety
      }
    }

    await listAll("");

    let deleted = 0;
    // Batch delete (max ~100 per call)
    for (let i = 0; i < toDelete.length; i += 100) {
      const chunk = toDelete.slice(i, i + 100);
      const { error } = await admin.storage.from(BUCKET).remove(chunk);
      if (error) throw error;
      deleted += chunk.length;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        scanned_candidates: toDelete.length,
        deleted,
        older_than_hours: 24,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
