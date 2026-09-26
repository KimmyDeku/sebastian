"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Scissors, Shirt, Palette, Droplets, ExternalLink, Download, Stethoscope, RotateCcw } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Page";
import { Option, inputCls } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ErrorState, Notice } from "@/components/ui/States";
import { SebastianMark } from "@/components/SebastianMark";
import { api } from "@/lib/api";
import { useAccount } from "@/lib/store";
import { cx } from "@/lib/util";
import { toast } from "@/components/ui/Toast";

const TYPES = [{ k: "skincare", l: "Skin care", i: Droplets }, { k: "dressing", l: "Dressing", i: Shirt }, { k: "hairstyles", l: "Hairstyles", i: Scissors }, { k: "colours", l: "Colour combinations", i: Palette }];
const OCC = ["Interview", "Workplace", "Church", "Party", "Family get-together", "Wedding", "Date night", "Casual weekend", "Everyday"];
const AGES = ["12 and below", "13 - 17", "18 - 25", "25 - 35", "35 - 50", "50+"];
const HERITAGE = ["Black / African", "Asian", "White", "Hispanic / Latino", "Middle Eastern", "South Asian", "Mixed", "Any"];
const SKIN = ["Oily", "Dry", "Combination", "Normal", "Not sure"];
const CONCERNS = ["Acne or breakouts", "Dark spots / hyperpigmentation", "Dryness", "Fine lines", "Sensitivity or redness", "Dullness", "Large pores"];

function Step({ title, sub, children, onBack, onNext, ok, nextLabel = "Continue" }: any) {
  return (
    <section className="max-w-xl animate-fadeUp">
      <h2 className="t-h1">{title}</h2>{sub && <p className="text-muted text-sm mt-2">{sub}</p>}
      <div className="mt-7 space-y-3" role="radiogroup">{children}</div>
      <div className="flex items-center justify-between mt-8">
        {onBack ? <Button variant="ghost" onClick={onBack}>Back</Button> : <span />}
        <Button onClick={onNext} disabled={!ok} className="min-w-[160px]">{nextLabel}</Button>
      </div>
    </section>
  );
}

