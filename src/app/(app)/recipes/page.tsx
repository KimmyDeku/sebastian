"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, ChefHat, ChevronLeft, ChevronRight, Link2, Minus, Plus, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Page";
import { WizardCard } from "@/components/ui/Wizard";
import { Option, inputCls, textareaCls } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ErrorState, Notice } from "@/components/ui/States";
import { CookingAnimation } from "@/components/recipes/CookingAnimation";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { RecipeDetail } from "@/components/recipes/RecipeDetail";
import { actions, useData } from "@/lib/store";
import { api } from "@/lib/api";
import { clamp, normalizeRecipe } from "@/lib/util";
import type { Recipe } from "@/lib/types";
import { toast } from "@/components/ui/Toast";

const OCCASIONS = ["No occasion", "Lazy Sunday", "Wedding", "Family Gathering", "Church", "Office (Party or Lunchbox)", "Other"];
const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack", "To Share", "Dessert", "Lunchbox", "Drink", "Other"];
const DIETS = ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Nut-free", "Halal", "No pork", "Non-alcoholic", "High protein"];
const STEP_LABELS = ["The occasion", "Category", "Covers", "Good to know", "Finishing touches"];

type Phase = "wizard" | "cooking" | "results" | "error";

function RecipesInner() {
  const sp = useSearchParams();
  const d = useData();
  const [step, setStep] = useState(1);
  const [occasion, setOccasion] = useState(sp.get("occasion") || "");
  const [occOther, setOccOther] = useState("");
  const [category, setCategory] = useState(sp.get("category") || "");
  const [catOther, setCatOther] = useState("");
  const [link, setLink] = useState("");
  const [servings, setServings] = useState(clamp(Number(sp.get("servings")) || 2, 1, 100));
  const [diet, setDiet] = useState(sp.get("diet") || "");
  const [notes, setNotes] = useState(sp.get("notes") || "");
  const [phase, setPhase] = useState<Phase>("wizard");
  const [longWait, setLongWait] = useState(false);
  const [results, setResults] = useState<(Recipe & { chefNote?: string })[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [err, setErr] = useState<{ msg: string; offline?: boolean } | null>(null);
  const [open, setOpen] = useState<Recipe | null>(null);
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => { if (sp.get("category")) setStep(sp.get("diet") || sp.get("notes") ? 5 : 3); }, [sp]);

  const occValue = occasion === "Other" ? occOther : occasion.replace(" (Party or Lunchbox)", "");
  const catValue = category === "Other" ? catOther : category;
  const saved = (id: string) => d.cookbook.some((r) => r.id === id);
  const toggle = (r: Recipe) => { if (saved(r.id)) { actions.removeRecipe(r.id); toast.info("Removed from your cookbook."); } else { actions.addRecipe(r); toast.success(`Added to your cookbook (${d.cookbook.length + 1}).`); } };

  const prepare = async () => {
    setPhase("cooking"); setErr(null); setLongWait(false);
    const minWait = new Promise((r) => setTimeout(r, 5000));
    const slow = setTimeout(() => setLongWait(true), 9000);
    const req = link.trim()
      ? api<{ recipe: Recipe }>("/api/recipes/link", { url: link.trim(), servings, diet, notes }).then((r) => (r.ok ? { ok: true as const, recipes: [r.recipe], meta: { link: true } } : r))
      : api<{ recipes: Recipe[]; generatedCount: number; exclusions: string[]; query: string; fetchedAt: string }>("/api/recipes", { occasion: occValue || "No occasion", category: catValue || "Dinner", servings, diet, notes })
          .then((r) => (r.ok ? { ok: true as const, recipes: r.recipes, meta: r } : r));
    const [res] = await Promise.all([req, minWait]);
    clearTimeout(slow);
    if (res.ok) { setResults((res as any).recipes.map(normalizeRecipe)); setMeta((res as any).meta); setPhase("results"); }
    else { setErr({ msg: (res as any).error, offline: (res as any).offline }); setPhase("error"); }
  };

  const scroll = (dir: number) => rail.current?.scrollBy({ left: dir * (rail.current.clientWidth * 0.8), behavior: "smooth" });
  const crumbs = [{ label: "Home", href: "/" }, { label: "Recipes", onClick: () => { setPhase("wizard"); setStep(1); } }, { label: phase === "results" ? "Your recipes" : phase === "wizard" ? STEP_LABELS[step - 1] : "Preparing" }];

  return (
    <Container narrow={phase !== "results"}>
      <PageHeader crumbs={crumbs} title={phase === "results" ? "Ten ideas for your table" : "What shall we cook?"}
        subtitle={phase === "results" ? `${occValue || "Any occasion"} · ${catValue || "Dinner"} · serves ${servings}${diet ? ` · ${diet}` : ""}` : "Five quick questions, then I'll bring you ten recipes from trusted kitchens."}
        onBack={phase === "wizard" && step > 1 ? () => setStep(step - 1) : phase !== "wizard" ? () => setPhase("wizard") : undefined}
        right={<Link href="/recipes/cookbook" className="inline-flex items-center gap-2 h-10 px-4 rounded-pill border border-line bg-paper text-sm hover:bg-cream/60"><BookOpen className="w-4 h-4 text-gold" />Cookbook<span className="min-w-6 h-6 px-1.5 rounded-full bg-cream text-xs inline-flex items-center justify-center" aria-label={`${d.cookbook.length} recipes`}>{d.cookbook.length}</span></Link>} />

      {phase === "wizard" && step === 1 && (
        <WizardCard label="The occasion" step={1} total={5} title="What's the occasion?" subtitle="Tell me the mood and I'll take it from there." onNext={() => setStep(2)} nextDisabled={!occasion || (occasion === "Other" && !occOther.trim())}>
          <div role="radiogroup" className="grid sm:grid-cols-2 gap-3">{OCCASIONS.map((o) => <Option key={o} selected={occasion === o} onClick={() => setOccasion(o)}>{o}</Option>)}</div>
          {occasion === "Other" && <input autoFocus className={inputCls + " mt-4"} placeholder="Please specify, e.g. graduation picnic" value={occOther} onChange={(e) => setOccOther(e.target.value)} aria-label="Specify occasion" />}
        </WizardCard>
      )}
      {phase === "wizard" && step === 2 && (
        <WizardCard label="Category" step={2} total={5} title="What would you enjoy?" subtitle="Pick a category, or bring me a recipe you've seen." onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!link.trim() && (!category || (category === "Other" && !catOther.trim()))}>
          <div role="radiogroup" className="grid sm:grid-cols-2 gap-3">{CATEGORIES.map((o) => <Option key={o} selected={category === o} onClick={() => { setCategory(o); setLink(""); }}>{o}</Option>)}</div>
          {category === "Other" && <input autoFocus className={inputCls + " mt-4"} placeholder="Please specify, e.g. soup" value={catOther} onChange={(e) => setCatOther(e.target.value)} aria-label="Specify category" />}
          <div className="mt-7 rounded-2xl bg-canvas border border-line p-4">
            <label htmlFor="rlink" className="text-[13px] font-medium flex items-center gap-2"><Link2 className="w-4 h-4 text-gold" />Have a recipe? Paste a link</label>
            <p className="text-xs text-muted mt-1">TikTok, YouTube or Instagram — I&apos;ll turn it into a recipe you can follow.</p>
            <input id="rlink" type="url" className={inputCls + " mt-3"} placeholder="https://www.tiktok.com/@chef/video/…" value={link} onChange={(e) => { setLink(e.target.value); if (e.target.value) setCategory(""); }} />
          </div>
        </WizardCard>
      )}
      {phase === "wizard" && step === 3 && (
        <WizardCard label="Covers" step={3} total={5} title="How many shall I cook for?" subtitle="Noted. I'll scale everything to suit." onBack={() => setStep(2)} onNext={() => setStep(4)}>
          <div className="flex items-center justify-center gap-8 py-4">
            <button onClick={() => setServings((s) => clamp(s - 1, 1, 100))} disabled={servings <= 1} aria-label="Fewer people" className="w-14 h-14 rounded-full border border-line inline-flex items-center justify-center hover:bg-cream disabled:opacity-40"><Minus className="w-5 h-5" /></button>
            <div className="text-center">
              <input aria-label="Number of people" type="number" min={1} max={100} value={servings} onChange={(e) => setServings(clamp(parseInt(e.target.value) || 1, 1, 100))} className="font-serif text-5xl w-24 text-center bg-transparent outline-none" />
              <p className="text-xs text-muted">{servings === 1 ? "person" : "people"}</p>
            </div>
            <button onClick={() => setServings((s) => clamp(s + 1, 1, 100))} disabled={servings >= 100} aria-label="More people" className="w-14 h-14 rounded-full border border-line inline-flex items-center justify-center hover:bg-cream disabled:opacity-40"><Plus className="w-5 h-5" /></button>
          </div>
          <input type="range" min={1} max={100} value={servings} onChange={(e) => setServings(+e.target.value)} className="range w-full mt-4" aria-label="Servings slider" />
        </WizardCard>
      )}
      {phase === "wizard" && step === 4 && (
        <WizardCard label="Good to know" step={4} total={5} title="Any dietary restrictions, medication or allergies I should be aware of?" subtitle="Nothing is too small — I'd rather know." onBack={() => setStep(3)} onNext={() => setStep(5)}>
          <div className="flex flex-wrap gap-2 mb-4">
            {DIETS.map((x) => { const on = diet.toLowerCase().includes(x.toLowerCase()); return <Option key={x} variant="chip" role="checkbox" selected={on} onClick={() => setDiet(on ? diet.replace(new RegExp(`,?\\s*${x}`, "i"), "").replace(/^,\s*/, "") : diet ? `${diet}, ${x}` : x)}>{x}</Option>; })}
          </div>
          <textarea className={textareaCls} placeholder="e.g. no nuts, vegetarian, lactose-free…" value={diet} onChange={(e) => setDiet(e.target.value)} aria-label="Dietary restrictions" />
          <p className="text-xs text-muted mt-2">I&apos;ll filter out recipes containing ingredients that clash. If you take medication with food interactions, please also check with your doctor or pharmacist.</p>
        </WizardCard>
      )}
      {phase === "wizard" && step === 5 && (
        <WizardCard label="Finishing touches" step={5} total={5} title="Any additional notes I should consider?" subtitle="Anything at all, or leave it blank and I'll use my judgement." onBack={() => setStep(4)} onNext={prepare} nextLabel="Prepare" nextIcon={<ChefHat className="w-4 h-4" />}>
          <textarea className={textareaCls} placeholder="e.g. quick weeknight meal, use what's in season…" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Additional notes" />
        </WizardCard>
      )}

      {phase === "cooking" && <CookingAnimation longWait={longWait} />}
      {phase === "error" && err && <ErrorState title="I couldn't prepare your recipes" body={err.msg} offline={err.offline} onRetry={prepare} />}

      {phase === "results" && (
        <section aria-label="Recipe results">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <p className="text-sm text-muted">{results.length} {results.length === 1 ? "recipe" : "recipes"}{meta?.generatedCount ? ` · ${meta.generatedCount} written by Sebastian` : ""}. Swipe or scroll to browse.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setPhase("wizard"); setStep(1); }}><SlidersHorizontal className="w-4 h-4" />Adjust</Button>
              <Button variant="outline" size="sm" onClick={prepare}><RotateCcw className="w-4 h-4" />Refresh</Button>
              <button onClick={() => scroll(-1)} aria-label="Previous recipes" className="w-9 h-9 rounded-full border border-line bg-paper inline-flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => scroll(1)} aria-label="Next recipes" className="w-9 h-9 rounded-full border border-line bg-paper inline-flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          {meta?.exclusions?.length > 0 && <Notice className="mb-5">Filtered out recipes containing: {meta.exclusions.slice(0, 10).join(", ")}{meta.exclusions.length > 10 ? "…" : ""}. Always double-check labels for allergens.</Notice>}
          <div ref={rail} className="flex gap-5 overflow-x-auto no-scrollbar snap-row -mx-5 px-5 md:mx-0 md:px-0 pb-4" tabIndex={0} aria-label="Swipe through recipes">
            {results.map((r) => (
              <div key={r.id} className="shrink-0 w-[82vw] sm:w-[340px] lg:w-[300px]">
                <RecipeCard r={r} saved={saved(r.id)} onOpen={() => setOpen(r)} onToggle={() => toggle(r)} />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted mt-3">Sources: Allrecipes, Food Network and A Couple Cooks. Retrieved {meta?.fetchedAt ? new Date(meta.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "just now"}.</p>
        </section>
      )}
      {open && <RecipeDetail key={open.id} r={open} initialServings={servings} saved={saved(open.id)} onToggle={() => toggle(open)} onClose={() => setOpen(null)} />}
    </Container>
  );
}

export default function RecipesPage() { return <Suspense><RecipesInner /></Suspense>; }
