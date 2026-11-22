import { NextResponse } from "next/server";
import { onboardingDraft } from "@/lib/engagements/actions";
import { withEngagement } from "@/lib/engagements/client-api";
import type { IncorporationDraftRecord } from "@/lib/incorporation-draft-store";
import type { OnboardingDraftRecord } from "@/lib/onboarding-draft-store";

/** Returns (or creates) the client's form, prefilled with what we already know. */
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  return withEngagement(params, async (e) => {
    const { formation, draft } = await onboardingDraft(e);
    if (formation) {
      const d = draft as IncorporationDraftRecord;
      return NextResponse.json({ formation: true, code: d.code, step: d.step, phase: d.phase, state: d.state });
    }
    const d = draft as OnboardingDraftRecord;
    return NextResponse.json({ formation: false, code: d.code, onboardingType: d.onboardingType, formStep: d.formStep, state: d.state });
  });
}
