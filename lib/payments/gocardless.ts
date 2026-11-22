import crypto from "crypto";

/**
 * GoCardless: sets up a Direct Debit mandate for a new client.
 *
 * This only ever creates a mandate request and reads its result. It never
 * collects money, and never changes or cancels existing customers or mandates,
 * so the existing GoCardless in Xero set-up is untouched. Collection still
 * happens through your Xero invoices as now.
 *
 * Env:
 *   GOCARDLESS_ACCESS_TOKEN    read-write access token (Developers > Create > Access token)
 *   GOCARDLESS_ENVIRONMENT     "sandbox" (test) or "live". Defaults to sandbox.
 *   GOCARDLESS_WEBHOOK_SECRET  from the webhook endpoint pointing at /api/webhooks/gocardless
 */

function token(): string | null {
  return process.env.GOCARDLESS_ACCESS_TOKEN?.trim() || null;
}

export function isGoCardlessConfigured(): boolean {
  return Boolean(token());
}

export function goCardlessEnvironment(): "sandbox" | "live" {
  return process.env.GOCARDLESS_ENVIRONMENT?.trim() === "live" ? "live" : "sandbox";
}

function baseUrl(): string {
  return goCardlessEnvironment() === "live" ? "https://api.gocardless.com" : "https://api-sandbox.gocardless.com";
}

async function gc<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = token();
  if (!key) throw new Error("GoCardless is not connected");
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "GoCardless-Version": "2015-07-06",
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: { message?: string } }).error?.message || `HTTP ${res.status}`;
    throw new Error(`GoCardless: ${message}`);
  }
  return data as T;
}

function splitName(name: string): { given: string; family: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { given: parts[0], family: parts[0] };
  return { given: parts.slice(0, -1).join(" "), family: parts[parts.length - 1] };
}

/** Starts a mandate set-up and returns the GoCardless page to send the client to. */
export async function startMandateSetup(input: {
  engagementId: string;
  name: string;
  email: string;
  companyName?: string;
  returnUrl: string;
  exitUrl: string;
}): Promise<{ billingRequestId: string; url: string }> {
  const created = await gc<{ billing_requests: { id: string } }>("/billing_requests", {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({
      billing_requests: {
        mandate_request: { currency: "GBP", scheme: "bacs" },
        metadata: { engagement_id: input.engagementId },
      },
    }),
  });
  const billingRequestId = created.billing_requests.id;
  const { given, family } = splitName(input.name);
  const flow = await gc<{ billing_request_flows: { authorisation_url: string } }>("/billing_request_flows", {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({
      billing_request_flows: {
        redirect_uri: input.returnUrl,
        exit_uri: input.exitUrl,
        prefilled_customer: {
          given_name: given,
          family_name: family,
          email: input.email,
          ...(input.companyName ? { company_name: input.companyName } : {}),
        },
        links: { billing_request: billingRequestId },
      },
    }),
  });
  return { billingRequestId, url: flow.billing_request_flows.authorisation_url };
}

/** Asks GoCardless directly whether the client finished. Never trust the return page alone. */
export async function billingRequestResult(
  billingRequestId: string
): Promise<{ fulfilled: boolean; status: string; mandateId?: string; customerId?: string }> {
  const data = await gc<{
    billing_requests: { status: string; links?: { mandate_request_mandate?: string; customer?: string } };
  }>(`/billing_requests/${encodeURIComponent(billingRequestId)}`);
  const br = data.billing_requests;
  return {
    fulfilled: br.status === "fulfilled",
    status: br.status,
    mandateId: br.links?.mandate_request_mandate,
    customerId: br.links?.customer,
  };
}

export function verifyGoCardlessWebhook(rawBody: string, signature: string | null): boolean {
  const secret = process.env.GOCARDLESS_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
