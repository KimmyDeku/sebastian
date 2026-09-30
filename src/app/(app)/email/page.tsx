"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Container, PageHeader } from "@/components/ui/Page";
import { EmailApp } from "@/components/email/EmailApp";

function Inner() {
  const sp = useSearchParams();
  return (
    <Container>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Email" }]} title="Draft & read emails" subtitle="Tell me what needs to happen. I'll handle the writing, and you stay in control: nothing is sent without your approval." />
      <EmailApp initial={sp.get("instruction") || undefined} />
    </Container>
  );
}
export default function EmailPage() { return <Suspense><Inner /></Suspense>; }
