import { escapeHtml } from "@/lib/email-html";
import { FIRM } from "@/lib/figures-config";
import { totalsText } from "./letter";
import { PAYMENT_METHOD_LABEL, type Engagement } from "./types";

function wrap(body: string): string {
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1c1917;">
    <p style="font-size:20px;font-weight:700;margin:0 0 16px;">figures</p>
    ${body}
    <p style="font-size:14px;color:#57534e;margin-top:24px;">Questions? Just reply to this email.</p>
  </div>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0;"><a href="${href}" style="display:inline-block;padding:12px 20px;background:#ea580c;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">${escapeHtml(label)}</a></p>`;
}

function firstName(name: string): string {
  return escapeHtml(name.trim().split(/\s+/)[0] || "there");
}

function stepsText(e: Engagement): string {
  const payment = e.payment.method === "direct_debit" ? "set up your Direct Debit, " : e.payment.method === "card" ? "make your payment, " : "";
  return `sign your engagement letter, ${payment}then add your details and ID`;
}

/** The link email. Under 100 words. */
export function linkEmail(e: Engagement, url: string): { subject: string; html: string } {
  return {
    subject: "Your next steps with Figures",
    html: wrap(`
      <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">Hi ${firstName(e.client.name)},</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">Thank you for choosing ${FIRM.tradingName}. Use the link below to ${stepsText(e)}. It takes about 10 minutes and saves as you go.</p>
      ${button(url, "Get started")}
      <p style="font-size:13px;color:#78716c;margin:0;">This link is personal to you, so please don't share it.</p>
      <p style="font-size:15px;margin:20px 0 0;">Josh</p>`),
  };
}

export function reminderEmail(e: Engagement, url: string): { subject: string; html: string } {
  return {
    subject: "A reminder to finish setting up with Figures",
    html: wrap(`
      <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">Hi ${firstName(e.client.name)},</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">Just a reminder to finish setting up with us. You can pick up where you left off.</p>
      ${button(url, "Carry on")}
      <p style="font-size:15px;margin:20px 0 0;">Josh</p>`),
  };
}

export function signedCopyEmail(e: Engagement): { subject: string; html: string } {
  return {
    subject: "Your signed engagement letter",
    html: wrap(`
      <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">Hi ${firstName(e.client.name)},</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">Thank you for signing. Your engagement letter is attached for your records.</p>
      <p style="font-size:15px;margin:20px 0 0;">Josh</p>`),
  };
}

export function doneEmailForClient(e: Engagement): { subject: string; html: string } {
  return {
    subject: "You're all set",
    html: wrap(`
      <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">Hi ${firstName(e.client.name)},</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">Thank you, we have everything we need to get started. We will check your details and be in touch shortly.</p>
      <p style="font-size:15px;margin:20px 0 0;">Josh</p>`),
  };
}

// ---- Team emails ----

function summaryTable(e: Engagement, adminUrl: string): string {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:600;width:40%;">${k}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;">${v}</td></tr>`;
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0;">
      ${row("Client", escapeHtml(e.client.name))}
      ${e.client.companyName ? row("Company", escapeHtml(`${e.client.companyName}${e.client.companyNumber ? ` (${e.client.companyNumber})` : ""}`)) : ""}
      ${row("Email", escapeHtml(e.client.email))}
      ${row("Services", escapeHtml(e.lines.map((l) => l.name).join(", ")))}
      ${row("Fees", escapeHtml(totalsText(e.lines).join(", ") || "Free"))}
      ${row("Payment", escapeHtml(PAYMENT_METHOD_LABEL[e.payment.method]))}
    </table>
    <p><a href="${adminUrl}" style="color:#c2410c;">Open on the status board</a></p>`;
}

export function teamEmail(e: Engagement, adminUrl: string, headline: string, detail = ""): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:20px;">
    <h2 style="margin:0 0 6px;">${escapeHtml(headline)}</h2>
    ${detail ? `<p style="color:#57534e;margin:0 0 8px;">${detail}</p>` : ""}
    ${summaryTable(e, adminUrl)}
  </div>`;
}

export function signInEmail(url: string): { subject: string; html: string } {
  return {
    subject: "Your Figures team sign-in link",
    html: wrap(`
      <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">Use this link to sign in to the Figures team screens. It works once and expires in 15 minutes.</p>
      ${button(url, "Sign in")}
      <p style="font-size:13px;color:#78716c;">If you did not ask for this, you can ignore it.</p>`),
  };
}
