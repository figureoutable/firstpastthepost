import crypto from "crypto";
import { appOrigin, isProduction } from "@/lib/env";
import { putFile, readFile } from "@/lib/private-blob";
import { sendClientEmail, sendInternalEmail } from "@/lib/notifications";
import { isDriveConfigured, saveSignedLetter } from "@/lib/google-drive";
import { isEmail, type OnboardingType } from "@/lib/onboarding-fields";
import { createDraft, getDraft } from "@/lib/onboarding-draft-store";
import { billingRequestResult, isGoCardlessConfigured, startMandateSetup } from "@/lib/payments/gocardless";
import { cardPaymentResult, isStripeConfigured, startCardPayment } from "@/lib/payments/stripe";
import { buildLetter, letterHtml, signatureLines, totalsByBilling } from "./letter";
import { letterPdf } from "./pdf";
import { getPriceList } from "./price-list";
import { linkEmail, signedCopyEmail, teamEmail } from "./emails";
import { addFlag, createEngagement, indexGoCardless, logEvent, newToken, saveEngagement } from "./store";
import { currentStep } from "./flow";
import type { Engagement, EngagementLine, PaymentMethod } from "./types";

export class FlowError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export function clientLink(e: Engagement, request?: Request): string {
  return `${appOrigin(request)}/start/${e.token}`;
}

export function adminLink(e: Engagement, request?: Request): string {
  return `${appOrigin(request)}/admin/clients/${e.id}`;
}

function partyName(e: Engagement): string {
  return e.client.companyName || e.client.name;
}

// ---------------------------------------------------------------- create

export interface NewClientInput {
  type: OnboardingType;
  name: string;
  email: string;
  companyName?: string;
  companyNumber?: string;
  lines: { serviceId: string; pricePence: number }[];
  paymentMethod: PaymentMethod;
  cardAmountPence?: number;
  paymentNote?: string;
  send: boolean;
}

