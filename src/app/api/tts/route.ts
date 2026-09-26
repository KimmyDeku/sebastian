export const runtime = "nodejs";

// Turns text into speech with ElevenLabs. The API key stays on the server.
export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  const voice = process.env.ELEVENLABS_VOICE_ID;
  if (!key || !voice) return Response.json({ ok: false, code: "tts_unavailable" }, { status: 503 });

  const { text } = await req.json();
  const clean = String(text || "").replace(/[*_#>`]/g, "").slice(0, 2500);
  if (!clean.trim()) return Response.json({ ok: false, error: "Nothing to read." }, { status: 400 });

  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text: clean,
      model_id: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.8 },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    return Response.json({ ok: false, error: `Voice service returned ${r.status}: ${t.slice(0, 200)}` }, { status: 502 });
  }
  return new Response(r.body, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
}