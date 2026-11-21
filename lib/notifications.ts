import { Resend } from "resend";
import { isPreview } from "@/lib/env";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/** Where new submissions are sent. Change NOTIFY_EMAIL in Vercel to use a team inbox. */
const INTERNAL_TO = process.env.NOTIFY_EMAIL || "joshua@tryfigures.com";

/**
 * Sender address. "onboarding@resend.dev" is Resend's test sender and can only
 * deliver to the Resend account owner, so client emails need EMAIL_FROM set to
 * an address on a domain verified in Resend, e.g. "Figures <hello@tryfigures.com>".
 */
const FROM = process.env.EMAIL_FROM || "Figures Onboarding <onboarding@resend.dev>";

function subjectFor(subject: string): string {
  return isPreview() ? `[Preview test] ${subject}` : subject;
}

export async function sendInternalEmail(subject: string, html: string): Promise<void> {
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to: [INTERNAL_TO],
    subject: subjectFor(subject),
    html,
  });
}

/** Sends to the client. Never throws: a failed confirmation must not fail a submission. */
export async function sendClientEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resend || !to) return;
  try {
    const result = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: subjectFor(subject),
      html,
    });
    if (result.error) console.error("[email] Client email not sent:", result.error.message);
  } catch (error) {
    console.error("[email] Client email failed:", error);
  }
}
