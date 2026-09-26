"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE } from "./nav";
import { cx } from "@/lib/util";
import { useUpcomingCount } from "./Sidebar";

export function BottomNav() {
  const path = usePathname();
  const count = useUpcomingCount();
  return (
    <nav aria-label="Primary" className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-paper/95 backdrop-blur border-t border-line pb-safe">
      <ul className="grid grid-cols-4">
        {MOBILE.map((n) => {
          const on = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <li key={n.href}>
              <Link href={n.href} aria-current={on ? "page" : undefined} className={cx("relative flex flex-col items-center justify-center h-16 gap-1 text-[11px]", on ? "text-ink" : "text-muted")}>
                <n.icon className={cx("w-[22px] h-[22px]", on && "text-gold")} strokeWidth={1.6} aria-hidden />
                {n.label}
                {n.href === "/schedule" && count > 0 && <span className="absolute top-2 left-1/2 ml-2 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-white text-[10px] inline-flex items-center justify-center">{count}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
