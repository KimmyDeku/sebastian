// Small helpers for choosing pictures.

/** The thumbnail of a YouTube video, from its link (watch, youtu.be, shorts or embed). */
export function youtubeThumb(url?: string): string | undefined {
  const id = (url || "").match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/)?.[1];
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined;
}

/** What kind of food a recipe is, for a fitting photo when there's no picture of the dish itself. */
export function foodTopic(r: { title?: string; tags?: string[]; summary?: string }) {
  const t = `${r.title || ""} ${(r.tags || []).join(" ")}`.toLowerCase();
  const rules: [RegExp, string][] = [
    [/dessert|cake|mousse|cookie|brownie|tart|pudding|ice cream|cheesecake|chocolate|sweet/, "dessert"],
    [/smoothie|juice|cocktail|mocktail|drink|latte|tea\b|coffee/, "drink glass"],
    [/pancake|waffle|breakfast|omelette|egg|porridge|granola/, "breakfast plate"],
    [/salad|bowl|vegan|vegetarian/, "fresh salad bowl"],
    [/soup|stew|broth/, "soup bowl"],
    [/pasta|spaghetti|noodle|lasagne|lasagna/, "pasta dish"],
    [/curry|biryani|masala|dal\b/, "curry dish"],
    [/chicken|wings/, "chicken dish"],
    [/beef|steak|burger|lamb|pork|ribs/, "steak dinner plate"],
    [/fish|salmon|prawn|shrimp|seafood|tuna/, "seafood dish"],
    [/bread|loaf|bun|pizza|baking/, "fresh baked bread"],
    [/rice|sadza|maize|pap/, "african food plate"],
  ];
  return rules.find(([re]) => re.test(t))?.[1] || "plated food dish";
}

/** A fitting photo topic for a booking type. */
export const bookingTopic = (type: string) => ({ stays: "hotel room", restaurants: "restaurant interior", flights: "airplane travel", cars: "car rental", activities: "travel activity", tables: "restaurant table" } as Record<string, string>)[type] || "travel";
