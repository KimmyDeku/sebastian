import { aiConfigured, claudeJSON, SEBASTIAN_CORE } from "@/lib/server/ai";
import { attractionLinks, carLinks, flightLinks, stayLinks, taxiLinks } from "@/lib/server/links";
import { searchPlaces } from "@/lib/server/places";

export const runtime = "nodejs";
export const maxDuration = 45;

const AGENT = `${SEBASTIAN_CORE}
Role: a booking assistant with over 30 years' experience finding cheap and optimal reservations. You cannot see live availability or live prices; give typical price ranges as estimates and say they must be verified with the provider.`;

export async function POST(req: Request) {
  const b = await req.json();
  const type: string = b.type;
  try {
    let links: Record<string, string | undefined> = {};
    let prompt = "";
    if (type === "stays") {
      links = stayLinks({ dest: b.dest, checkin: b.checkin, checkout: b.checkout, adults: b.adults, children: b.children, rooms: b.rooms, entireHome: b.entireHome, work: b.work });
      prompt = `Suggest 6 real, well-known ${b.entireHome ? "apartments/entire homes" : "hotels, lodges or B&Bs"} in ${b.dest} for ${b.adults} adults, ${b.children} children, ${b.rooms} room(s), ${b.checkin} to ${b.checkout}${b.work ? ", business trip" : ""}. Mix budget to premium. Return {"items":[{"name","area","kind":"Hotel|Lodge|B&B|Apartment","priceEstimate":"e.g. $80–120 / night","amenities":[max 4],"why":"one line"}],"advice":"one or two lines on getting the best rate"}`;
    } else if (type === "flights") {
      links = flightLinks({ from: b.from, to: b.to, depart: b.depart, ret: b.trip === "round" ? b.ret : undefined, adults: b.adults, cabin: b.cabin });
      prompt = `Advise on flights from ${b.from} to ${b.to}, ${b.trip === "round" ? "round trip" : "one way"}, departing ${b.depart}${b.trip === "round" ? `, returning ${b.ret}` : ""}, ${b.adults} adult(s), ${b.cabin}. List up to 5 airlines that typically serve this route. Return {"items":[{"name":"airline","area":"typical routing, e.g. direct or via JNB","kind":"Direct|1 stop","priceEstimate":"typical fare range","amenities":["typical duration", "bag note"],"why":"one line"}],"advice":"cheapest-time-to-book tip"}`;
    } else if (type === "cars") {
      links = carLinks({ where: b.where });
      prompt = `Car rental in ${b.where} from ${b.pickup} to ${b.dropoff}, driver aged ${b.age}. Suggest 5 vehicle classes/rental companies that operate there. Return {"items":[{"name","area":"pick-up point","kind":"Economy|SUV|...","priceEstimate":"per day","amenities":[...],"why"}],"advice":"one line"}`;
    } else if (type === "attractions") {
      links = attractionLinks({ where: b.where });
      prompt = `Top 6 bookable attractions or tours in ${b.where} around ${b.date}. Return {"items":[{"name","area","kind":"Tour|Museum|Outdoor|...","priceEstimate":"ticket range","amenities":["duration","best time"],"why"}],"advice":"one line"}`;
    } else if (type === "taxis") {
      links = taxiLinks();
      prompt = `Airport taxi from ${b.from} to ${b.to} on ${b.date} at ${b.time} for ${b.passengers} passengers. Suggest 4 options (standard, executive, people carrier, shuttle). Return {"items":[{"name","area":"route","kind":"Standard|Executive|...","priceEstimate":"typical fare","amenities":["capacity","luggage"],"why"}],"advice":"one line"}`;
    } else return Response.json({ ok: false, error: "Unknown booking type." }, { status: 400 });

    if (!aiConfigured()) {
      return Response.json({ ok: true, items: [], links, aiUnavailable: true, advice: "Sebastian's suggestions need the AI service. You can still search the providers directly with your filters below." });
    }
    const r = await claudeJSON<{ items: any[]; advice: string }>(AGENT, prompt, 2200);
    // Photos for stays when Google Places is available.
    if (type === "stays" && process.env.GOOGLE_MAPS_API_KEY) {
      await Promise.all(r.items.map(async (it) => {
        try { const g = await searchPlaces({ category: "hotel", text: `${it.name} ${b.dest}`, where: b.dest }); it.photo = g.results[0]?.photo; it.mapsUrl = g.results[0]?.mapsUrl; } catch {}
      }));
    }
    const enriched = r.items.map((it, i) => ({
      ...it, id: `${type}_${i}_${Date.now().toString(36)}`,
      link: type === "stays" ? stayLinks({ dest: `${it.name}, ${b.dest}`, checkin: b.checkin, checkout: b.checkout, adults: b.adults, children: b.children, rooms: b.rooms }).booking : links.booking,
    }));
    return Response.json({ ok: true, items: enriched, links, advice: r.advice, generatedAt: new Date().toISOString() });
  } catch (e: any) {
    return Response.json({ ok: false, error: "Sebastian couldn't prepare suggestions: " + String(e?.message || e) }, { status: 502 });
  }
}
