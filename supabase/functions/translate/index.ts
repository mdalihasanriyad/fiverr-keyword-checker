// Edge function: EN <-> BN translation via Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Direction = "en-bn" | "bn-en" | "auto";

const systemFor = (dir: Direction) => {
  if (dir === "en-bn") {
    return "You are a professional English-to-Bangla (Bengali) translator. Translate the user's text into natural, fluent Bangla in Bangla script. Preserve meaning, tone, names, numbers, and formatting (line breaks, lists). Return ONLY the translation — no explanations, no quotes, no romanization.";
  }
  if (dir === "bn-en") {
    return "You are a professional Bangla (Bengali) to English translator. Translate the user's text into natural, fluent English. Preserve meaning, tone, names, numbers, and formatting. Return ONLY the translation — no explanations, no quotes.";
  }
  return "You are a professional translator between English and Bangla (Bengali). Detect the source language: if the input is mostly Bangla script, translate it to natural English; otherwise translate it to natural Bangla in Bangla script. Preserve meaning, tone, names, numbers, and formatting. Return ONLY the translation — no explanations, no quotes, no romanization.";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, direction } = await req.json();

    if (typeof text !== "string" || !text.trim()) {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (text.length > 5000) {
      return new Response(
        JSON.stringify({ error: "text too long (max 5000 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const dir: Direction =
      direction === "en-bn" || direction === "bn-en" || direction === "auto"
        ? direction
        : "auto";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemFor(dir) },
          { role: "user", content: text },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limited. Please slow down and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (resp.status === 402) {
      return new Response(
        JSON.stringify({
          error: "AI credits exhausted. Add funds in Settings → Workspace → Usage.",
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "Translation service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const translation: string =
      data?.choices?.[0]?.message?.content?.trim() ?? "";

    return new Response(JSON.stringify({ translation, direction: dir }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
