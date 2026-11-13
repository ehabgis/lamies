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

  /**
   * messages: [{ role: "system" | "user" | "assistant", content }] → text.
   * A ticket from aiGuard.mjs is required (M6): without one nothing is sent.
   * Its signal carries the time limit and stops the call if the browser leaves;
   * its finish() gets the token usage the provider reports.
   */
  async function chat(messages, { maxTokens = 400, ticket } = {}) {
    if (!ticket) throw Error("no AI ticket");
    let usage = null;
    try {
      if (cloudflare) {
        const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cfAccount)}/ai/run/${cfModel}`;
        const r = await fetchImpl(url, {
          method: "POST",
          signal: ticket.signal,
          headers: { Authorization: `Bearer ${cfToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messages, max_tokens: maxTokens, temperature: 0.3 }),
        });
        if (!r.ok) throw Error(`cloudflare ${r.status}`);
        const data = await r.json();
        usage = usageOf(data?.result?.usage);
        const text = typeof data?.result?.response === "string" ? data.result.response : "";
        if (!data?.success && data?.success !== undefined) throw Error("cloudflare failed");
        ticket.finish(usage);
        return clean(text);
      }
      if (openaiKey) {
        const [system, ...rest] = messages;
        const r = await fetchImpl("https://api.openai.com/v1/responses", {
          method: "POST",
          signal: ticket.signal,
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
        usage = data.usage ? { promptTokens: data.usage.input_tokens, completionTokens: data.usage.output_tokens } : null;
        ticket.finish(usage);
        return clean(data.output?.flatMap((o) => o.content || []).filter((c) => c.type === "output_text").map((c) => c.text).join("") || "");
      }
      throw Error("no model configured");
    } catch (e) {
      ticket.finish(usage, e?.name === "TimeoutError" || e?.name === "AbortError" ? "timeout" : "error");
      throw e;
    }
  }
  return { available: Boolean(name), name, model: cloudflare ? cfModel : openaiModel, chat };
}

// Cloudflare's run response may carry { prompt_tokens, completion_tokens }.
function usageOf(u) {
  return u && Number.isFinite(u.prompt_tokens) && Number.isFinite(u.completion_tokens)
    ? { promptTokens: u.prompt_tokens, completionTokens: u.completion_tokens }
    : null;
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
