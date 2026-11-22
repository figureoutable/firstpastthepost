import { NextResponse } from "next/server";
import { startPayment } from "@/lib/engagements/actions";
import { withEngagement } from "@/lib/engagements/client-api";

/** Sends the client to GoCardless or Stripe. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return withEngagement(params, async (e) => NextResponse.json(await startPayment(e, request)));
}
