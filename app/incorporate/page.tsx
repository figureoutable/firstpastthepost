import type { Metadata } from "next";
import { IncorporationWizard } from "@/components/incorporation/IncorporationWizard";
import { PageShell, PageTitle } from "@/components/site/site-chrome";

export const metadata: Metadata = { title: "Form a new company" };

export default function IncorporatePage() {
  return (
    <PageShell>
      <PageTitle eyebrow="New company" title="Form a UK limited company" className="mb-5" />
      <IncorporationWizard />
    </PageShell>
  );
}
