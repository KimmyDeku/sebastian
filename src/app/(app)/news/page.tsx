"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Page";
import { Option } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Notice, Skeleton } from "@/components/ui/States";
import { Img } from "@/components/ui/Img";
import { actions, useData } from "@/lib/store";
import { api } from "@/lib/api";
import { relTime, cx } from "@/lib/util";
import { IMG } from "@/lib/images";

const SOURCES = [["bbc", "BBC"], ["cnn", "CNN"], ["abc", "ABC News"], ["aljazeera", "Al Jazeera"], ["sky", "Sky News"], ["fox", "Fox News"], ["zbc", "ZBC News"]];
const CATS = [["top", "Top stories"], ["world", "World"], ["science", "Science"], ["technology", "Technology"], ["politics", "Politics"], ["economy", "Economy"], ["business", "Business"], ["social", "Social"], ["weather", "Weather"]];

// Channels and topics offered in the "Other" menus.
const OTHER_SOURCES: { region: string; items: [string, string][] }[] = [
  { region: "Africa", items: [["herald", "The Herald (Zimbabwe)"], ["newsday", "NewsDay (Zimbabwe)"], ["news24", "News24 (South Africa)"]] },
  { region: "Europe", items: [["guardian", "The Guardian"], ["dw", "DW (Germany)"], ["france24", "France 24"], ["euronews", "Euronews"], ["rte", "RTÉ (Ireland)"]] },
  { region: "Americas", items: [["npr", "NPR"], ["cbc", "CBC (Canada)"]] },
  { region: "Asia and Pacific", items: [["toi", "Times of India"], ["scmp", "South China Morning Post"], ["japantimes", "The Japan Times"], ["cna", "CNA (Singapore)"], ["abcau", "ABC Australia"]] },
];
const OTHER_NAMES: Record<string, string> = Object.fromEntries(OTHER_SOURCES.flatMap((g) => g.items));
const OTHER_CATS: [string, string][] = [["music", "Music"], ["sport", "Sport"], ["money", "Money"], ["entertainment", "Entertainment"], ["film", "Film"], ["health", "Health"], ["travel", "Travel"], ["culture", "Culture and arts"], ["fashion", "Fashion"], ["food", "Food"], ["books", "Books"], ["lifestyle", "Lifestyle"], ["environment", "Environment"], ["education", "Education"]];
const OTHER_CAT_NAMES: Record<string, string> = Object.fromEntries(OTHER_CATS);
const selectCls = "h-9 pl-3 pr-8 rounded-pill border border-dashed border-cream-line bg-paper text-[13px] text-ink hover:border-gold cursor-pointer";

function Badge({ s }: { s: string }) {
  if (s === "latest") return null;
  return <span className={cx("text-[10px] uppercase tracking-[.12em] font-medium rounded-full px-2 py-0.5", s === "breaking" ? "bg-danger text-white" : "bg-gold-soft text-gold-deep")}>{s}</span>;
}
const host = (u: string) => { try { return new URL(u).hostname.replace("www.", ""); } catch { return ""; } };

