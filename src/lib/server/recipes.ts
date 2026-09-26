import * as cheerio from "cheerio";
import { fetchText } from "./http";

/**
 * Recipe knowledge base adapter — whitelisted sources only:
 * allrecipes.com, foodnetwork.com/recipes, acouplecooks.com.
 * (Cheerio is the Node.js equivalent of Beautiful Soup.)
 */
export const RECIPE_WHITELIST = ["allrecipes.com", "foodnetwork.com", "acouplecooks.com"];

export interface ScrapedRecipe {
  id: string; title: string; image?: string; source: string; url: string; baseServings: number;
  totalTime?: string; ingredients: string[]; steps: string[]; summary?: string; tags: string[];
}

function isoDuration(d?: string) {
  if (!d || typeof d !== "string") return undefined;
  const m = d.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return undefined;
  const days = +(m[1] || 0), h = +(m[2] || 0) + days * 24, min = +(m[3] || 0);
  if (!h && !min) return undefined;
  return [h ? `${h} hr` : "", min ? `${min} min` : ""].filter(Boolean).join(" ");
}

function flatInstructions(x: any): string[] {
  if (!x) return [];
  if (typeof x === "string") return x.split(/\n+|(?<=\.)\s{2,}/).map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(x)) return x.flatMap(flatInstructions);
  if (x["@type"] === "HowToSection") return flatInstructions(x.itemListElement);
  if (x.text) return [cheerio.load(`<p>${x.text}</p>`)("p").text().trim()];
  if (x.name) return [x.name];
  return [];
}

function findRecipeNode(json: any): any {
  if (!json) return null;
  if (Array.isArray(json)) { for (const j of json) { const r = findRecipeNode(j); if (r) return r; } return null; }
  const t = json["@type"];
  if (t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"))) return json;
  if (json["@graph"]) return findRecipeNode(json["@graph"]);
  return null;
}

function imageOf(img: any): string | undefined {
  if (!img) return undefined;
  if (typeof img === "string") return img;
  if (Array.isArray(img)) return imageOf(img[0]);
  return img.url;
}

function yieldOf(y: any): number {
  const s = Array.isArray(y) ? y.join(" ") : String(y ?? "");
  const n = parseInt(s.match(/\d+/)?.[0] || "", 10);
  return n > 0 && n < 200 ? n : 4;
}

const decode = (s: string) => cheerio.load(`<i>${s}</i>`)("i").text().replace(/\s+/g, " ").trim();

export async function parseRecipePage(url: string): Promise<ScrapedRecipe | null> {
  try {
    const html = await fetchText(url, 9000);
    const $ = cheerio.load(html);
    let node: any = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      if (node) return;
      try { node = findRecipeNode(JSON.parse($(el).contents().text())); } catch {}
    });
    if (!node) return null;
    const ingredients = (node.recipeIngredient || []).map((s: string) => decode(String(s))).filter(Boolean);
    const steps = flatInstructions(node.recipeInstructions).map(decode).filter(Boolean);
    if (!ingredients.length || !steps.length) return null;
    const host = new URL(url).hostname.replace("www.", "");
    const cat = [].concat(node.recipeCategory || [], node.recipeCuisine || []).map(String);
    return {
      id: "r_" + Buffer.from(url).toString("base64").replace(/[^a-z0-9]/gi, "").slice(-18),
      title: decode(node.name || $("h1").first().text()),
      image: imageOf(node.image),
      source: host,
      url,
      baseServings: yieldOf(node.recipeYield),
      totalTime: isoDuration(node.totalTime) || isoDuration(node.cookTime),
      ingredients,
      steps,
      summary: node.description ? decode(String(node.description)).slice(0, 220) : undefined,
      tags: cat.slice(0, 4),
    };
  } catch { return null; }
}

