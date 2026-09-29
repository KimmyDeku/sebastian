import { claudeJSON, errorResponse, SEBASTIAN_CORE } from "@/lib/server/ai";
import { flightLinks, stayLinks } from "@/lib/server/links";
import { findEtiquette } from "@/lib/server/etiquette";

export const runtime = "nodejs";
export const maxDuration = 60;

const ADVISOR = `${SEBASTIAN_CORE}
Role: a travel advisor and guide with over 40 years' experience. Be destination-focused, practical and budget-aware. Name real places.`;

// Builds the itinerary. Weather is deliberately left out because forecasts change; the app shows it live instead.
export async function POST(req: Request) {
  try {
    const t = await req.json();
    const days = Math.max(1, Math.min(14, Number(t.days) || 3));
    const month = t.start ? new Date(t.start + "T00:00").toLocaleDateString("en-GB", { month: "long" }) : "";
    const source = await findEtiquette(t.destination, t.country).catch(() => null);
    const it = await claudeJSON<any>(ADVISOR,
      `Plan a ${days}-day trip to ${t.destination} from ${t.start} to ${t.end} for ${t.travellers} traveller(s), total budget $${t.budget} (excluding flights). Interests: ${(t.activities || []).join(", ") || "general sightseeing"}. Pace: ${t.pace || "balanced"}. Must-see places the traveller picked: ${(t.mustSee || []).join(", ") || "none"}. Extra notes: ${t.notes || "none"}.
Traveller's saved preferences (Trip DNA): ${JSON.stringify(t.dna || {})}.
${source ? `Local etiquette guidance from Wikivoyage (${source.title}). Summarise it faithfully and don't add claims it doesn't support:\n"""${source.text}"""` : "No etiquette source was found. Give well-established, general etiquette for this country."}
Do not mention weather forecasts anywhere. Packing tips may mention what is typical for ${month || "that time of year"}.
Return {"summary":"2 sentences","days":[{"day":1,"date":"YYYY-MM-DD","title","morning","afternoon","evening","estCost":number}],"attractions":[{"name","why"}] (6),"budgetBreakdown":[{"item","amount":number}],"tips":[4 practical tips],"etiquette":[6 short, specific tips covering greetings, dress, tipping, photography, dining and religious or sacred sites]}`, 5500);
    it.etiquetteSource = source ? { title: source.title, url: source.url } : null;
    return Response.json({
      ok: true,
      itinerary: it,
      stays: stayLinks({ dest: t.destination, checkin: t.start, checkout: t.end, adults: t.travellers }),
      flights: flightLinks({ from: t.origin || "", to: t.destination, depart: t.start, ret: t.end, adults: t.travellers }),
      generatedAt: new Date().toISOString(),
    });
  } catch (e) { return errorResponse(e); }
}
