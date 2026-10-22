// Supabase Edge Function: analisis Google Docs + cocokkan nama (roster alias)
// Secrets: OPENAI_API_KEY (atau GROQ_API_KEY), SUPABASE_SERVICE_ROLE_KEY (otomatis)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const docsUrls: string[] = body.docsUrls || [];
    const sheetId = body.sheetId || "1kr4Dvd2LcrCJLYvhwnYkWcRhUXPgTw9uZlOaeTK8SXE";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // load aliases
    const { data: aliases } = await admin.from("gallery_student_aliases").select("*");
    const aliasList = (aliases || []).map((a) => ({
      official: a.official_name,
      nick: a.nickname,
      class: a.class_code,
      year: a.angkatan_year,
    }));

    // fetch docs texts
    const docsTexts: { url: string; text: string }[] = [];
    for (const url of docsUrls) {
      const m = String(url).match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
      if (!m) continue;
      const exp = `https://docs.google.com/document/d/${m[1]}/export?format=txt`;
      const res = await fetch(exp);
      if (res.ok) docsTexts.push({ url, text: (await res.text()).slice(0, 120000) });
    }

    if (!docsTexts.length) {
      return new Response(JSON.stringify({ error: "Tidak ada teks Docs. Share: Anyone with the link." }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("GROQ_API_KEY") || "";
    const openaiBase = Deno.env.get("OPENAI_API_KEY")
      ? "https://api.openai.com/v1"
      : "https://api.groq.com/openai/v1";
    const model = Deno.env.get("OPENAI_API_KEY") ? "gpt-4o-mini" : "llama-3.3-70b-versatile";

    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "Set secret OPENAI_API_KEY atau GROQ_API_KEY di Supabase." }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const system = `You are an education analyst for Indonesian Islamic senior high (SMA) SMM/Web Design class.
Given student reflection texts and an official roster (official name + nickname), produce JSON only:
{
  "summary": "2-4 sentences overall what students learned",
  "domains": [{"name":"...","skills":["..."],"level":"Introduced|Practiced|Applied"}],
  "per_student": [{"official_name":"...","matched_from":"text as written","confidence":0.0-1.0,"takeaways":["..."]}]
}
Match nicknames/typos to official_name from roster. If unsure, confidence < 0.5 and still best-guess official_name.
Respond with valid JSON only.`;

    const userMsg = JSON.stringify({
      roster: aliasList,
      reflections: docsTexts.map((d) => d.text.slice(0, 50000)),
    });

    const aiRes = await fetch(`${openaiBase}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI error", detail: t.slice(0, 500) }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content || "{}";
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { summary: content, domains: [], per_student: [] };
    }

    await admin.from("gallery_ai_skills").upsert({
      id: "main",
      summary: String(parsed.summary || ""),
      domains: parsed.domains || [],
      per_student: parsed.per_student || [],
      raw_model: model,
      source_docs: docsUrls,
      updated_at: new Date().toISOString(),
    });

    // merge refleksi per student
    const per = Array.isArray(parsed.per_student) ? parsed.per_student : [];
    for (const s of per as { official_name?: string; takeaways?: string[] }[]) {
      const name = String(s.official_name || "").trim();
      if (!name) continue;
      const body = (s.takeaways || []).join("\n• ");
      const { data: ex } = await admin.from("gallery_refleksi").select("id,body").ilike("student_name", name).maybeSingle();
      if (ex) {
        await admin.from("gallery_refleksi").update({
          body: body ? `• ${body}` : ex.body,
          updated_at: new Date().toISOString(),
          source: "ai_docs",
        }).eq("id", ex.id);
      } else {
        await admin.from("gallery_refleksi").insert({
          student_name: name,
          body: body ? `• ${body}` : "",
          source: "ai_docs",
        });
      }
    }

    // notes to skills meta
    const skillFlat: string[] = [];
    for (const d of (parsed.domains as { name?: string; skills?: string[] }[]) || []) {
      for (const sk of d.skills || []) skillFlat.push(`${d.name}: ${sk}`);
    }
    await admin.from("gallery_skills_meta").upsert({
      id: "main",
      sync_notes: skillFlat.slice(0, 200),
      docs_url: docsUrls[0] || "",
      updated_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        ok: true,
        summary: parsed.summary,
        domains: (parsed.domains as unknown[])?.length || 0,
        students: per.length,
        model,
        sheetId,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
