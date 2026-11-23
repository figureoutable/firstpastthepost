import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell, Panel } from "@/components/site/site-chrome";
import { StartFlow, type StartView } from "@/components/engagement/start-flow";
import { canSimulatePayment, markOpened } from "@/lib/engagements/actions";
import { currentStep, firstSignature, needsLetter, visibleSteps } from "@/lib/engagements/flow";
import { formatPence } from "@/lib/engagements/letter";
import { getEngagementByToken } from "@/lib/engagements/store";
import { LINK_LIFETIME_DAYS } from "@/lib/engagements/types";
import { FIRM } from "@/lib/figures-config";
import { incorporationNextSteps, onboardingNextSteps } from "@/lib/next-steps";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Getting started", robots: { index: false, follow: false } };

function Message({ title, text }: { title: string; text: string }) {
  return (
    <PageShell width="narrow">
      <Panel className="text-center">
        <h1 className="text-xl font-semibold text-stone-900">{title}</h1>
        <p className="mt-2 text-stone-600">{text}</p>
        <p className="mt-6 text-sm text-stone-500">
          Email <a href={`mailto:${FIRM.contactEmail}`} className="font-medium text-clay-700">{FIRM.contactEmail}</a> and we&apos;ll help.
        </p>
      </Panel>
    </PageShell>
  );
}

export default async function StartPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const e = await getEngagementByToken(token);
  if (!e) return <Message title="This link isn't valid" text="Please check you copied the whole link from your email." />;

  const step = currentStep(e);
  if (step === "cancelled") return <Message title="This link is no longer active" text="It may have been replaced by a newer one." />;
  if (step === "expired") {
    return (
      <Message
        title="This link has expired"
        text={`For your security, links last ${LINK_LIFETIME_DAYS} days. We can send you a new one.`}
      />
    );
  }
  await markOpened(e);

  const view: StartView = {
    token,
    firstName: e.client.name.trim().split(/\s+/)[0] || e.client.name,
    party: e.client.companyName || e.client.name,
    onBehalfOf: e.client.companyName,
    email: e.client.email,
    steps: visibleSteps(e),
    current: step,
    letter: step === "letter" && !e.letters?.length && e.letter ? { blocks: e.letter.blocks, fingerprint: e.letter.fingerprint } : undefined,
    letters:
      step === "letter" && e.letters?.length
        ? e.letters.map((l) => ({
            kind: l.kind,
            title: l.title,
            party: l.party,
            pages: l.pages,
            url: `/api/start/${token}/letters/${l.kind}`,
            fingerprint: l.fingerprint,
            signed: Boolean(l.signature),
            onBehalfOf: l.kind === "sa" ? undefined : l.party,
          }))
        : undefined,
    signerName: firstSignature(e)?.name || "",
    signedCount: e.letters?.length || (e.letter ? 1 : 0),
    stepKey: step === "letter" && e.letters?.length ? `letter:${e.letters.find((l) => !l.signature)?.kind}` : step,
    payment: {
      method: e.payment.method,
      amount: e.payment.method === "card" ? formatPence(e.cardAmountPence || 0) : undefined,
      canSimulate: canSimulatePayment(e.payment.method),
    },
    nextSteps: step !== "done" ? [] : e.client.type === "formation" ? incorporationNextSteps(needsLetter(e) ? { letterSigned: true } : { letterAfter: true }) : onboardingNextSteps({ letterSigned: true }),
    contactEmail: FIRM.contactEmail,
    formation: e.client.type === "formation",
  };

  return (
    <PageShell>
      <Suspense>
        <StartFlow view={view} />
      </Suspense>
    </PageShell>
  );
}
