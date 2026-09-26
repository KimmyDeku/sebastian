import { findRecipes } from "@/lib/server/recipes";
import { aiConfigured, claudeJSON, SEBASTIAN_CORE } from "@/lib/server/ai";
import { normalizeRecipe, toText } from "@/lib/util";

export const runtime = "nodejs";
export const maxDuration = 60;

const CHEF = `${SEBASTIAN_CORE}
Role: a chef with over 20 years' experience and a dietician with over 10 years' experience.`;

export async function POST(req: Request) {
  const input = await req.json();
  const { occasion = "No occasion", category = "Dinner", diet = "", notes = "", servings = 2 } = input;
  try {
    const found = await findRecipes({ occasion, category, diet, notes }, 10);
    let recipes: any[] = found.recipes;
    const chefNotes: Record<string, string> = {};
    let generatedCount = 0;

    if (aiConfigured()) {
      const missing = Math.max(0, 10 - recipes.length);
      try {
        const res = await claudeJSON<{ notes: { id: string; note: string }[]; extra: any[] }>(CHEF,
          `Occasion: ${occasion}. Category: ${category}. Serving ${servings}. Dietary restrictions/allergies: ${diet || "none"}. Notes: ${notes || "none"}.
Here are recipes retrieved from whitelisted sites: ${JSON.stringify(recipes.map((r) => ({ id: r.id, title: r.title, ingredients: r.ingredients.slice(0, 14) })))}
1) For each, write a one-sentence chef/dietician note tailored to the user's needs (flag any ingredient that conflicts with restrictions).
2) Then create exactly ${missing} additional original recipes matching the request (they will be clearly labelled as Sebastian's own, not from a source). Each: {"title","summary","baseServings":${servings},"totalTime","ingredients":[...],"steps":[...],"tags":[...]}.
Return {"notes":[{"id","note"}],"extra":[...]}`, 6000);
        (res.notes || []).forEach((n) => (chefNotes[n.id] = toText(n.note)));
        const extra = (res.extra || []).slice(0, missing).map((r: any, i: number) => ({ ...normalizeRecipe(r), id: "g_" + Date.now().toString(36) + i, source: "Sebastian's kitchen", generated: true }));
        generatedCount = extra.length;
        recipes = [...recipes, ...extra];
      } catch { /* notes are a bonus; scraped results still stand */ }
    }

    if (!recipes.length) {
      return Response.json({ ok: false, code: "empty", error: "No matching recipes were found on the whitelisted sites for those filters. Try a broader category or fewer notes.", query: found.query }, { status: 404 });
    }
    return Response.json({ ok: true, query: found.query, exclusions: found.exclusions, recipes: recipes.map((r) => ({ ...r, chefNote: chefNotes[r.id] })), generatedCount, fetchedAt: new Date().toISOString() });
  } catch (e: any) {
    return Response.json({ ok: false, code: "error", error: "The recipe sources could not be reached. " + String(e?.message || e) }, { status: 502 });
  }
}
