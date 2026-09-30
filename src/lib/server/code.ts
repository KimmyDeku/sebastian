// Coding AI. Uses Groq by default (GROQ_API_KEY). Set CODE_PROVIDER=openai to use OpenAI instead.
type Provider = "groq" | "openai";

export function codeProvider(): Provider | null {
  const want = (process.env.CODE_PROVIDER || "groq").toLowerCase();
  if (want === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GROQ_API_KEY) return "groq";
  return process.env.OPENAI_API_KEY ? "openai" : null;
}
export const codeReady = () => codeProvider() !== null;

const CONFIG = {
  groq: { name: "Groq", url: "https://api.groq.com/openai/v1/chat/completions", key: () => process.env.GROQ_API_KEY!, model: () => process.env.GROQ_CODE_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile", env: "GROQ_API_KEY" },
  openai: { name: "OpenAI", url: "https://api.openai.com/v1/chat/completions", key: () => process.env.OPENAI_API_KEY!, model: () => process.env.OPENAI_CODE_MODEL || "gpt-4o-mini", env: "OPENAI_API_KEY" },
};

export async function codeComplete(system: string, msgs: { role: string; content: string }[], where: string) {
  const provider = codeProvider();
  if (!provider) throw new Error("No coding AI is set up. Add GROQ_API_KEY to .env.local (and to Vercel), then restart.");
  const c = CONFIG[provider];
  const model = c.model();
  const messages = [{ role: "system", content: system }, ...msgs.slice(-12).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 12000) }))];
  const body: any = { model, messages };
  if (provider === "groq") { body.max_tokens = 4000; body.temperature = 0.2; } else body.max_completion_tokens = 4000;
  const r = await fetch(c.url, { method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${c.key()}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j?.error?.message || `${c.name} returned ${r.status}`;
    const hint = r.status === 401 ? ` Check ${c.env} in .env.local.` : r.status === 429 ? ` ${c.name}'s rate or usage limit was reached; wait a minute and try again.` : r.status === 404 || r.status === 400 ? ` Check the coding model name (${model}).` : "";
    throw new Error(msg + hint);
  }
  const input = j.usage?.prompt_tokens || 0, output = j.usage?.completion_tokens || 0;
  const inPrice = Number(process.env.CODE_INPUT_PRICE_PER_1M || process.env.OPENAI_INPUT_PRICE_PER_1M || 0);
  const outPrice = Number(process.env.CODE_OUTPUT_PRICE_PER_1M || process.env.OPENAI_OUTPUT_PRICE_PER_1M || 0);
  const cost = inPrice || outPrice ? (input * inPrice + output * outPrice) / 1e6 : undefined;
  return { reply: String(j.choices?.[0]?.message?.content || ""), codingUsage: { provider: c.name, model: j.model || model, input, output, cost, where } };
}