export async function createNewClient(input: NewClientInput, by: string, request: Request): Promise<Engagement> {
  const name = String(input.name || "").trim().slice(0, 120);
  const email = String(input.email || "").trim().toLowerCase();
  if (!name) throw new FlowError("Enter the client's name.");
  if (!isEmail(email)) throw new FlowError("Enter a valid email address.");
  if (!["self-assessment", "business", "both"].includes(input.type)) throw new FlowError("Choose what the client needs.");
  const isCompany = input.type !== "self-assessment";
  const companyName = isCompany ? String(input.companyName || "").trim().slice(0, 160) : "";
  const companyNumber = isCompany ? String(input.companyNumber || "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 10) : "";
  if (isCompany && !companyName) throw new FlowError("Enter the company name.");

  const priceList = await getPriceList();
  const byId = new Map(priceList.items.map((i) => [i.id, i]));
  if (!Array.isArray(input.lines) || input.lines.length === 0) throw new FlowError("Choose at least one service.");
  const lines: EngagementLine[] = input.lines.map((l) => {
    const item = byId.get(l.serviceId);
    if (!item) throw new FlowError("One of the services is no longer on the price list. Refresh and try again.");
    const price = Number(l.pricePence);
    if (!Number.isInteger(price) || price < 0) throw new FlowError(`Check the price for ${item.name}.`);
    return { serviceId: item.id, name: item.name, description: item.description, billing: item.billing, pricePence: price };
  });

  const method = input.paymentMethod;
  if (!["direct_debit", "card", "none"].includes(method)) throw new FlowError("Choose how the client pays.");
  const note = String(input.paymentNote || "").trim().slice(0, 300);
  let cardAmountPence: number | undefined;
  if (method === "card") {
    const totals = totalsByBilling(lines);
    cardAmountPence = Number.isInteger(input.cardAmountPence) ? input.cardAmountPence : totals.monthly + totals.annual + totals.one_off;
    if (!cardAmountPence || cardAmountPence < 100) throw new FlowError("The card amount must be at least £1.");
  }
  if (method === "none" && !note) throw new FlowError("Add a short reason for skipping payment, so it's on record.");

  const now = new Date().toISOString();
  const engagement: Engagement = {
    id: crypto.randomUUID(),
    token: newToken(),
    createdAt: now,
    updatedAt: now,
    createdBy: by,
    status: "open",
    client: {
      type: input.type,
      name,
      email,
      ...(companyName ? { companyName } : {}),
      ...(companyNumber ? { companyNumber } : {}),
    },
    lines,
    payment: { method, status: method === "none" ? "not_required" : "not_started" },
    cardAmountPence,
    paymentNote: note || undefined,
    paymentChosenBy: by,
    letter: buildLetter({ clientName: name, companyName: companyName || undefined, lines, paymentMethod: method, cardAmountPence, issuedBy: by }),
    flags: [],
    events: [],
  };
  logEvent(engagement, by, "Created the client link");
  if (method !== "direct_debit") {
    logEvent(engagement, by, `Chose payment: ${method === "card" ? "card upfront" : "no payment step"}${note ? ` (${note})` : ""}`);
  }
  await createEngagement(engagement);

  if (input.send) await sendLink(engagement, by, request);
  return engagement;
}

export async function sendLink(e: Engagement, by: string, request: Request): Promise<boolean> {
  if (e.status === "cancelled") throw new FlowError("This link has been cancelled.");
  const { subject, html } = linkEmail(e, clientLink(e, request));
  const sent = await sendClientEmail(e.client.email, subject, html);
  if (sent) {
    e.linkSentAt = new Date().toISOString();
    logEvent(e, by, `Emailed the link to ${e.client.email}`);
  } else {
    logEvent(e, by, "Tried to email the link, but the email could not be sent");
  }
  await saveEngagement(e);
  return sent;
}

// ---------------------------------------------------------------- client opens link

export async function markOpened(e: Engagement): Promise<void> {
  if (e.firstOpenedAt || e.status !== "open") return;
  e.firstOpenedAt = new Date().toISOString();
  logEvent(e, "client", "Opened the link");
  await saveEngagement(e);
}

function requireStep(e: Engagement, step: ReturnType<typeof currentStep>) {
  const now = currentStep(e);
  if (now === "cancelled") throw new FlowError("This link is no longer active. Please contact us.", 410);
  if (now !== step) throw new FlowError("This step is not available yet, or is already done. Please refresh the page.", 409);
}

function clientIp(request: Request): string {
  return (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || request.headers.get("x-real-ip") || "";
}

// ---------------------------------------------------------------- sign

export function letterFileName(e: Engagement, signedAt: string): string {
  const day = signedAt.slice(0, 10);
  return `Engagement letter - ${partyName(e).replace(/[\\/:*?"<>|]/g, "-")} - ${day}`;
}

export async function signLetter(
  e: Engagement,
  input: { name: string; agree: boolean; fingerprint: string },
  request: Request
): Promise<void> {
  requireStep(e, "letter");
  const name = String(input.name || "").trim().replace(/\s+/g, " ").slice(0, 120);
  if (name.length < 2) throw new FlowError("Type your full name to sign.");
  if (input.agree !== true) throw new FlowError("Please tick to confirm you agree.");
  if (input.fingerprint !== e.letter.fingerprint) {
    throw new FlowError("This letter has been updated. Please refresh the page to read the latest version.", 409);
  }

  const signedAt = new Date().toISOString();
  const base = {
    name,
    email: e.client.email,
    signedAt,
    ip: clientIp(request),
    userAgent: (request.headers.get("user-agent") || "").slice(0, 300),
    fingerprint: e.letter.fingerprint,
  };
  const pdf = await letterPdf(e.letter, base, e.id);
  const pdfPath = `engagement-files/${e.id}/engagement-letter.pdf`;
  await putFile(pdfPath, Buffer.from(pdf), { contentType: "application/pdf", overwrite: true });

  e.signature = { ...base, pdfPath };
  logEvent(e, "client", `Signed the engagement letter as "${name}"`);
  await saveEngagement(e);

  // From here nothing may stop the client moving on.
  await saveLetterToDrive(e, pdf).catch((err) => console.error("[engagement] Drive save failed", err));

  const attachment = [{ filename: `${letterFileName(e, signedAt)}.pdf`, content: Buffer.from(pdf) }];
  const copy = signedCopyEmail(e);
  const sent = await sendClientEmail(e.client.email, copy.subject, copy.html, { attachments: attachment });
  if (!sent) logEvent(e, "system", "Could not email the signed copy to the client");
  await sendInternalEmail(
    `Engagement letter signed: ${partyName(e)}`,
    teamEmail(e, adminLink(e, request), "Engagement letter signed", `Signed by ${name}. The PDF is attached.`),
    { attachments: attachment }
  );
  await saveEngagement(e);
}

export async function readSignedPdf(e: Engagement): Promise<Buffer | null> {
  if (!e.signature?.pdfPath) return null;
  const file = await readFile(e.signature.pdfPath);
  if (!file) return null;
  return Buffer.from(await new Response(file.stream).arrayBuffer());
}

/** Saves the PDF and a Google Doc to Shared Drive > Figures > Clients > <client>. Safe to retry. */
export async function saveLetterToDrive(e: Engagement, pdf?: Uint8Array): Promise<boolean> {
  if (!e.signature) return false;
  if (!isDriveConfigured()) {
    if (isProduction()) addFlag(e, "drive", "Google Drive is not connected, so the signed letter was not saved there. Download it from this page.");
    await saveEngagement(e);
    return false;
  }
  try {
    const bytes = pdf || (await readSignedPdf(e));
    if (!bytes) throw new Error("Signed PDF not found");
    const html = `${letterHtml(e.letter)}<hr/>${signatureLines(e.signature, e.id)
      .map((l) => `<p style="font-size:12px;color:#57534e;margin:0 0 4px;">${l.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`)
      .join("")}`;
    const saved = await saveSignedLetter({
      clientFolderName: partyName(e),
      fileName: letterFileName(e, e.signature.signedAt),
      pdf: bytes,
      html,
    });
    e.signature.drive = { ...saved, savedAt: new Date().toISOString() };
    for (const flag of e.flags) if (flag.kind === "drive" && !flag.resolvedAt) flag.resolvedAt = new Date().toISOString();
    logEvent(e, "system", "Saved the signed letter to Google Drive");
    await saveEngagement(e);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    e.signature.drive = { error: message.slice(0, 300) };
    addFlag(e, "drive", "Saving the signed letter to Google Drive failed. Use Retry on this page.");
    logEvent(e, "system", "Saving to Google Drive failed");
    await saveEngagement(e);
    return false;
  }
}

// ---------------------------------------------------------------- payment

export function paymentConnected(method: PaymentMethod): boolean {
  if (method === "direct_debit") return isGoCardlessConfigured();
  if (method === "card") return isStripeConfigured();
  return true;
}

/** On previews and local builds with no keys, the payment step can be simulated for testing. */
export function canSimulatePayment(method: PaymentMethod): boolean {
  return !isProduction() && !paymentConnected(method);
}

export async function startPayment(e: Engagement, request: Request): Promise<{ url?: string; simulate?: boolean }> {
  requireStep(e, "payment");
  const method = e.payment.method;
  if (!paymentConnected(method)) {
    if (canSimulatePayment(method)) return { simulate: true };
    addFlag(e, "payment", `${method === "card" ? "Stripe" : "GoCardless"} is not connected, so the client could not pay.`);
    await saveEngagement(e);
    await sendInternalEmail(
      `Action needed: payment not connected`,
      teamEmail(e, adminLink(e, request), "A client could not set up payment", "The payment keys are missing in Vercel.")
    );
    throw new FlowError("We can't set up payment right now. We've let the team know and will be in touch.", 503);
  }

  const link = clientLink(e, request);
  if (method === "direct_debit") {
    const { billingRequestId, url } = await startMandateSetup({
      engagementId: e.id,
      name: e.client.name,
      email: e.client.email,
      companyName: e.client.companyName,
      returnUrl: `${link}?payment=return`,
      exitUrl: link,
    });
    e.payment = { ...e.payment, status: "pending", gocardless: { ...(e.payment.gocardless || {}), billingRequestId } };
    await indexGoCardless(billingRequestId, e.id);
    logEvent(e, "client", "Started setting up Direct Debit");
    await saveEngagement(e);
    return { url };
  }

  const { sessionId, url } = await startCardPayment({
    engagementId: e.id,
    email: e.client.email,
    amountPence: e.cardAmountPence || 0,
    description: `Figures: ${e.lines.map((l) => l.name).join(", ")}`,
    successUrl: `${link}?payment=return&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: link,
  });
  e.payment = { ...e.payment, status: "pending", stripe: { ...(e.payment.stripe || {}), sessionId } };
  logEvent(e, "client", "Started card payment");
  await saveEngagement(e);
  return { url };
}

async function markPaymentDone(e: Engagement, request: Request | undefined, how: string) {
  e.payment.completedAt = new Date().toISOString();
  logEvent(e, how === "simulated" ? "client" : "system", how === "simulated" ? "Simulated payment (test build)" : how);
  await saveEngagement(e);
  const headline =
    (e.payment.method === "card" ? "Card payment received" : "Direct Debit set up") + (e.payment.simulated ? " (simulated test)" : "");
  await sendInternalEmail(`${headline}: ${partyName(e)}`, teamEmail(e, adminLink(e, request), headline));
}

/** Asks GoCardless or Stripe directly whether the client finished. Returns true once payment is done. */
export async function confirmPayment(e: Engagement, request?: Request): Promise<boolean> {
  if (e.payment.completedAt) return true;
  if (currentStep(e) !== "payment") return false;

  if (e.payment.method === "direct_debit" && e.payment.gocardless?.billingRequestId) {
    const result = await billingRequestResult(e.payment.gocardless.billingRequestId);
    if (!result.fulfilled) return false;
    e.payment.status = "submitted";
    e.payment.gocardless = { ...e.payment.gocardless, mandateId: result.mandateId, customerId: result.customerId, mandateStatus: "submitted" };
    if (result.mandateId) await indexGoCardless(result.mandateId, e.id);
    await markPaymentDone(e, request, "Direct Debit authorised by the client (confirmed with GoCardless)");
    return true;
  }

  if (e.payment.method === "card" && e.payment.stripe?.sessionId) {
    const result = await cardPaymentResult(e.payment.stripe.sessionId);
    if (!result.paid) return false;
    e.payment.status = "paid";
    e.payment.stripe = { ...e.payment.stripe, paymentIntentId: result.paymentIntentId, amountPence: result.amountPence };
    await markPaymentDone(e, request, "Card payment confirmed with Stripe");
    return true;
  }
  return false;
}

export async function simulatePayment(e: Engagement, request: Request): Promise<void> {
  requireStep(e, "payment");
  if (!canSimulatePayment(e.payment.method)) throw new FlowError("Not available.", 403);
  e.payment.status = e.payment.method === "card" ? "paid" : "submitted";
  e.payment.simulated = true;
  await markPaymentDone(e, request, "simulated");
}

// ---------------------------------------------------------------- onboarding

/** The onboarding draft for this client, created when they reach the step. Prefilled with what we know. */
export async function onboardingDraft(e: Engagement) {
  requireStep(e, "onboarding");
  if (e.onboarding?.draftCode) {
    const existing = await getDraft(e.onboarding.draftCode);
    if (existing) return existing;
  }
  const state: Record<string, unknown> = {
    fullNamePassport: e.signature?.name || e.client.name,
    email: e.client.email,
  };
  if (e.client.companyName) state.companyName = e.client.companyName;
  if (e.client.companyNumber) state.registrationNumber = e.client.companyNumber;
  const draft = await createDraft({ onboardingType: e.client.type, formStep: 1, state });
  e.onboarding = { ...(e.onboarding || {}), draftCode: draft.code };
  logEvent(e, "client", "Started their details");
  await saveEngagement(e);
  return draft;
}

export function checkOnboardingAllowed(e: Engagement): void {
  requireStep(e, "onboarding");
}

export async function completeOnboarding(e: Engagement, submissionId: string): Promise<void> {
  e.onboarding = { ...(e.onboarding || {}), submissionId, completedAt: new Date().toISOString() };
  e.status = "complete";
  logEvent(e, "client", "Submitted their details and ID");
  await saveEngagement(e);
}
