import { SebastianMark } from "../SebastianMark";
import { PARTNERS, type Cover } from "@/lib/blog";
import { cx } from "@/lib/util";

/** A post's picture: partner logos, an image, or Sebastian's bow tie. */
export function BlogCover({ cover, className }: { cover: Cover; className?: string }) {
  if (cover.kind === "partners") return (
    <div className={cx("bg-paper flex items-center justify-center gap-3 sm:gap-5 p-6 flex-wrap", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {PARTNERS.map((p) => <span key={p.name} className="h-16 sm:h-20 px-3 rounded-2xl bg-white border border-line inline-flex items-center"><img src={p.logo} alt={p.name} className="h-10 sm:h-14 w-auto object-contain" /></span>)}
    </div>
  );
  if (cover.kind === "mark") return <div className={cx("bg-ink flex items-center justify-center", className)}><SebastianMark size={96} /></div>;
  return (
    <div className={cx("bg-gradient-to-br from-cream to-gold-soft/60 flex items-center justify-center overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover.src} alt={cover.alt} className="w-full h-full object-cover" />
    </div>
  );
}
