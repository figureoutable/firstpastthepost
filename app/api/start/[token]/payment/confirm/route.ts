import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/engagements/actions";
import { withEngagement } from "@/lib/engagements/client-api";

/** Checks with GoCardless or Stripe directly whether the client has finished. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return withEngagement(params, async (e) => NextResponse.json({ done: await confirmPayment(e, request) }));
}
