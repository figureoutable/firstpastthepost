import { NextResponse } from "next/server";
import { onboardingDraft } from "@/lib/engagements/actions";
import { withEngagement } from "@/lib/engagements/client-api";

/** Returns (or creates) the client's onboarding form, prefilled with what we already know. */
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  return withEngagement(params, async (e) => {
    const draft = await onboardingDraft(e);
    return NextResponse.json({
      code: draft.code,
      onboardingType: draft.onboardingType,
      formStep: draft.formStep,
      state: draft.state,
    });
  });
}
