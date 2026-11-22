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

/** Local testing only: with no Resend key, EMAIL_PREVIEW_DIR saves each email as an HTML file instead. */
async function savePreview(subject: string, html: string) {
  const dir = process.env.EMAIL_PREVIEW_DIR;
  if (!dir || process.env.VERCEL) return;
  const { mkdir, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${subject.replace(/[^a-z0-9]+/gi, "-").slice(0, 60)}.html`;
  await writeFile(path.join(dir, name), html);
}

export type EmailAttachment = { filename: string; content: Buffer };
type SendOptions = { attachments?: EmailAttachment[]; replyTo?: string };

function subjectFor(subject: string): string {
  return isPreview() ? `[Preview test] ${subject}` : subject;
}

/** Sends to the team inbox. Failures are logged (Vercel logs) rather than thrown. */
export async function sendInternalEmail(subject: string, html: string, options: SendOptions = {}): Promise<boolean> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set; internal email skipped:", subject);
    await savePreview(subject, html).catch(() => {});
    return false;
  }
  try {
    const result = await resend.emails.send({
      from: FROM,
      to: [INTERNAL_TO],
      subject: subjectFor(subject),
      html,
      ...(options.attachments?.length ? { attachments: options.attachments } : {}),
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    });
    if (result.error) {
      console.error("[email] Internal email not sent:", subject, result.error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] Internal email failed:", subject, error);
    return false;
  }
}

/**
 * Sends to the client. Never throws: a failed confirmation must not fail a submission.
 * Returns false if it could not be sent, so callers can flag it.
 */
export async function sendClientEmail(to: string, subject: string, html: string, options: SendOptions = {}): Promise<boolean> {
  if (!to) return false;
  if (!resend) {
    await savePreview(`client ${subject}`, html).catch(() => {});
    return false;
  }
  try {
    const result = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: subjectFor(subject),
      html,
      ...(options.attachments?.length ? { attachments: options.attachments } : {}),
      replyTo: options.replyTo || INTERNAL_TO,
    });
    if (result.error) {
      console.error("[email] Client email not sent:", result.error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] Client email failed:", error);
    return false;
  }
}
