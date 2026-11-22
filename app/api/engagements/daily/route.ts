import { NextResponse } from "next/server";
import { adminLink, clientLink, partyName } from "@/lib/engagements/actions";
import { amlFor } from "@/lib/engagements/aml";
import { reminderEmail, teamEmail } from "@/lib/engagements/emails";
import { currentStep } from "@/lib/engagements/flow";
import { getSettings } from "@/lib/engagements/settings";
import { addFlag, listEngagements, logEvent, updateEngagement } from "@/lib/engagements/store";
import { escapeHtml } from "@/lib/email-html";
import { appOrigin } from "@/lib/env";
import { sendClientEmail, sendInternalEmail } from "@/lib/notifications";

const REMINDER_AFTER_DAYS = 3;
const DAY = 24 * 60 * 60 * 1000;

/**
 * Daily job:
 * - one reminder to clients who haven't finished 3 days after the link went out, then a flag
 * - a flag when a link expires, so the team can send it again
 * - flags clients whose AML check failed or came back high risk. Nothing is ever cancelled automatically.
 * - the daily summary email, if switched on in Settings
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const engagements = await listEngagements();
  const settings = await getSettings();
  let reminded = 0;
  let flagged = 0;
  let expired = 0;
  const cutoff = Date.now() - REMINDER_AFTER_DAYS * DAY;

  for (const e of engagements) {
    if (e.status === "cancelled") continue;
    const step = currentStep(e);

    if (step === "expired") {
      const { changed } = await updateEngagement(e.id, (fresh) => {
        if (!addFlag(fresh, "other", "Link expired. Use Email link again to send it with another 60 days.")) return false;
        logEvent(fresh, "system", "The link expired");
      });
      if (changed) expired += 1;
      continue;
    }

    const sentAt = e.linkSentAt ? Date.parse(e.linkSentAt) : 0;
    if (step !== "done" && sentAt && sentAt < cutoff && !e.reminderSentAt) {
      const { subject, html } = reminderEmail(e, clientLink(e, request));
      await sendClientEmail(e.client.email, subject, html);
      await updateEngagement(e.id, (fresh) => {
        if (fresh.reminderSentAt) return false;
        fresh.reminderSentAt = new Date().toISOString();
        logEvent(fresh, "system", "Sent a reminder to finish");
        addFlag(fresh, "other", `Not finished ${REMINDER_AFTER_DAYS} days after the link was sent. A reminder went out.`);
      });
      reminded += 1;
    }

    if (e.onboarding?.submissionId) {
      const aml = await amlFor(e);
      if (aml.state === "flagged") {
        const { changed, record } = await updateEngagement(e.id, (fresh) => {
          if (!addFlag(fresh, "aml", `AML: ${aml.label}`)) return false;
          logEvent(fresh, "system", `AML flagged: ${aml.label}`);
        });
        if (changed) {
          await sendInternalEmail(
            `AML flag: ${partyName(record)}`,
            teamEmail(record, adminLink(record, request), `AML: ${aml.label}`, "Nothing has been cancelled. Their Direct Debit and letter are untouched until you decide.")
          );
          flagged += 1;
        }
      }
    }
  }

  let summarised = 0;
  if (settings.dailySummary) {
    const since = Date.now() - DAY;
    const rows = engagements
      .map((e) => ({ e, events: (e.events || []).filter((ev) => Date.parse(ev.at) >= since && (ev.by === "client" || ev.by === "system")) }))
      .filter((r) => r.events.length > 0);
    summarised = rows.length;
    if (rows.length) {
      const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:20px;">
        <h2 style="margin:0 0 4px;">Daily summary</h2>
        <p style="color:#57534e;margin:0 0 16px;">What your clients did in the last 24 hours.</p>
        ${rows
          .map(
            ({ e, events }) => `<div style="border:1px solid #e7e5e4;border-radius:10px;padding:12px 14px;margin:0 0 10px;">
              <p style="margin:0 0 6px;font-weight:600;"><a href="${appOrigin(request)}/admin/clients/${e.id}" style="color:#1c1917;">${escapeHtml(partyName(e))}</a></p>
              <ul style="margin:0;padding-left:18px;color:#44403c;font-size:14px;">${events.map((ev) => `<li>${escapeHtml(ev.action)}</li>`).join("")}</ul>
            </div>`
          )
          .join("")}
        <p style="font-size:13px;color:#78716c;">Problems (failed Direct Debits, AML flags) still email you straight away.</p>
      </div>`;
      await sendInternalEmail(`Daily summary: ${rows.length} client${rows.length === 1 ? "" : "s"} moved`, html);
    }
  }

  return NextResponse.json({ ok: true, reminded, flagged, expired, summarised });
}
