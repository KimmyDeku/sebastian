import { aiConfigured, claudeJSON, SEBASTIAN_CORE } from "@/lib/server/ai";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const { text, today, address } = await req.json();
  if (!aiConfigured()) {
    // Minimal offline parser so the flow still works.
    const dest = text.match(/(?:to|visit|in)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/)?.[1] || "";
    const days = +(text.match(/(\d+)\s*(?:days|nights)/i)?.[1] || 0) || (/five days/i.test(text) ? 5 : 0);
    const budget = +(text.match(/\$\s?([\d,]+)/)?.[1]?.replace(/,/g, "") || 0);
    return Response.json({ ok: true, destination: dest, days, budget, activities: [], missing: ["dates"], reply: dest ? `Understood. I'll plan around ${dest}. What dates would you prefer?` : "Where would you like to go?" });
  }
  const r = await claudeJSON<any>(`${SEBASTIAN_CORE}\nRole: travel advisor with 40+ years' experience. Today is ${today}. The user is ${address}.`,
    `Extract trip details from: "${text}". Map interests to these activity labels when possible: Food & dining, Beaches, Museums, Nature & hiking, Nightlife, Shopping, History & culture, Adventure, Wellness, Family friendly.
Return {"destination":"","start":"YYYY-MM-DD or empty","end":"YYYY-MM-DD or empty","days":0,"month":"","budget":0,"travellers":0,"activities":[],"missing":["dates"|"destination"|"budget"|"travellers"],"reply":"Sebastian acknowledging what he understood and asking ONE focused question about the most important missing item"}`);
  return Response.json({ ok: true, ...r });
}
