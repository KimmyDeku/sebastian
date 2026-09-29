// Shared OpenAI coding helper. Returns the reply and the tokens used (shown in Settings).
export const openaiReady = () => !!process.env.OPENAI_API_KEY;

export async function openaiCode(system: string, msgs: { role: string; content: string }[], where: string) {
  const key = process.env.OPENAI_API_KEY!;
  const model = process.env.OPENAI_CODE_MODEL || "gpt-4o-mini";
  const messages = [{ role: "system", content: system }, ...msgs.slice(-12).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 12000) }))];
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", cache: "no-store",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model, messages, max_completion_tokens: 4000 }),
  });
  const j = await r.json();
  if (!r.ok) {
    const msg = j?.error?.message || `OpenAI returned ${r.status}`;
    const hint = r.status === 401 ? " Check OPENAI_API_KEY." : r.status === 429 ? " You may have reached your OpenAI usage or rate limit." : r.status === 404 ? " Check OPENAI_CODE_MODEL is a model your account can use." : "";
    throw new Error(msg + hint);
  }
  const input = j.usage?.prompt_tokens || 0, output = j.usage?.completion_tokens || 0;
  const inPrice = Number(process.env.OPENAI_INPUT_PRICE_PER_1M || 0), outPrice = Number(process.env.OPENAI_OUTPUT_PRICE_PER_1M || 0);
  const cost = inPrice || outPrice ? (input * inPrice + output * outPrice) / 1e6 : undefined;
  return { reply: String(j.choices?.[0]?.message?.content || ""), codingUsage: { model: j.model || model, input, output, cost, where } };
}
