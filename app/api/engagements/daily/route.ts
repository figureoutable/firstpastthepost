import { NextResponse } from "next/server";
import { adminLink, clientLink } from "@/lib/engagements/actions";
import { amlFor } from "@/lib/engagements/aml";
import { reminderEmail, teamEmail } from "@/lib/engagements/emails";
import { currentStep } from "@/lib/engagements/flow";
import { addFlag, listEngagements, logEvent, saveEngagement } from "@/lib/engagements/store";
import { sendClientEmail, sendInternalEmail } from "@/lib/notifications";

const REMINDER_AFTER_DAYS = 3;

/**
 * Daily job:
 * - one reminder to clients who haven't finished 3 days after the link went out, then a flag for the team
 * - flags clients whose AML check failed or came back high risk. Nothing is ever cancelled automatically.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const engagements = await listEngagements();
  let reminded = 0;
  let flagged = 0;
  const cutoff = Date.now() - REMINDER_AFTER_DAYS * 24 * 60 * 60 * 1000;

  for (const e of engagements) {
    if (e.status === "cancelled") continue;
    let changed = false;
    const step = currentStep(e);

    const sentAt = e.linkSentAt ? Date.parse(e.linkSentAt) : 0;
    if (step !== "done" && sentAt && sentAt < cutoff && !e.reminderSentAt) {
      const { subject, html } = reminderEmail(e, clientLink(e));
      await sendClientEmail(e.client.email, subject, html);
      e.reminderSentAt = new Date().toISOString();
      logEvent(e, "system", "Sent a reminder to finish");
      addFlag(e, "other", `Not finished ${REMINDER_AFTER_DAYS} days after the link was sent. A reminder went out.`);
      changed = true;
      reminded += 1;
    }

    if (e.onboarding?.submissionId) {
      const aml = await amlFor(e);
      if (aml.state === "flagged" && addFlag(e, "aml", `AML: ${aml.label}`)) {
        logEvent(e, "system", `AML flagged: ${aml.label}`);
        await sendInternalEmail(
          `AML flag: ${e.client.companyName || e.client.name}`,
          teamEmail(e, adminLink(e), `AML: ${aml.label}`, "Nothing has been cancelled. Their Direct Debit and letter are untouched until you decide.")
        );
        changed = true;
        flagged += 1;
      }
    }

    if (changed) await saveEngagement(e);
  }

  return NextResponse.json({ ok: true, reminded, flagged });
}
