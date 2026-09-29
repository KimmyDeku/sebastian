import { aiConfigured, claudeJSON, SEBASTIAN_CORE } from "@/lib/server/ai";
import { attractionLinks, carLinks, flightLinks, stayLinks, taxiLinks } from "@/lib/server/links";
import { searchPlaces } from "@/lib/server/places";
import { tripadvisorFind } from "@/lib/server/tripadvisor";

export const runtime = "nodejs";
export const maxDuration = 60;

const AGENT = `${SEBASTIAN_CORE}
Role: a booking assistant with over 30 years' experience finding cheap and optimal reservations. You cannot see live availability or live prices; give typical price ranges as estimates.`;

const busLinks = () => ({
  busbud: "https://www.busbud.com/", checkmybus: "https://www.checkmybus.com/", omio: "https://www.omio.com/", "12go": "https://12go.asia/en", intercape: "https://www.intercape.co.za/",
});

function prompts(type: string, b: any) {
  switch (type) {
    case "stays": return `Suggest 8 real, well-known ${b.entireHome ? "apartments or entire homes" : "hotels, lodges or B&Bs"} in ${b.dest} for ${b.adults} adults, ${b.children} children, ${b.rooms} room(s), ${b.checkin} to ${b.checkout}${b.work ? ", business trip" : ""}. Mix budget to premium.`;
    case "flights": return `Advise on flights from ${b.from} to ${b.to}, ${b.trip === "round" ? `round trip ${b.depart} to ${b.ret}` : `one way on ${b.depart}`}, ${b.adults} adult(s), ${b.cabin}. List up to 6 airlines or routings that typically serve this route. Use "area" for the routing (e.g. "via Johannesburg (JNB)"), "kind" for Direct or number of stops, and include typical duration in amenities.`;
    case "cars": return `Car rental in ${b.where} from ${b.pickup} to ${b.dropoff}, driver aged ${b.age}. Suggest 6 vehicle classes or rental companies that operate there, with the pick-up point as "area".`;
    case "attractions": return `Top 8 bookable attractions or tours in ${b.where} around ${b.date}, with duration and best time in amenities.`;
    case "taxis": return `Airport transfer from ${b.from} to ${b.to} on ${b.date} at ${b.time} for ${b.passengers} passengers. Suggest 4 options (standard, executive, people carrier, shared shuttle), with capacity and luggage in amenities.`;
    case "bus": return `Ground transport from ${b.from} to ${b.to} on ${b.date} for ${b.passengers} passenger(s), preferred mode: ${b.mode || "any"}. List up to 6 real bus, coach, train or ferry operators that serve this route, with typical departure times and journey length in amenities, and the departure point as "area".`;
  }
  return "";
}

export async function POST(req: Request) {
  const b = await req.json();
  const type: string = b.type;
  try {
    const links: Record<string, string | undefined> =
      type === "stays" ? stayLinks({ dest: b.dest, checkin: b.checkin, checkout: b.checkout, adults: b.adults, children: b.children, rooms: b.rooms, entireHome: b.entireHome, work: b.work })
      : type === "flights" ? flightLinks({ from: b.from, to: b.to, depart: b.depart, ret: b.trip === "round" ? b.ret : undefined, adults: b.adults, cabin: b.cabin })
      : type === "cars" ? carLinks({ where: b.where })
      : type === "attractions" ? attractionLinks({ where: b.where })
      : type === "taxis" ? taxiLinks()
      : type === "bus" ? busLinks()
      : {};
    if (!prompts(type, b)) return Response.json({ ok: false, error: "Unknown booking type." }, { status: 400 });

    let items: any[] = [];
    const sources: string[] = [];

    // 1) Real places from Google (stays and attractions): names, photos, ratings and review counts.
    if ((type === "stays" || type === "attractions") && process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const where = type === "stays" ? b.dest : b.where;
        const g = await searchPlaces({ category: type === "stays" ? "hotel" : "attraction", text: type === "stays" ? `${b.entireHome ? "apartments" : "hotels"} in ${where}` : `top attractions in ${where}`, where });
        items = g.results.slice(0, 12).map((p: any) => ({ name: p.name, area: p.address, photo: p.photo, mapsUrl: p.mapsUrl, rating: p.rating, reviews: p.ratingCount, lat: p.lat, lng: p.lng, source: "Google" }));
        if (items.length) sources.push("Google");
      } catch {}
    }

    // 2) Sebastian's knowledge: price estimates for the real places, or suggestions when there are none.
    if (aiConfigured()) {
      try {
        const known = items.length ? `\nThese real places were found: ${JSON.stringify(items.map((i) => i.name))}. Return one entry for EACH of them, in the same order, using the exact names.` : "";
        const r = await claudeJSON<{ items: any[]; advice: string }>(AGENT,
          `${prompts(type, b)}${known}\nReturn {"items":[{"name","area","kind","priceEstimate":"typical range, e.g. $80–120 / night","amenities":[max 4],"why":"one line"}],"advice":"one or two lines on getting the best rate"}`, 2800);
        const ai = Array.isArray(r.items) ? r.items : [];
        if (items.length) items = items.map((it, i) => ({ ...(ai.find((a) => a.name === it.name) || ai[i] || {}), ...it, name: it.name }));
        else { items = ai.map((a) => ({ ...a, source: "Sebastian" })); sources.push("Sebastian"); }
        (b as any).advice = r.advice;
      } catch {}
    }

    // 3) Tripadvisor ratings and links (stays and attractions), when the API key is set.
    if ((type === "stays" || type === "attractions") && process.env.TRIPADVISOR_API_KEY && items.length) {
      const where = type === "stays" ? b.dest : b.where;
      const ta = await Promise.all(items.slice(0, 10).map((it) => tripadvisorFind(`${it.name} ${where}`, type === "stays" ? "hotels" : "attractions")));
      ta.forEach((t, i) => { if (t) items[i] = { ...items[i], ta: t, photo: items[i].photo || t.photo }; });
      if (ta.some(Boolean)) sources.push("Tripadvisor");
    }

    if (!items.length) {
      return Response.json({ ok: true, items: [], links, sources, aiUnavailable: !aiConfigured(), advice: aiConfigured() ? "No options came back for that search. Try a nearby city or different dates." : "Sebastian's suggestions need the AI service. You can still search the providers directly below.", updatedAt: new Date().toISOString() });
    }

    const enriched = items.map((it, i) => ({
      ...it,
      id: `${type}_${i}_${String(it.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
      link: type === "stays" ? stayLinks({ dest: `${it.name}, ${b.dest}`, checkin: b.checkin, checkout: b.checkout, adults: b.adults, children: b.children, rooms: b.rooms }).booking
        : type === "bus" ? links.busbud : links.booking,
    }));
    return Response.json({ ok: true, items: enriched, links, sources, advice: (b as any).advice, updatedAt: new Date().toISOString() });
  } catch (e: any) {
    return Response.json({ ok: false, error: "Sebastian couldn't prepare results: " + String(e?.message || e) }, { status: 502 });
  }
}
