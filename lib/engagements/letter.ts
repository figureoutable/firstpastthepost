import crypto from "crypto";
import { FIRM } from "@/lib/figures-config";
import { escapeHtml } from "@/lib/email-html";
import {
  BILLING_LABEL,
  type Billing,
  type EngagementLine,
  type LetterBlock,
  type LetterSnapshot,
  type PaymentMethod,
} from "./types";

/**
 * The engagement letter.
 *
 * PLACEHOLDER TEMPLATE: Josh is sending the real letter and service schedules.
 * When they arrive, replace TERMS and SCHEDULES below and bump TEMPLATE_VERSION.
 * Letters already sent keep the exact wording they were issued with (it is
 * saved with each client), so changing this never alters a signed letter.
 */
export const TEMPLATE_VERSION = "placeholder-1";

const TERMS: string[] = [
  "[Placeholder] Your standard terms of business will appear here once the template is added.",
];

/** Optional extra wording per service, keyed by price list id. */
const SCHEDULES: Record<string, string[]> = {};

export function formatPence(pence: number): string {
  const pounds = pence / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: Number.isInteger(pounds) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(pounds);
}

/** A line's price as the client sees it: "Free" rather than £0. */
export function linePrice(pence: number): string {
  return pence === 0 ? "Free" : formatPence(pence);
}

export function totalsByBilling(lines: EngagementLine[]): Record<Billing, number> {
  const totals: Record<Billing, number> = { monthly: 0, annual: 0, one_off: 0 };
  for (const line of lines) totals[line.billing] += line.pricePence;
  return totals;
}

export function totalsText(lines: EngagementLine[]): string[] {
  const totals = totalsByBilling(lines);
  const out: string[] = [];
  if (totals.monthly) out.push(`${formatPence(totals.monthly)} a month`);
  if (totals.annual) out.push(`${formatPence(totals.annual)} a year`);
  if (totals.one_off) out.push(`${formatPence(totals.one_off)} one-off`);
  return out;
}

function ukDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
}

export function buildLetter(input: {
  clientName: string;
  companyName?: string;
  lines: EngagementLine[];
  paymentMethod: PaymentMethod;
  cardAmountPence?: number;
  issuedBy: string;
}): LetterSnapshot {
  const issuedAt = new Date().toISOString();
  const party = input.companyName ? input.companyName : input.clientName;
  const firstName = input.clientName.trim().split(/\s+/)[0] || input.clientName;

  const payment: Record<PaymentMethod, string> = {
    direct_debit:
      "We collect our fees by Direct Debit through GoCardless. You will set this up in the next step. No money is taken until we have finished our identity checks.",
    card: `You will pay ${formatPence(input.cardAmountPence || 0)} by card in the next step.`,
    none: "We will send you an invoice for our fees.",
  };

  const blocks: LetterBlock[] = [
    { type: "h1", text: "Engagement letter" },
    { type: "small", text: `${FIRM.legalName}, trading as ${FIRM.tradingName}. Issued ${ukDate(issuedAt)}.` },
    { type: "p", text: `Dear ${firstName},` },
    {
      type: "p",
      text: `Thank you for choosing ${FIRM.tradingName}. This letter sets out the services we will provide to ${party}, our fees and the terms of our engagement.`,
    },
    { type: "h2", text: "Services and fees" },
    {
      type: "fees",
      rows: input.lines.map((l) => ({ name: l.name, billing: BILLING_LABEL[l.billing], price: linePrice(l.pricePence) })),
      totals: totalsText(input.lines),
    },
  ];

  for (const line of input.lines) {
    const schedule = SCHEDULES[line.serviceId];
    if (schedule?.length) {
      blocks.push({ type: "h2", text: line.name });
      for (const text of schedule) blocks.push({ type: "p", text });
    }
  }

  blocks.push(
    { type: "h2", text: "Paying our fees" },
    { type: "p", text: payment[input.paymentMethod] },
    { type: "h2", text: "Terms of business" },
    ...TERMS.map((text) => ({ type: "p" as const, text })),
    { type: "h2", text: "Your agreement" },
    {
      type: "p",
      text: `By signing below you confirm that you have read and agree to this letter and our terms of business${
        input.companyName ? `, and that you are authorised to sign on behalf of ${input.companyName}` : ""
      }.`,
    }
  );

  const title = `Engagement letter: ${party}`;
  return {
    templateVersion: TEMPLATE_VERSION,
    title,
    blocks,
    fingerprint: fingerprint(title, blocks),
    issuedAt,
    issuedBy: input.issuedBy,
  };
}

export function fingerprint(title: string, blocks: LetterBlock[]): string {
  return crypto.createHash("sha256").update(JSON.stringify({ title, blocks })).digest("hex");
}

/** The letter as HTML, for the signing page, emails and the Google Doc. */
export function letterHtml(letter: LetterSnapshot): string {
  return letter.blocks
    .map((block) => {
      switch (block.type) {
        case "h1":
          return `<h1 style="font-size:24px;margin:0 0 4px;">${escapeHtml(block.text)}</h1>`;
        case "h2":
          return `<h2 style="font-size:17px;margin:24px 0 8px;">${escapeHtml(block.text)}</h2>`;
        case "small":
          return `<p style="font-size:13px;color:#78716c;margin:0 0 20px;">${escapeHtml(block.text)}</p>`;
        case "p":
          return `<p style="margin:0 0 12px;line-height:1.6;">${escapeHtml(block.text)}</p>`;
        case "list":
          return `<ul>${block.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
        case "fees":
          return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:4px 0 8px;">
            <thead><tr>
              <th style="text-align:left;padding:8px;border-bottom:2px solid #e7e5e4;">Service</th>
              <th style="text-align:left;padding:8px;border-bottom:2px solid #e7e5e4;">Billed</th>
              <th style="text-align:right;padding:8px;border-bottom:2px solid #e7e5e4;">Fee</th>
            </tr></thead>
            <tbody>${block.rows
              .map(
                (r) => `<tr>
                <td style="padding:8px;border-bottom:1px solid #f5f5f4;">${escapeHtml(r.name)}</td>
                <td style="padding:8px;border-bottom:1px solid #f5f5f4;">${escapeHtml(r.billing)}</td>
                <td style="padding:8px;border-bottom:1px solid #f5f5f4;text-align:right;">${escapeHtml(r.price)}</td>
              </tr>`
              )
              .join("")}</tbody>
          </table>
          <p style="margin:0 0 12px;font-weight:600;">Total: ${escapeHtml(block.totals.join(", ") || "Free")}</p>`;
      }
    })
    .join("\n");
}

/** The signing record shown at the end of the PDF and the Google Doc. */
export function signatureLines(sig: { name: string; email: string; signedAt: string; ip: string; fingerprint: string }, engagementId: string): string[] {
  const when = new Date(sig.signedAt).toLocaleString("en-GB", {
    dateStyle: "long",
    timeStyle: "medium",
    timeZone: "Europe/London",
  });
  return [
    `Signed electronically by: ${sig.name}`,
    `Email: ${sig.email}`,
    `Date and time: ${when} (UK time)`,
    `IP address: ${sig.ip || "not recorded"}`,
    `Letter fingerprint (SHA-256): ${sig.fingerprint}`,
    `Reference: ${engagementId}`,
  ];
}
