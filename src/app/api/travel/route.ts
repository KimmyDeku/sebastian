import { claudeJSON, errorResponse, SEBASTIAN_CORE } from "@/lib/server/ai";
import { getWeather } from "@/lib/server/weather";
import { flightLinks, stayLinks } from "@/lib/server/links";

export const runtime = "nodejs";
export const maxDuration = 60;

const ADVISOR = `${SEBASTIAN_CORE}
Role: a travel advisor and guide with over 40 years' experience. Be destination-focused, practical and budget-aware. Name real places.`;

export async function POST(req: Request) {
  try {
    const t = await req.json();
    const days = Math.max(1, Math.min(14, t.days || 3));
    let weather: any = null;
    try { weather = await getWeather({ place: t.destination }); } catch {}
    const wx = weather ? weather.days.map((d: any) => `${d.date}: ${d.label}, ${Math.round(d.min)}–${Math.round(d.max)}°C, rain ${d.precip}%`).join("; ") : "unavailable";
    const it = await claudeJSON<any>(ADVISOR,
      `Plan a ${days}-day trip to ${t.destination} from ${t.start} to ${t.end} for ${t.travellers} traveller(s), total budget $${t.budget} (excluding flights unless noted). Interests: ${(t.activities || []).join(", ") || "general sightseeing"}. Pace: ${t.pace || "balanced"}. Extra: ${t.notes || "none"}.
Traveller's saved preferences (Trip DNA): ${JSON.stringify(t.dna || {})}.
7-day forecast from today (may not cover trip dates): ${wx}.
Return {"summary":"2 sentences","days":[{"day":1,"date":"YYYY-MM-DD","title","morning","afternoon","evening","estCost":number}],"attractions":[{"name","why"}] (6),"budgetBreakdown":[{"item","amount"}],"tips":[4 practical tips incl. weather-aware packing]}`, 5000);
    const home = t.origin || "";
    return Response.json({
      ok: true,
      itinerary: it,
      weather,
      stays: stayLinks({ dest: t.destination, checkin: t.start, checkout: t.end, adults: t.travellers }),
      flights: home ? flightLinks({ from: home, to: t.destination, depart: t.start, ret: t.end, adults: t.travellers }) : flightLinks({ from: "", to: t.destination, depart: t.start, ret: t.end }),
      generatedAt: new Date().toISOString(),
    });
  } catch (e) { return errorResponse(e); }
}
