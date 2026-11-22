import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/engagements/actions";
import { getEngagement } from "@/lib/engagements/store";
import { verifyStripeWebhook } from "@/lib/payments/stripe";

/** Stripe tells us when an upfront card payment completes. Other events and payments are ignored. */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyStripeWebhook(raw, request.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  try {
    const event = JSON.parse(raw) as { type: string; data: { object: { client_reference_id?: string; metadata?: Record<string, string> } } };
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const id = event.data.object.metadata?.engagement_id || event.data.object.client_reference_id || "";
      const e = await getEngagement(id);
      if (e) await confirmPayment(e);
    }
  } catch (error) {
    console.error("[stripe webhook]", error);
  }
  return NextResponse.json({ received: true });
}
