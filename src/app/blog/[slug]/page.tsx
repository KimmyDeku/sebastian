import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/landing/SiteChrome";
import { BlogCover } from "@/components/landing/BlogCover";
import { PARTNERS, POSTS, getPost, sortedPosts, fmtDate } from "@/lib/blog";

export const generateStaticParams = () => POSTS.map((p) => ({ slug: p.slug }));
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getPost(params.slug);
  return p ? { title: `${p.title} | Sebastian`, description: p.excerpt } : { title: "News | Sebastian" };
}

export default function Article({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();
  const more = sortedPosts().filter((p) => p.slug !== post.slug).slice(0, 2);
  return (
    <div className="min-h-screen bg-canvas text-ink overflow-x-clip">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-5 pt-10 md:pt-14 pb-20">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink"><ArrowLeft className="w-4 h-4" />All news</Link>
        <p className="text-[12.5px] text-muted mt-6"><span className="text-gold-deep font-medium">{post.tag}</span> · {fmtDate(post.date)}</p>
        <h1 className="font-serif text-[2.2rem] sm:text-5xl leading-[1.08] mt-3">{post.title}</h1>
        <p className="text-[17px] text-muted mt-4 leading-relaxed">{post.excerpt}</p>
        {/* The partners story shows the logos in its text, so it doesn't repeat them as a cover. */}
        {!(post.cover.kind === "partners" && post.body.some((b) => b.type === "partners")) && <BlogCover cover={post.cover} className="mt-8 rounded-3xl border border-line aspect-[16/9]" />}
        <article className="mt-10 text-[16px] leading-[1.8] text-ink/90">
          {post.body.map((b, i) => {
            if (b.type === "h") return <h2 key={i} className="font-serif text-2xl text-ink mt-10 mb-3">{b.text}</h2>;
            if (b.type === "list") return <ul key={i} className="my-5 space-y-2.5">{b.items.map((it) => <li key={it} className="flex gap-3"><span className="mt-[11px] w-1.5 h-1.5 rounded-full bg-gold shrink-0" />{it}</li>)}</ul>;
            if (b.type === "quote") return <blockquote key={i} className="my-7 border-l-2 border-gold pl-5 font-serif text-[22px] leading-snug text-ink">{b.text}</blockquote>;
            if (b.type === "partners") return (
              <div key={i} className="my-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {PARTNERS.map((p) => <figure key={p.name} className="rounded-2xl bg-white border border-line p-4 flex flex-col items-center"><img src={p.logo} alt={p.name} className="h-16 w-auto object-contain" /><figcaption className="text-[12px] text-muted mt-2 text-center">{p.name}</figcaption></figure>)}
              </div>
            );
            if (b.type === "cta") return <p key={i} className="mt-8"><Link href={b.href} className="h-12 px-6 rounded-pill bg-ink text-white text-[15px] inline-flex items-center gap-2">{b.text}<ArrowRight className="w-4 h-4" /></Link></p>;
            return <p key={i} className="my-5">{b.text}</p>;
          })}
        </article>
        {more.length > 0 && (
          <aside className="mt-16 pt-8 border-t border-line">
            <p className="t-kicker text-muted">More news</p>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              {more.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="group rounded-2xl border border-line bg-paper p-5 hover:shadow-lift transition-shadow">
                  <p className="text-[12px] text-muted"><span className="text-gold-deep font-medium">{p.tag}</span> · {fmtDate(p.date)}</p>
                  <p className="font-serif text-lg leading-snug mt-2 group-hover:underline underline-offset-4 decoration-1">{p.title}</p>
                </Link>
              ))}
            </div>
          </aside>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
