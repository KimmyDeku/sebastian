"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/landing/SiteChrome";
import { BlogCover } from "@/components/landing/BlogCover";
import { sortedPosts, fmtDate, type Post } from "@/lib/blog";
import { cx } from "@/lib/util";

const LABEL: Record<Post["tag"], string> = { Partnership: "Partnerships", Event: "Events", "What's new": "What's new", Product: "Product", Announcement: "Announcements" };

export default function Blog() {
  const posts = sortedPosts();
  const tags = Array.from(new Set(posts.map((p) => p.tag)));
  const [tag, setTag] = useState<Post["tag"] | "all">("all");
  const shown = posts.filter((p) => tag === "all" || p.tag === tag);
  const [lead, ...rest] = shown;
  return (
    <div className="min-h-screen bg-canvas text-ink overflow-x-clip">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-5 pt-12 md:pt-16 pb-20">
        <p className="t-kicker text-gold-deep">News</p>
        <h1 className="t-display text-[2.4rem] sm:text-5xl mt-2">News from Sebastian</h1>
        <p className="text-muted mt-3 max-w-2xl">Partnerships, events and the newest things Sebastian can do for you.</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-7 pb-1" role="tablist" aria-label="Topics">
          {(["all", ...tags] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tag === t} onClick={() => setTag(t)} className={cx("shrink-0 h-9 px-4 rounded-pill border text-[13px]", tag === t ? "bg-ink text-white border-ink" : "border-line hover:bg-cream")}>{t === "all" ? "All" : LABEL[t]}</button>
          ))}
        </div>

        {lead && (
          <Link href={`/blog/${lead.slug}`} className="group mt-8 grid md:grid-cols-[1.15fr_1fr] rounded-3xl border border-line bg-paper overflow-hidden hover:shadow-lift transition-shadow">
            <BlogCover cover={lead.cover} className="aspect-[16/10] md:aspect-auto md:min-h-[320px]" />
            <div className="p-6 md:p-8 flex flex-col">
              <p className="text-[12px] text-muted"><span className="text-gold-deep font-medium">{lead.tag}</span> · {fmtDate(lead.date)}</p>
              <h2 className="font-serif text-3xl md:text-4xl leading-tight mt-3 group-hover:underline underline-offset-4 decoration-1">{lead.title}</h2>
              <p className="text-muted mt-3 leading-relaxed">{lead.excerpt}</p>
              <span className="mt-auto pt-6 inline-flex items-center gap-1.5 text-[14px] font-medium">Read the story<ArrowRight className="w-4 h-4" /></span>
            </div>
          </Link>
        )}

        {rest.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            {rest.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group rounded-3xl border border-line bg-paper overflow-hidden flex flex-col hover:shadow-lift transition-shadow">
                <BlogCover cover={p.cover} className="aspect-[16/10]" />
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-[12px] text-muted"><span className="text-gold-deep font-medium">{p.tag}</span> · {fmtDate(p.date)}</p>
                  <h3 className="font-serif text-xl leading-snug mt-2 group-hover:underline underline-offset-4 decoration-1">{p.title}</h3>
                  <p className="text-[13.5px] text-muted mt-2 leading-relaxed line-clamp-3">{p.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
        {!shown.length && <p className="text-muted mt-10">No stories here yet.</p>}

        <div className="mt-14 rounded-3xl bg-ink text-white p-7 md:p-10 flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1"><p className="font-serif text-2xl md:text-3xl">Be first to try what&apos;s next.</p><p className="text-white/70 mt-1.5">Join the waitlist and we&apos;ll invite you as soon as a place opens.</p></div>
          <Link href="/welcome#waitlist" className="h-12 px-6 rounded-pill bg-white text-ink text-[15px] inline-flex items-center gap-2 self-start md:self-auto">Join the waitlist<ArrowRight className="w-4 h-4" /></Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
