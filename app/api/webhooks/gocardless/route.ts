import { NextResponse } from "next/server";
import { adminLink, confirmPayment } from "@/lib/engagements/actions";
import { teamEmail } from "@/lib/engagements/emails";
import { addFlag, getEngagementByGoCardlessId, logEvent, updateEngagement } from "@/lib/engagements/store";
import { sendInternalEmail } from "@/lib/notifications";
import { verifyGoCardlessWebhook } from "@/lib/payments/gocardless";

type GcEvent = {
  id: string;
  resource_type: string;
  action: string;
  links?: { billing_request?: string; mandate?: string };
  details?: { description?: string };
};

const PROBLEMS: Record<string, string> = {
  failed: "The Direct Debit failed to set up",
  cancelled: "The Direct Debit was cancelled",
  expired: "The Direct Debit expired",
};

/**
 * GoCardless tells us when a client's mandate changes. We only update our own
 * records and alert the team. We never cancel or change anything in GoCardless.
 * Events for customers not created by this flow are ignored.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyGoCardlessWebhook(raw, request.headers.get("webhook-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 498 });
  }
  let events: GcEvent[] = [];
  try {
    events = (JSON.parse(raw) as { events?: GcEvent[] }).events || [];
  } catch {
    return NextResponse.json({ error: "Bad body" }, { status: 400 });
  }

  for (const event of events) {
    try {
      if (event.resource_type === "billing_requests" && event.action === "fulfilled" && event.links?.billing_request) {
        const e = await getEngagementByGoCardlessId(event.links.billing_request);
        if (e) await confirmPayment(e);
        continue;
      }
      if (event.resource_type !== "mandates" || !event.links?.mandate) continue;
      const found = await getEngagementByGoCardlessId(event.links.mandate);
      if (!found) continue;

      let problem = "";
      const { record, changed } = await updateEngagement(found.id, (e) => {
        e.payment.gocardless = { ...(e.payment.gocardless || {}), mandateStatus: event.action };
        if (event.action === "active" || event.action === "reinstated") {
          e.payment.status = "active";
          logEvent(e, "system", "Direct Debit is now active");
        } else if (PROBLEMS[event.action]) {
          e.payment.status = event.action === "failed" ? "failed" : "cancelled";
          const message = `${PROBLEMS[event.action]}${event.details?.description ? `: ${event.details.description}` : ""}`;
          logEvent(e, "system", message);
          if (addFlag(e, "payment", message)) problem = message;
        } else {
          logEvent(e, "system", `Direct Debit ${event.action}`);
        }
      });
      if (changed && problem) {
        await sendInternalEmail(
          `Direct Debit problem: ${record.client.companyName || record.client.name}`,
          teamEmail(record, adminLink(record), problem, "Nothing has been cancelled or changed by the app. Please check GoCardless and decide what to do.")
        );
      }
    } catch (error) {
      console.error("[gocardless webhook]", event.id, error);
    }
  }
  return NextResponse.json({ ok: true });
}
