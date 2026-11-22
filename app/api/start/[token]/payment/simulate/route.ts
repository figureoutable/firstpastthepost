import { NextResponse } from "next/server";
import { simulatePayment } from "@/lib/engagements/actions";
import { withEngagement } from "@/lib/engagements/client-api";

/** Test builds only, when no payment keys are set. Refused on the live site. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return withEngagement(params, async (e) => {
    await simulatePayment(e, request);
    return NextResponse.json({ ok: true });
  });
}