function downloadImage(url: string, _name?: string) {
  const a = document.createElement("a");
  a.href = `/api/fashion/image?url=${encodeURIComponent(url)}`;
  a.download = "sebastian-look.jpg";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function FashionInner() {
  const sp = useSearchParams();
  const acc = useAccount();
  const [s, setS] = useState(sp.get("type") ? 2 : 1);
  const [a, setA] = useState<any>({ type: sp.get("type") || "", occasion: sp.get("occasion") || "", gender: acc?.gender === "male" ? "Male" : acc?.gender === "female" ? "Female" : "", age: "", heritage: "", skinType: "", concerns: [] as string[], sensitive: "", notes: "" });
  const [phase, setPhase] = useState<"q" | "busy" | "done" | "error">("q");
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState("");
  const [view, setView] = useState<"looks" | "reels" | "images">("looks");
  const set = (k: string, v: any) => setA((p: any) => ({ ...p, [k]: v }));
  const skin = a.type === "skincare";
  const last = skin ? 8 : 5;

  const run = async () => {
    setPhase("busy"); setErr("");
    const r = await api<any>("/api/fashion", a);
    if (r.ok) { setRes(r); setPhase("done"); setView("looks"); } else { setErr(r.error || "Failed."); setPhase("error"); }
  };
  const next = () => (s === last ? run() : setS(s + 1));
  const back = s > 1 ? () => setS(s - 1) : undefined;
  const typeLabel = TYPES.find((t) => t.k === a.type)?.l;
  const allVideos = (res?.looks || []).flatMap((l: any) => (l.videos || []).map((v: any) => ({ ...v, look: l.title })));
  const allImages = (res?.looks || []).flatMap((l: any) => (l.images || []).map((v: any) => ({ ...v, look: l.title })));

  return (
    <Container>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Fashion", onClick: () => { setPhase("q"); setS(1); } }, ...(phase === "done" ? [{ label: "Your feed" }] : [])]} title={phase === "done" ? `${typeLabel} for ${a.occasion.toLowerCase()}` : "How can I help you look your best?"}
        subtitle={phase === "done" ? `${a.gender}, ${a.age}` : "A stylist, hair artist and colour consultant at your service."} onBack={phase !== "q" ? () => setPhase("q") : back} />

      {phase === "q" && (<>
        {s === 1 && <Step title="What would you like ideas for?" ok={a.type} onNext={next}>{TYPES.map((t) => <Option key={t.k} variant="row" selected={a.type === t.k} onClick={() => set("type", t.k)} icon={<t.i className="w-4 h-4" aria-hidden />}>{t.l}</Option>)}</Step>}
        {s === 2 && <Step title="What's the occasion?" sub="So Sebastian dresses you for the moment." ok={a.occasion} onBack={back} onNext={next}>{OCC.map((o) => <Option key={o} variant="row" selected={a.occasion === o} onClick={() => set("occasion", o)}>{o}</Option>)}</Step>}
        {s === 3 && <Step title="Who am I styling?" sub="Pick a gender to tailor the ideas." ok={a.gender} onBack={back} onNext={next}>{["Male", "Female"].map((o) => <Option key={o} variant="row" selected={a.gender === o} onClick={() => set("gender", o)}>{o}</Option>)}</Step>}
        {s === 4 && <Step title="How old are you?" sub="So the ideas fit your age group." ok={a.age} onBack={back} onNext={next}>{AGES.map((o) => <Option key={o} variant="row" selected={a.age === o} onClick={() => set("age", o)}>{o}</Option>)}</Step>}
        {s === 5 && <Step title="Which best describes you?" sub="Helps tailor colours and looks that suit you. Choose “Any” to skip." ok={a.heritage} onBack={back} onNext={next} nextLabel={skin ? "Continue" : "Show my ideas"}>
          {HERITAGE.map((o) => <Option key={o} variant="row" selected={a.heritage === o} onClick={() => set("heritage", o)}>{o}</Option>)}
          <input className={inputCls + " mt-2"} placeholder="Anything else? e.g. prefer modest cuts, natural hair" value={a.notes} onChange={(e) => set("notes", e.target.value)} aria-label="Notes" />
        </Step>}
        {skin && s === 6 && <Step title="What's your skin type?" ok={a.skinType} onBack={back} onNext={next}>{SKIN.map((o) => <Option key={o} variant="row" selected={a.skinType === o} onClick={() => set("skinType", o)}>{o}</Option>)}</Step>}
        {skin && s === 7 && <Step title="What would you like to address?" sub="Choose any that apply." ok onBack={back} onNext={next}>{CONCERNS.map((o) => <Option key={o} variant="row" role="checkbox" selected={a.concerns.includes(o)} onClick={() => set("concerns", a.concerns.includes(o) ? a.concerns.filter((x: string) => x !== o) : [...a.concerns, o])}>{o}</Option>)}</Step>}
        {skin && s === 8 && <Step title="Does your skin react easily to new products?" ok={a.sensitive} onBack={back} onNext={next} nextLabel="Show my routine">
          {["Yes, often", "Sometimes", "Rarely"].map((o) => <Option key={o} variant="row" selected={a.sensitive === o} onClick={() => set("sensitive", o)}>{o}</Option>)}
          <Notice tone="warning" className="mt-3">Sebastian offers skincare inspiration, not medical advice. For persistent or painful skin concerns, please consult a dermatologist.</Notice>
        </Step>}
      </>)}

      {phase === "busy" && <div className="rounded-3xl bg-paper border border-line p-12 text-center"><SebastianMark size={52} state="thinking" /><p className="t-h3 mt-4">Pulling together looks and reels…</p></div>}
      {phase === "error" && <ErrorState title="I couldn't build your feed" body={err} onRetry={run} />}

      {phase === "done" && res && (
        <div className="space-y-10">
          <p className="font-serif text-2xl leading-snug max-w-3xl">{res.intro}</p>
          {skin && (
            <Notice tone="warning" action={<Button size="sm" variant="outline" href="/discover?category=Dermatologist"><Stethoscope className="w-4 h-4" />Find a dermatologist</Button>}>
              This routine is general inspiration, not a diagnosis. A dermatologist can advise on your specific skin, especially for acne, pigmentation or sensitivity. Patch-test new products first.
            </Notice>
          )}
          {skin && res.routine && (
            <section className="grid md:grid-cols-3 gap-5">
              {[["Morning", res.routine.morning], ["Evening", res.routine.evening], ["Weekly", res.routine.weekly]].map(([k, v]: any) => (
                <div key={k} className="rounded-3xl bg-paper border border-line p-6"><h3 className="t-h3">{k}</h3><ol className="mt-3 space-y-2 text-sm list-decimal pl-5">{(v || []).map((x: string) => <li key={x}>{x}</li>)}</ol></div>
              ))}
              <div className="rounded-3xl bg-cream/50 border border-cream-line p-6 md:col-span-3 grid md:grid-cols-2 gap-6 text-sm">
                <div><h3 className="t-h3">Ingredients to look for</h3><p className="mt-2 text-muted">{(res.routine.ingredientsToLookFor || []).join(", ")}</p></div>
                <div><h3 className="t-h3">Best avoided</h3><p className="mt-2 text-muted">{(res.routine.avoid || []).join(", ")}</p></div>
              </div>
            </section>
          )}

          <div className="inline-flex rounded-pill bg-paper border border-line p-1" role="tablist">
            {([["looks", `Looks (${res.looks.length})`], ["reels", "Reels"], ["images", "Images"]] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} className={cx("h-9 px-5 rounded-pill text-sm", view === k ? "bg-ink text-white" : "text-muted")}>{l}</button>
            ))}
          </div>

          {view === "looks" && (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {res.looks.map((l: any) => (
                <article key={l.id} className="rounded-3xl bg-paper border border-line overflow-hidden flex flex-col">
                  <div className="flex h-20" aria-label={`Palette: ${(l.palette || []).join(", ")}`}>{(l.palette || []).map((c: string) => <span key={c} className="flex-1" style={{ background: c }} />)}</div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="t-h3">{l.title}</h3>
                    <p className="text-sm text-muted mt-2 leading-relaxed">{l.description}</p>
                    <ul className="mt-3 flex flex-wrap gap-1.5">{(l.pieces || []).map((p: string) => <li key={p} className="text-[11px] bg-cream rounded-full px-2.5 py-1">{p}</li>)}</ul>
                    <div className="mt-auto pt-5 flex flex-wrap gap-2">
                      {[["tiktok", "TikTok"], ["instagram", "Instagram"], ["youtube", "YouTube Shorts"], ["pinterest", "Pinterest"]].map(([k, n]) => (
                        <a key={k} href={l.links[k]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 h-8 px-3 rounded-pill border border-line text-xs hover:bg-cream/60">{n}<ExternalLink className="w-3 h-3" /></a>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {view === "reels" && (allVideos.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allVideos.map((v: any) => (
                <figure key={v.id} className="rounded-2xl overflow-hidden bg-ink">
                  <iframe className="w-full aspect-[9/16]" src={`https://www.youtube-nocookie.com/embed/${v.id}`} title={v.title} loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen />
                  <figcaption className="bg-paper p-3 text-xs"><span className="block line-clamp-2">{v.title}</span><span className="text-muted">{v.channel} · for “{v.look}”</span></figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <Notice tone="info">Embedded reels need a YouTube API key on the server (TikTok and Instagram don&apos;t allow public search embeds). Use the TikTok, Instagram and YouTube Shorts buttons on each look to watch matching reels.</Notice>
          ))}
                    {view === "images" && (allImages.length ? (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [&>*]:mb-4">
              {allImages.map((im: any) => (
                <figure key={im.id} className="break-inside-avoid rounded-2xl overflow-hidden bg-paper border border-line">
                  <a href={im.link} target="_blank" rel="noopener noreferrer" aria-label={`Open on Pinterest: ${im.alt}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.thumb} alt={im.alt || im.look} className="w-full" loading="lazy" />
                  </a>
                  <figcaption className="p-3 flex items-center justify-between gap-2 text-xs">
                    <a href={im.link} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-ink truncate">View on Pinterest</a>
                    <button onClick={() => { downloadImage(im.full); toast.success("Downloading image."); }} aria-label="Download image" className="w-8 h-8 rounded-full border border-line inline-flex items-center justify-center shrink-0"><Download className="w-3.5 h-3.5" /></button>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <Notice tone="info">
              {res.pinterestError
                ? res.pinterestError
                : res.providers?.images
                  ? "No matching pins were found. Save more fashion pins to your Pinterest account or board, or use the Pinterest button on each look."
                  : "Pinterest images need a PINTEREST_ACCESS_TOKEN on the server. Until then, the Pinterest button on each look opens matching pins."}
            </Notice>
          ))}
          <Button variant="outline" onClick={() => { setPhase("q"); setS(1); }}><RotateCcw className="w-4 h-4" />Start over</Button>
        </div>
      )}
    </Container>
  );
}
export default function FashionPage() { return <Suspense><FashionInner /></Suspense>; }
