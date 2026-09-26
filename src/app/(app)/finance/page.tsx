"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Container, PageHeader } from "@/components/ui/Page";
import { Plans } from "@/components/finance/Plans";
import { Money } from "@/components/finance/Money";
import { cx } from "@/lib/util";

const TIPS = [
  ["Pay yourself first", "Move your savings commitment on payday, before anything else, so saving isn't what's left over."],
  ["Build a buffer", "Aim for three to six months of essential expenses in an emergency fund before chasing other goals."],
  ["Name every pot", "Goals with names and dates are kept far more often than a vague 'save more'."],
  ["Review monthly", "A ten-minute look at where money went each month catches creeping subscriptions and impulse spending."],
  ["Mind the small leaks", "Daily coffees and delivery fees add up; totalling a category for a month is often eye-opening."],
  ["Get qualified advice", "For investments, tax or debt restructuring, speak to a licensed professional in your country."],
];

function FinanceInner() {
  const sp = useSearchParams();
  const [tab, setTab] = useState<"plans" | "money" | "tips">((sp.get("tab") as any) || "plans");
  return (
    <Container>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Finance" }]} title="Clarity for what's next" subtitle="An accountant's eye on the figures you record. Budgeting guidance, not financial advice." />
      <div className="grid grid-cols-3 rounded-2xl bg-paper border border-line p-1 mb-10 max-w-xl" role="tablist">
        {([["plans", "Plans"], ["money", "Income vs. expenses"], ["tips", "Tips"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx("h-11 rounded-xl text-[13px] md:text-sm", tab === k ? "bg-canvas shadow-soft text-ink font-medium" : "text-muted")}>{l}</button>
        ))}
      </div>
      <div className={tab === "plans" ? "max-w-2xl" : ""}>
        {tab === "plans" && <Plans />}
        {tab === "money" && <Money />}
        {tab === "tips" && (
          <div className="grid md:grid-cols-2 gap-5">{TIPS.map(([t, b]) => <div key={t} className="rounded-3xl bg-paper border border-line p-6"><h3 className="t-h3">{t}</h3><p className="text-sm text-muted mt-2 leading-relaxed">{b}</p></div>)}</div>
        )}
      </div>
    </Container>
  );
}
export default function FinancePage() { return <Suspense><FinanceInner /></Suspense>; }
