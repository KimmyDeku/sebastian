"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Page";
import { EmptyState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { RecipeDetail } from "@/components/recipes/RecipeDetail";
import { ConfirmDialog } from "@/components/ui/Modal";
import { inputCls } from "@/components/ui/Chip";
import { actions, useData } from "@/lib/store";
import type { Recipe } from "@/lib/types";
import { toast } from "@/components/ui/Toast";

export default function Cookbook() {
  const d = useData();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Recipe | null>(null);
  const [remove, setRemove] = useState<Recipe | null>(null);
  const list = d.cookbook.filter((r) => (r.title + " " + r.ingredients.join(" ") + " " + (r.tags || []).join(" ")).toLowerCase().includes(q.toLowerCase()));
  return (
    <Container>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Recipes", href: "/recipes" }, { label: "Cookbook" }]} title="Your cookbook" subtitle={`${d.cookbook.length} ${d.cookbook.length === 1 ? "recipe" : "recipes"} saved.`} right={<Button href="/recipes" size="sm">Find recipes</Button>} />
      {d.cookbook.length > 0 && (
        <div className="relative max-w-md mb-8">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input className={inputCls + " pl-11"} placeholder="Search by name or ingredient" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search cookbook" />
        </div>
      )}
      {d.cookbook.length === 0 ? <EmptyState title="Your cookbook is empty" body="Tap the bookmark on any recipe to keep it here." action={<Button href="/recipes">Find a recipe</Button>} />
        : list.length === 0 ? <EmptyState title="No matches" body={`Nothing in your cookbook matches "${q}".`} action={<Button variant="outline" onClick={() => setQ("")}>Clear search</Button>} />
        : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{list.map((r) => <RecipeCard key={r.id} r={r} saved onOpen={() => setOpen(r)} onToggle={() => setRemove(r)} />)}</div>}
      {open && <RecipeDetail key={open.id} r={open} saved onToggle={() => { setRemove(open); }} onClose={() => setOpen(null)} />}
      <ConfirmDialog open={!!remove} danger title="Remove this recipe?" body={`"${remove?.title}" will be removed from your cookbook.`} confirmLabel="Remove"
        onCancel={() => setRemove(null)} onConfirm={() => { actions.removeRecipe(remove!.id); setRemove(null); setOpen(null); toast.info("Recipe removed."); }} />
    </Container>
  );
}
