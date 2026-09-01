// Generates an in-character reply from a simulated Fiverr inbox contact
// using the Lovable AI Gateway Responses API.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Turn = { sender: "me" | "contact"; body: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { contactName, contactRole, messages } = (await req.json()) as {
      contactName?: string;
      contactRole?: string;
      messages?: Turn[];
    };

    const history = (messages ?? []).slice(-20);
    const transcript = history
      .map((m) => `${m.sender === "me" ? "Seller" : contactName ?? "Buyer"}: ${m.body}`)
      .join("\n");

    const instructions = [
      `You are ${contactName ?? "a Fiverr buyer"}, a ${contactRole ?? "Buyer"} chatting with a freelance seller inside Fiverr's message inbox.`,
      "Stay fully in character as the client. Never mention being an AI.",
      "Reply naturally to the seller's latest message: reference what they actually said, ask realistic follow-up questions about scope, timeline, revisions, deliverables or budget, and keep momentum toward placing an order.",
      "Keep it to 1-3 short sentences, casual and professional. Plain text only, no markdown, no quotation marks around the reply.",
      "Never suggest moving off Fiverr and never ask for external contact details.",
    ].join(" ");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        instructions,
        input: `Conversation so far:\n${transcript}\n\nWrite your next reply as ${contactName ?? "the buyer"}.`,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      return new Response(JSON.stringify({ error: detail || "AI gateway error" }), {
        status: res.status || 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Accumulate the SSE stream into the final reply text.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const evt = JSON.parse(raw);
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            text += evt.delta;
          } else if (evt.type === "response.completed" && !text) {
            text = evt.response?.output_text ?? "";
          }
        } catch {
          // ignore partial/non-JSON events
        }
      }
    }

    return new Response(JSON.stringify({ reply: text.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