async function searchAllrecipes(q: string) {
  const html = await fetchText(`https://www.allrecipes.com/search?q=${encodeURIComponent(q)}`);
  const $ = cheerio.load(html);
  const out = new Set<string>();
  $('a[href*="allrecipes.com/recipe/"]').each((_, a) => { const h = $(a).attr("href"); if (h) out.add(h.split("?")[0]); });
  return [...out];
}
async function searchFoodNetwork(q: string) {
  const html = await fetchText(`https://www.foodnetwork.com/search/${encodeURIComponent(q.replace(/\s+/g, "-"))}-`);
  const $ = cheerio.load(html);
  const out = new Set<string>();
  $('a[href*="foodnetwork.com/recipes/"]').each((_, a) => {
    let h = $(a).attr("href") || "";
    if (h.startsWith("//")) h = "https:" + h;
    if (/\/recipes\/[^/]+\/[^/]+-recipe/.test(h)) out.add(h.split("?")[0]);
  });
  return [...out];
}
async function searchCoupleCooks(q: string) {
  const html = await fetchText(`https://www.acouplecooks.com/?s=${encodeURIComponent(q)}`);
  const $ = cheerio.load(html);
  const out = new Set<string>();
  $("article a[href^='https://www.acouplecooks.com/']").each((_, a) => {
    const h = ($(a).attr("href") || "").split("?")[0];
    if (!/\/(category|tag|page|author)\//.test(h) && h.split("/").filter(Boolean).length === 3) out.add(h);
  });
  return [...out];
}

// Dietary restriction → ingredient words that must not appear.
const EXCLUDE: Record<string, string[]> = {
  vegetarian: ["chicken", "beef", "pork", "bacon", "ham", "lamb", "turkey", "sausage", "fish", "shrimp", "salmon", "tuna", "anchov", "gelatin", "prosciutto", "chorizo"],
  vegan: ["chicken", "beef", "pork", "bacon", "ham", "lamb", "turkey", "sausage", "fish", "shrimp", "salmon", "tuna", "egg", "milk", "butter", "cheese", "cream", "yogurt", "honey", "gelatin", "mayonnaise"],
  "no nuts": ["almond", "walnut", "pecan", "cashew", "peanut", "hazelnut", "pistachio", "macadamia", "nut "],
  "nut-free": ["almond", "walnut", "pecan", "cashew", "peanut", "hazelnut", "pistachio", "macadamia"],
  "lactose-free": ["milk", "butter", "cheese", "cream", "yogurt"],
  "dairy-free": ["milk", "butter", "cheese", "cream", "yogurt"],
  "gluten-free": ["flour", "bread", "pasta", "noodle", "soy sauce", "barley", "couscous", "breadcrumb", "tortilla"],
  "no pork": ["pork", "bacon", "ham", "prosciutto", "chorizo", "pancetta"],
  halal: ["pork", "bacon", "ham", "wine", "beer", "rum", "vodka", "gelatin"],
  "no alcohol": ["wine", "beer", "rum", "vodka", "gin", "whiskey", "bourbon", "tequila", "liqueur", "brandy"],
  "non-alcoholic": ["wine", "beer", "rum", "vodka", "gin", "whiskey", "bourbon", "tequila", "liqueur", "brandy"],
  "no seafood": ["fish", "shrimp", "salmon", "tuna", "crab", "lobster", "prawn", "anchov", "mussel", "clam"],
  "egg-free": ["egg"],
};

export function exclusionsFor(diet: string): string[] {
  const d = diet.toLowerCase();
  const out: string[] = [];
  for (const [k, words] of Object.entries(EXCLUDE)) if (d.includes(k)) out.push(...words);
  const allergy: string[] = d.match(/(?:allergic to|allergy to|no)\s+([a-z]+)/g) || [];
  allergy.forEach((m) => { const w = m.split(/\s+/).pop()!; if (w.length > 2 && !["nuts", "alcohol", "pork", "seafood"].includes(w)) out.push(w.replace(/s$/, "")); });
  return [...new Set(out)];
}

export function buildQuery(i: { occasion: string; category: string; diet: string; notes: string }) {
  const cat: Record<string, string> = { "To Share": "appetizer", Lunchbox: "lunchbox", Drink: "cocktail", Snack: "snack", Dessert: "dessert", Breakfast: "breakfast", Lunch: "lunch", Dinner: "dinner" };
  const occ: Record<string, string> = { "Lazy Sunday": "brunch", Wedding: "party", "Family Gathering": "family", Church: "potluck", Office: "party", "No occasion": "" };
  const d = i.diet.toLowerCase();
  const dietWord = ["vegan", "vegetarian", "gluten-free", "keto", "low carb", "dairy-free", "high protein", "healthy"].find((w) => d.includes(w)) || "";
  let base = cat[i.category] || i.category;
  if (i.category === "Drink" && /non-alcoholic|no alcohol|mocktail|kids/.test((d + " " + i.notes).toLowerCase())) base = "mocktail";
  const noteWords = i.notes.split(/[,.;]/)[0]?.split(/\s+/).filter((w) => w.length > 3).slice(0, 3).join(" ") || "";
  return [dietWord, noteWords, occ[i.occasion] ?? i.occasion, base].filter(Boolean).join(" ").trim();
}

export async function findRecipes(input: { occasion: string; category: string; diet: string; notes: string }, want = 10) {
  const q = buildQuery(input);
  const simpleQ = buildQuery({ ...input, notes: "", occasion: "No occasion" });
  const isDrink = input.category === "Drink";
  const searches = await Promise.allSettled([
    searchAllrecipes(q), searchFoodNetwork(q), isDrink ? searchCoupleCooks(simpleQ) : Promise.resolve([] as string[]),
    q !== simpleQ ? searchAllrecipes(simpleQ) : Promise.resolve([] as string[]),
  ]);
  const lists = searches.map((s) => (s.status === "fulfilled" ? s.value : []));
  // Interleave sources for variety
  const urls: string[] = [];
  for (let i = 0; i < 30; i++) for (const l of lists) if (l[i] && !urls.includes(l[i])) urls.push(l[i]);
  const candidates = urls.slice(0, 22);
  const parsed = (await Promise.all(candidates.map(parseRecipePage))).filter(Boolean) as ScrapedRecipe[];
  const excl = exclusionsFor(input.diet + " " + input.notes);
  const safe = parsed.filter((r) => !excl.some((w) => r.ingredients.join(" ").toLowerCase().includes(w)));
  return { query: q, recipes: safe.slice(0, want), exclusions: excl, scanned: parsed.length, sourcesTried: lists.map((l) => l.length) };
}
