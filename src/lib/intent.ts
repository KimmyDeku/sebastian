// Offline intent router — used when the AI core is unavailable so users are still routed correctly.
export function localIntent(t: string): { route: string; params: Record<string, any>; label: string } | null {
  const s = t.toLowerCase();
  const rules: [RegExp, string, string, Record<string, any>?][] = [
    [/emergenc|ambulance|police|fire (dept|department|brigade)|\bsos\b/, "discover", "Open emergency help", { category: "Emergency" }],
    [/recipe|cook|dinner|lunch|breakfast|bake|meal|dessert|cocktail|drink/, "recipes", "Find a recipe"],
    [/flight|fly to|airline/, "booking", "Search flights", { type: "flights" }],
    [/hotel|stay|lodge|bnb|b&b|accommodation|room/, "booking", "Find a stay", { type: "stays" }],
    [/car rental|rent a car|hire a car/, "booking", "Rent a car", { type: "cars" }],
    [/taxi|airport transfer/, "booking", "Book an airport taxi", { type: "taxis" }],
    [/trip|travel|itinerar|holiday|vacation|visit/, "travel", "Plan a trip"],
    [/near|nearby|pharmac|restaurant|cafe|coffee|mechanic|mall|cinema|park/, "discover", "Find nearby"],
    [/schedule|remind|appointment|meeting|calendar|birthday/, "schedule", "Open schedule"],
    [/budget|saving|expense|income|finance|money|spend/, "finance", "Review finances"],
    [/\b(e-?mail|gmail|inbox)\b/, "email", "Draft & read emails"],
    [/news|headline|breaking/, "news", "Read the news"],
    [/outfit|dress|hair|skin|fashion|wear|style/, "fashion", "Get style ideas"],
  ];
  for (const [re, route, label, params] of rules) if (re.test(s)) {
    const out = { route, label, params: { ...(params || {}) } as Record<string, any> };
    if (route === "discover" && !out.params.category) {
      const cat = ["Pharmacy", "Restaurant", "Cafe", "Mechanic", "Mall", "Cinema", "Hotel"].find((c) => s.includes(c.toLowerCase())) || (/coffee/.test(s) ? "Cafe" : /park/.test(s) ? "Recreation" : "");
      if (cat) out.params.category = cat;
    }
    return out;
  }
  return null;
}

export function routeHref(route: string, params: Record<string, any> = {}) {
  const q = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v == null || v === "") return;
    q.set(k, Array.isArray(v) ? v.join(",") : String(v));
  });
  const qs = q.toString();
  return `/${route}${qs ? "?" + qs : ""}`;
}
