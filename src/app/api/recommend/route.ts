import { claudeJSON, errorResponse, SEBASTIAN_CORE } from "@/lib/server/ai";
export const runtime = "nodejs";
export const maxDuration = 45;

/** Personal suggestions: recipes, destinations, things to do and events the user is likely to enjoy. */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const r = await claudeJSON<any>(`${SEBASTIAN_CORE}
Role: Sebastian's recommender. Suggest things this particular person is likely to enjoy, based on what you know about them.
Rules:
- Exactly 6 suggestions: 2 recipes, 1 or 2 destinations, and 2 or 3 things to do or events, mixed to suit them.
- Each must clearly fit their tastes; say why in one short, warm sentence that refers to what you know ("Because you loved...", "You've been planning beach trips...").
- Respect their diet and dislikes. Never repeat anything they marked "not interested", and lean towards what they liked.
- Events: never invent specific events, dates, venues or prices. Only name a well-known recurring event if you are confident it exists, and add "check this year's dates". Otherwise suggest a kind of outing to look for nearby.
- Keep it local to where they live where it makes sense, with the occasional bigger idea.`,
      `Today: ${b.today} (${b.month}). They live in: ${b.home || "Zimbabwe"}.
What Sebastian knows about them: ${String(b.memory || "").slice(0, 3500)}
Interests they gave: ${JSON.stringify(b.interests || []).slice(0, 600)}
Trip DNA: ${JSON.stringify(b.tripDNA || {}).slice(0, 500)}
Saved recipes: ${JSON.stringify(b.cookbook || []).slice(0, 500)}
Recent activity: ${JSON.stringify(b.activity || []).slice(0, 1200)}
Liked before: ${JSON.stringify(b.liked || []).slice(0, 600)}
Not interested in: ${JSON.stringify(b.disliked || []).slice(0, 600)}
Return JSON only: {"items":[{"type":"recipe|destination|activity|event","title":"short","why":"one sentence","query":"for recipes the dish name; for destinations 'City, Country'; for activities or events what to search for nearby"}]}`, 1500);
    const items = (Array.isArray(r.items) ? r.items : []).filter((x: any) => x?.title && ["recipe", "destination", "activity", "event"].includes(x.type)).slice(0, 8)
      .map((x: any) => ({ type: x.type, title: String(x.title).slice(0, 80), why: String(x.why || "").slice(0, 200), query: String(x.query || x.title).slice(0, 120) }));
    return Response.json({ ok: items.length > 0, items });
  } catch (e) { return errorResponse(e); }
}
