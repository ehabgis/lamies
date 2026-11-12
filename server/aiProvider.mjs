// The language model behind «المعلم الذكي» (2026-11-12): Cloudflare Workers
// AI, called from the server only. Its account id and token are server
// environment variables and never reach the browser:
//   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, CLOUDFLARE_AI_MODEL (optional)
// Without them, the OpenAI key used before still works; with neither,
// callers use their prepared texts.
export const DEFAULT_CF_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export function createAiProvider({
  fetchImpl = fetch,
  cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID,
  cfToken = process.env.CLOUDFLARE_API_TOKEN,
  cfModel = process.env.CLOUDFLARE_AI_MODEL || DEFAULT_CF_MODEL,
  openaiKey,
  openaiModel = "gpt-4.1-mini",
  timeoutMs = 15000,
} = {}) {
  const cloudflare = Boolean(cfAccount && cfToken);
  const name = cloudflare ? "cloudflare" : openaiKey ? "openai" : null;

  /** messages: [{ role: "system" | "user" | "assistant", content }] → text */
  async function chat(messages, { maxTokens = 400 } = {}) {
    if (cloudflare) {
      const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cfAccount)}/ai/run/${cfModel}`;
      const r = await fetchImpl(url, {
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Authorization: `Bearer ${cfToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messages, max_tokens: maxTokens, temperature: 0.3 }),
      });
      if (!r.ok) throw Error(`cloudflare ${r.status}`);
      const data = await r.json();
      const text = typeof data?.result?.response === "string" ? data.result.response : "";
      if (!data?.success && data?.success !== undefined) throw Error("cloudflare failed");
      return clean(text);
    }
    if (openaiKey) {
      const [system, ...rest] = messages;
      const r = await fetchImpl("https://api.openai.com/v1/responses", {
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: openaiModel,
          max_output_tokens: maxTokens,
          store: false,
          instructions: system.content,
          input: rest.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!r.ok) throw Error(`openai ${r.status}`);
      const data = await r.json();
      return clean(data.output?.flatMap((o) => o.content || []).filter((c) => c.type === "output_text").map((c) => c.text).join("") || "");
    }
    throw Error("no model configured");
  }
  return { available: Boolean(name), name, chat };
}

// Plain text only: no markup or links in a child's card.
function clean(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[*#_`>]+/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 900);
}