function NewsInner() {
  const sp = useSearchParams();
  const d = useData();
  const [sources, setSources] = useState<string[]>(d.news.sources);
  const [cats, setCats] = useState<string[]>(sp.get("categories")?.split(",").map((x) => x.toLowerCase()).filter((x) => CATS.some((c) => c[0] === x)) || d.news.categories);
  const [state, setState] = useState<"loading" | "ok" | "empty" | "error">("loading");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<{ msg: string; offline?: boolean }>({ msg: "" });

  const load = useCallback(async () => {
    if (!sources.length) { setState("empty"); setData(null); return; }
    setState("loading");
    const r = await api<any>("/api/news", { sources, categories: cats.length ? cats : ["top"] });
    if (r.ok) { setData(r); setState("ok"); }
    else if (r.code === "empty") { setData(r); setState("empty"); }
    else { setErr({ msg: r.error || "News could not be loaded.", offline: r.offline }); setState("error"); }
  }, [sources, cats]);

  useEffect(() => { const t = setTimeout(load, 350); actions.setNews({ sources, categories: cats }); return () => clearTimeout(t); }, [load, sources, cats]);
  useEffect(() => { const t = setInterval(load, 5 * 60000); return () => clearInterval(t); }, [load]);

  const toggle = (list: string[], set: (x: string[]) => void, k: string) => set(list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);
  const items = data?.items || [];
  const lead = items.find((x: any) => x.status === "breaking" && x.image) || items.find((x: any) => x.image) || items[0];
  const rest = items.filter((x: any) => x !== lead);

  return (
    <Container>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "News" }]} title="Stay informed, without the noise" subtitle="Choose your sources and topics. I'll keep the breaking and developing stories at the top."
        right={<Button size="sm" variant="outline" onClick={load} loading={state === "loading"}><RefreshCw className="w-4 h-4" />Refresh</Button>} />
      <div className="space-y-4 mb-10">
        <div><p className="text-[13px] text-muted mb-2">Sources</p><div className="flex flex-wrap gap-2 items-center">
          {SOURCES.map(([k, l]) => <Option key={k} variant="chip" role="checkbox" selected={sources.includes(k)} onClick={() => toggle(sources, setSources, k)}>{l}</Option>)}
          {sources.filter((k) => OTHER_NAMES[k]).map((k) => <Option key={k} variant="chip" role="checkbox" selected onClick={() => toggle(sources, setSources, k)}>{OTHER_NAMES[k]} ×</Option>)}
          <label className="sr-only" htmlFor="other-src">Add another news channel</label>
          <select id="other-src" className={selectCls} value="" onChange={(e) => { const v = e.target.value; if (v && !sources.includes(v)) setSources([...sources, v]); }} title="Add a news channel from around the world">
            <option value="">Other channels…</option>
            {OTHER_SOURCES.map((g) => <optgroup key={g.region} label={g.region}>{g.items.map(([k, l]) => <option key={k} value={k} disabled={sources.includes(k)}>{l}</option>)}</optgroup>)}
          </select>
        </div></div>
        <div><p className="text-[13px] text-muted mb-2">Categories</p><div className="flex flex-wrap gap-2 items-center">
          {CATS.map(([k, l]) => <Option key={k} variant="chip" role="checkbox" selected={cats.includes(k)} onClick={() => toggle(cats, setCats, k)}>{l}</Option>)}
          {cats.filter((k) => OTHER_CAT_NAMES[k]).map((k) => <Option key={k} variant="chip" role="checkbox" selected onClick={() => toggle(cats, setCats, k)}>{OTHER_CAT_NAMES[k]} ×</Option>)}
          <label className="sr-only" htmlFor="other-cat">Add another topic</label>
          <select id="other-cat" className={selectCls} value="" onChange={(e) => { const v = e.target.value; if (v && !cats.includes(v)) setCats([...cats, v]); }} title="Add another news topic">
            <option value="">Other topics…</option>
            {OTHER_CATS.map(([k, l]) => <option key={k} value={k} disabled={cats.includes(k)}>{l}</option>)}
          </select>
        </div></div>
      </div>

      {data?.failures?.length > 0 && <Notice tone="warning" className="mb-6">Couldn&apos;t reach {data.failures.join(", ")} just now. Showing the other sources.</Notice>}
      {state === "loading" && <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-80" />)}</div>}
      {state === "error" && <ErrorState body={err.msg} offline={err.offline} onRetry={load} />}
      {state === "empty" && <EmptyState title={sources.length ? "No stories match right now" : "Choose at least one source"} body={sources.length ? "Try adding a category or another source." : "Pick the outlets you trust above."} />}

      {state === "ok" && lead && (
        <>
          <a href={lead.link} target="_blank" rel="noopener noreferrer" className="group grid lg:grid-cols-[1.3fr_1fr] rounded-3xl bg-paper border border-line overflow-hidden mb-8">
            <Img src={lead.image || IMG.news} alt="" className="w-full h-64 lg:h-full min-h-[280px]" />
            <div className="p-7 md:p-9 flex flex-col">
              <div className="flex items-center gap-2"><Badge s={lead.status} /><span className="text-xs text-muted">{lead.sourceName}{lead.published ? ` · ${relTime(lead.published)}` : ""}</span></div>
              <h2 className="t-h1 mt-3 group-hover:underline decoration-1 underline-offset-4">{lead.title}</h2>
              <p className="text-muted mt-3 leading-relaxed">{lead.summary}</p>
              <span className="mt-auto pt-6 inline-flex items-center gap-2 text-sm">Open story on {host(lead.link)}<ExternalLink className="w-4 h-4" aria-hidden /></span>
            </div>
          </a>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rest.map((n: any) => (
              <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer" className="group rounded-3xl bg-paper border border-line overflow-hidden flex flex-col hover:border-cream-line">
                {n.image && <Img src={n.image} alt="" className="w-full h-44" />}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap"><Badge s={n.status} /><span className="text-xs text-muted">{n.sourceName}{n.published ? ` · ${relTime(n.published)}` : ""}</span></div>
                  <h3 className="font-serif text-[1.25rem] leading-snug mt-2 group-hover:underline decoration-1 underline-offset-4">{n.title}</h3>
                  {n.summary && <p className="text-[13px] text-muted mt-2 line-clamp-3">{n.summary}</p>}
                  <span className="mt-auto pt-4 inline-flex items-center gap-1.5 text-xs text-ink">Open story on {host(n.link)}<ExternalLink className="w-3.5 h-3.5" aria-hidden /></span>
                </div>
              </a>
            ))}
          </div>
          <p className="text-xs text-muted mt-6">Retrieved {new Date(data.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} from each outlet&apos;s public feed; refreshes every five minutes. Stories open on the publisher&apos;s site. Developing stories change quickly, so read critically.</p>
        </>
      )}
    </Container>
  );
}
export default function NewsPage() { return <Suspense><NewsInner /></Suspense>; }
