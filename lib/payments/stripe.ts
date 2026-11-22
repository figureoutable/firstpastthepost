import crypto from "crypto";

/**
 * Stripe: one-off card payments taken upfront, for clients the team marks as
 * "Card upfront". Uses Stripe's own checkout page, so card details never touch
 * our site. Only creates new checkout sessions; never refunds or changes anything.
 *
 * Env:
 *   STRIPE_SECRET_KEY      sk_test_... while testing, sk_live_... when live
 *   STRIPE_WEBHOOK_SECRET  whsec_... from the webhook pointing at /api/webhooks/stripe
 */

function key(): string | null {
  return process.env.STRIPE_SECRET_KEY?.trim() || null;
}

export function isStripeConfigured(): boolean {
  return Boolean(key());
}

async function stripe<T>(path: string, init: { method?: string; form?: Record<string, string> } = {}): Promise<T> {
  const secret = key();
  if (!secret) throw new Error("Stripe is not connected");
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: init.method || "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(init.form ? { "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": crypto.randomUUID() } : {}),
    },
    body: init.form ? new URLSearchParams(init.form) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: { message?: string } }).error?.message || `HTTP ${res.status}`;
    throw new Error(`Stripe: ${message}`);
  }
  return data as T;
}

export async function startCardPayment(input: {
  engagementId: string;
  email: string;
  amountPence: number;
  description: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; url: string }> {
  if (!Number.isInteger(input.amountPence) || input.amountPence < 30) throw new Error("Card amount is too small");
  const session = await stripe<{ id: string; url: string }>("/checkout/sessions", {
    method: "POST",
    form: {
      mode: "payment",
      customer_email: input.email,
      client_reference_id: input.engagementId,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "gbp",
      "line_items[0][price_data][unit_amount]": String(input.amountPence),
      "line_items[0][price_data][product_data][name]": input.description.slice(0, 200),
      "metadata[engagement_id]": input.engagementId,
      "payment_intent_data[metadata][engagement_id]": input.engagementId,
    },
  });
  return { sessionId: session.id, url: session.url };
}

export async function cardPaymentResult(
  sessionId: string
): Promise<{ paid: boolean; amountPence: number; paymentIntentId?: string; engagementId?: string }> {
  const s = await stripe<{
    payment_status: string;
    amount_total: number;
    payment_intent?: string;
    client_reference_id?: string;
  }>(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
  return {
    paid: s.payment_status === "paid",
    amountPence: s.amount_total,
    paymentIntentId: s.payment_intent,
    engagementId: s.client_reference_id,
  };
}

/** Checks Stripe's signature header: "t=...,v1=...". Rejects anything older than 5 minutes. */
export function verifyStripeWebhook(rawBody: string, header: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k, v.join("=")];
    })
  );
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const signatures = header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  return signatures.some((sig) => {
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}
