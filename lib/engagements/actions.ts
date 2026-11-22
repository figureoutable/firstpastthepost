import crypto from "crypto";
import { appOrigin, isProduction } from "@/lib/env";
import { putFile, readFile, writeOnce } from "@/lib/private-blob";
import { sendClientEmail, sendInternalEmail } from "@/lib/notifications";
import { isDriveConfigured, saveSignedLetter } from "@/lib/google-drive";
import { isEmail } from "@/lib/onboarding-fields";
import { createDraft as createOnboardingDraft, getDraft as getOnboardingDraft } from "@/lib/onboarding-draft-store";
import { createDraft as createFormationDraft, getDraft as getFormationDraft } from "@/lib/incorporation-draft-store";
import { initialState as initialFormationState } from "@/components/incorporation/state";
import { billingRequestResult, isGoCardlessConfigured, startMandateSetup } from "@/lib/payments/gocardless";
import { cardPaymentResult, isStripeConfigured, startCardPayment } from "@/lib/payments/stripe";
import { buildLetter, letterHtml, signatureLines, totalsByBilling } from "./letter";
import { letterPdf } from "./pdf";
import { getPriceList } from "./price-list";
import { getSettings } from "./settings";
import { linkEmail, signedCopyEmail, teamEmail } from "./emails";
import {
  addFlag,
  createEngagement,
  getEngagement,
  indexGoCardless,
  listEngagements,
  logEvent,
  newToken,
  updateEngagement,
} from "./store";
import { currentStep } from "./flow";
import { LINK_LIFETIME_DAYS, type ClientType, type Engagement, type EngagementLine, type PaymentMethod } from "./types";

export class FlowError extends Error {
  constructor(
    message: string,
    public status = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

export function clientLink(e: Engagement, request?: Request): string {
  return `${appOrigin(request)}/start/${e.token}`;
}

export function adminLink(e: Engagement, request?: Request): string {
  return `${appOrigin(request)}/admin/clients/${e.id}`;
}

export function partyName(e: Engagement): string {
  return e.client.companyName || e.client.name;
}

function newExpiry(): string {
  return new Date(Date.now() + LINK_LIFETIME_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Sends a milestone email to the team once only, even if two confirmations
 * arrive together. With the daily summary switched on, these are left for the summary.
 */
/**
 * True only the first time it's asked for this client and event, even if two requests arrive
 * at the same moment (for example the payment page and the GoCardless webhook).
 */
async function firstTime(id: string, key: string): Promise<boolean> {
  return writeOnce(`engagement-once/${id}/${key}`).catch((error) => {
    console.error("[engagement] Could not record that an email was sent", error);
    return true; // a rare duplicate email is better than none
  });
}

async function notifyTeamOnce(
  id: string,
  key: "letterSigned" | "paymentDone",
  build: (e: Engagement) => { subject: string; html: string; attachments?: { filename: string; content: Buffer }[] }
): Promise<void> {
  const before = await getEngagement(id);
  if (!before || before.notified?.[key]) return;
  if (!(await firstTime(id, `team-${key}`))) return;
  const { record } = await updateEngagement(id, (e) => {
    e.notified = { ...(e.notified || {}), [key]: new Date().toISOString() };
  });
  const settings = await getSettings();
  if (settings.dailySummary) return;
  const { subject, html, attachments } = build(record);
  await sendInternalEmail(subject, html, attachments ? { attachments } : {});
}

// ---------------------------------------------------------------- create and edit

export interface NewClientInput {
  type: ClientType;
  name: string;
  email: string;
  companyName?: string;
  companyNumber?: string;
  lines: { serviceId: string; pricePence: number }[];
  paymentMethod: PaymentMethod;
  cardAmountPence?: number;
  paymentNote?: string;
  send: boolean;
  /** Create even though this email already has a link in progress. */
  allowDuplicate?: boolean;
}

type CleanInput = Pick<Engagement, "client" | "lines" | "cardAmountPence"> & {
  paymentMethod: PaymentMethod;
  paymentNote?: string;
};

async function cleanInput(input: NewClientInput): Promise<CleanInput> {
  const name = String(input.name || "").trim().slice(0, 120);
  const email = String(input.email || "").trim().toLowerCase();
  if (!name) throw new FlowError("Enter the client's name.");
  if (!isEmail(email)) throw new FlowError("Enter a valid email address.");
  if (!["self-assessment", "business", "both", "formation"].includes(input.type)) throw new FlowError("Choose what the client needs.");

  const hasCompany = input.type === "business" || input.type === "both";
  const companyName = hasCompany || input.type === "formation" ? String(input.companyName || "").trim().slice(0, 160) : "";
  const companyNumber = hasCompany ? String(input.companyNumber || "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 10) : "";
  if (hasCompany && !companyName) throw new FlowError("Enter the company name.");

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

  return {
    client: {
      type: input.type,
      name,
      email,
      ...(companyName ? { companyName } : {}),
      ...(companyNumber ? { companyNumber } : {}),
    },
    lines,
    cardAmountPence,
    paymentMethod: method,
    paymentNote: note || undefined,
  };
}

/** Links still in progress for this email, so the team doesn't send two by mistake. */
async function openLinksFor(email: string, exceptId?: string): Promise<Engagement[]> {
  const all = await listEngagements();
  return all.filter((e) => e.id !== exceptId && e.client.email === email && ["letter", "payment", "onboarding"].includes(currentStep(e)));
}

function letterFor(c: CleanInput, by: string) {
  return buildLetter({
    clientName: c.client.name,
    // A formation's company doesn't exist yet, so the person signs for themselves.
    companyName: c.client.type === "formation" ? undefined : c.client.companyName,
    lines: c.lines,
    paymentMethod: c.paymentMethod,
    cardAmountPence: c.cardAmountPence,
    issuedBy: by,
  });
}

export async function createNewClient(input: NewClientInput, by: string, request: Request): Promise<Engagement> {
  const c = await cleanInput(input);
  if (!input.allowDuplicate) {
    const existing = await openLinksFor(c.client.email);
    if (existing.length) {
      throw new FlowError(`${c.client.email} already has a link in progress (${partyName(existing[0])}).`, 409, {
        duplicateId: existing[0].id,
      });
    }
  }

  const now = new Date().toISOString();
  const engagement: Engagement = {
    id: crypto.randomUUID(),
    token: newToken(),
    createdAt: now,
    updatedAt: now,
    createdBy: by,
    status: "open",
    client: c.client,
    lines: c.lines,
    payment: { method: c.paymentMethod, status: c.paymentMethod === "none" ? "not_required" : "not_started" },
    cardAmountPence: c.cardAmountPence,
    paymentNote: c.paymentNote,
    paymentChosenBy: by,
    letter: letterFor(c, by),
    expiresAt: newExpiry(),
    flags: [],
    events: [],
  };
  logEvent(engagement, by, "Created the client link");
  if (c.paymentMethod !== "direct_debit") {
    logEvent(engagement, by, `Chose payment: ${c.paymentMethod === "card" ? "card upfront" : "no payment step"}${c.paymentNote ? ` (${c.paymentNote})` : ""}`);
  }
  await createEngagement(engagement);

  if (input.send) await sendLink(engagement.id, by, request);
  return (await getEngagement(engagement.id)) || engagement;
}

/** Changes the details, services, prices or payment. Only until the client signs; the link stays the same. */
export async function editClient(
  id: string,
  input: NewClientInput,
  by: string,
  request: Request
): Promise<{ engagement: Engagement; sent: boolean }> {
  const c = await cleanInput(input);
  const current = await getEngagement(id);
  if (!current) throw new FlowError("Client not found.", 404);
  // Only warn again if the email has changed; the team already decided about this one.
  if (!input.allowDuplicate && current.client.email !== c.client.email) {
    const existing = await openLinksFor(c.client.email, id);
    if (existing.length) {
      throw new FlowError(`${c.client.email} already has another link in progress (${partyName(existing[0])}).`, 409, {
        duplicateId: existing[0].id,
      });
    }
  }
  const { record } = await updateEngagement(id, (e) => {
    if (e.status === "cancelled") throw new FlowError("This link has been cancelled.");
    if (e.signature) {
      throw new FlowError("The client has already signed, so this can no longer be changed. Cancel it and create a new link instead.", 409);
    }
    const methodChanged = e.payment.method !== c.paymentMethod;
    const typeChanged = e.client.type !== c.client.type;
    e.client = c.client;
    e.lines = c.lines;
    e.cardAmountPence = c.cardAmountPence;
    e.paymentNote = c.paymentNote;
    e.payment = { method: c.paymentMethod, status: c.paymentMethod === "none" ? "not_required" : "not_started" };
    if (methodChanged) e.paymentChosenBy = by;
    e.letter = letterFor(c, by);
    if (typeChanged) e.onboarding = undefined;
    logEvent(e, by, "Edited the details, services or payment. The letter was updated.");
  });
  const sent = input.send ? await sendLink(record.id, by, request) : false;
  return { engagement: (await getEngagement(id)) || record, sent };
}

/** Emails the link and gives it another 60 days. */
export async function sendLink(id: string, by: string, request: Request): Promise<boolean> {
  const e = await getEngagement(id);
  if (!e) throw new FlowError("Client not found.", 404);
  if (e.status === "cancelled") throw new FlowError("This link has been cancelled.");
  const { subject, html } = linkEmail(e, clientLink(e, request));
  const sent = await sendClientEmail(e.client.email, subject, html);
  await updateEngagement(id, (fresh) => {
    fresh.expiresAt = newExpiry();
    if (sent) {
      fresh.linkSentAt = new Date().toISOString();
      logEvent(fresh, by, `Emailed the link to ${fresh.client.email}`);
    } else {
      logEvent(fresh, by, "Tried to email the link, but the email could not be sent");
    }
    for (const flag of fresh.flags) {
      if (!flag.resolvedAt && flag.message.startsWith("Link expired")) flag.resolvedAt = new Date().toISOString();
    }
  });
  return sent;
}

// ---------------------------------------------------------------- client opens link

export async function markOpened(e: Engagement): Promise<void> {
  if (e.firstOpenedAt || e.status !== "open") return;
  await updateEngagement(e.id, (fresh) => {
    if (fresh.firstOpenedAt) return false;
    fresh.firstOpenedAt = new Date().toISOString();
    logEvent(fresh, "client", "Opened the link");
  });
}

function requireStep(e: Engagement, step: ReturnType<typeof currentStep>) {
  const now = currentStep(e);
  if (now === "cancelled") throw new FlowError("This link is no longer active. Please contact us.", 410);
  if (now === "expired") throw new FlowError("This link has expired. Please contact us for a new one.", 410);
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
  const pdfPath = `engagement-files/${e.id}/engagement-letter-${crypto.randomBytes(6).toString("hex")}.pdf`;
  await putFile(pdfPath, Buffer.from(pdf), { contentType: "application/pdf", overwrite: true });

  // Check again against the latest saved copy, in case the team edited it a moment ago.
  const { record } = await updateEngagement(e.id, (fresh) => {
    requireStep(fresh, "letter");
    if (fresh.letter.fingerprint !== input.fingerprint) {
      throw new FlowError("This letter has been updated. Please refresh the page to read the latest version.", 409);
    }
    fresh.signature = { ...base, pdfPath };
    logEvent(fresh, "client", `Signed the engagement letter as "${name}"`);
  });

  // From here nothing may stop the client moving on.
  // If two signatures arrived at the same moment, only the first files and emails the letter.
  if (!(await firstTime(record.id, "signed"))) return;
  await saveLetterToDrive(record.id, pdf).catch((err) => console.error("[engagement] Drive save failed", err));

  const attachment = [{ filename: `${letterFileName(record, signedAt)}.pdf`, content: Buffer.from(pdf) }];
  const copy = signedCopyEmail(record);
  const sent = await sendClientEmail(record.client.email, copy.subject, copy.html, { attachments: attachment });
  if (!sent) {
    await updateEngagement(record.id, (fresh) => logEvent(fresh, "system", "Could not email the signed copy to the client"));
  }
  await notifyTeamOnce(record.id, "letterSigned", (fresh) => ({
    subject: `Engagement letter signed: ${partyName(fresh)}`,
    html: teamEmail(fresh, adminLink(fresh, request), "Engagement letter signed", `Signed by ${name}. The PDF is attached.`),
    attachments: attachment,
  }));
}

export async function readSignedPdf(e: Engagement): Promise<Buffer | null> {
  if (!e.signature?.pdfPath) return null;
  const file = await readFile(e.signature.pdfPath);
  if (!file) return null;
  return Buffer.from(await new Response(file.stream).arrayBuffer());
}

/** Saves the PDF and a Google Doc to Shared Drive > Figures > Clients > <client>. Safe to retry. */
export async function saveLetterToDrive(id: string, pdf?: Uint8Array): Promise<boolean> {
  const e = await getEngagement(id);
  if (!e?.signature) return false;
  if (!isDriveConfigured()) {
    if (isProduction()) {
      await updateEngagement(id, (fresh) => {
        if (!addFlag(fresh, "drive", "Google Drive is not connected, so the signed letter was not saved there. Download it from this page.")) {
          return false;
        }
      });
    }
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
    await updateEngagement(id, (fresh) => {
      if (!fresh.signature) return false;
      fresh.signature.drive = { ...saved, savedAt: new Date().toISOString() };
      for (const flag of fresh.flags) if (flag.kind === "drive" && !flag.resolvedAt) flag.resolvedAt = new Date().toISOString();
      logEvent(fresh, "system", "Saved the signed letter to Google Drive");
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateEngagement(id, (fresh) => {
      if (!fresh.signature) return false;
      fresh.signature.drive = { error: message.slice(0, 300) };
      addFlag(fresh, "drive", "Saving the signed letter to Google Drive failed. Use Retry on this page.");
      logEvent(fresh, "system", "Saving to Google Drive failed");
    });
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
    const { changed } = await updateEngagement(e.id, (fresh) => {
      if (!addFlag(fresh, "payment", `${method === "card" ? "Stripe" : "GoCardless"} is not connected, so the client could not pay.`)) return false;
    });
    if (changed) {
      await sendInternalEmail(
        `Action needed: payment not connected`,
        teamEmail(e, adminLink(e, request), "A client could not set up payment", "The payment keys are missing in Vercel.")
      );
    }
    throw new FlowError("We can't set up payment right now. We've let the team know and will be in touch.", 503);
  }

  const link = clientLink(e, request);
  if (method === "direct_debit") {
    const { billingRequestId, url } = await startMandateSetup({
      engagementId: e.id,
      name: e.client.name,
      email: e.client.email,
      companyName: e.client.type === "formation" ? undefined : e.client.companyName,
      returnUrl: `${link}?payment=return`,
      exitUrl: link,
    });
    await indexGoCardless(billingRequestId, e.id);
    await updateEngagement(e.id, (fresh) => {
      fresh.payment = { ...fresh.payment, status: "pending", gocardless: { ...(fresh.payment.gocardless || {}), billingRequestId } };
      logEvent(fresh, "client", "Started setting up Direct Debit");
    });
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
  await updateEngagement(e.id, (fresh) => {
    fresh.payment = { ...fresh.payment, status: "pending", stripe: { ...(fresh.payment.stripe || {}), sessionId } };
    logEvent(fresh, "client", "Started card payment");
  });
  return { url };
}

async function paymentDoneEmail(id: string, request?: Request) {
  await notifyTeamOnce(id, "paymentDone", (fresh) => {
    const headline =
      (fresh.payment.method === "card" ? "Card payment received" : "Direct Debit set up") + (fresh.payment.simulated ? " (simulated test)" : "");
    return { subject: `${headline}: ${partyName(fresh)}`, html: teamEmail(fresh, adminLink(fresh, request), headline) };
  });
}

/** Asks GoCardless or Stripe directly whether the client finished. Returns true once payment is done. */
export async function confirmPayment(e: Engagement, request?: Request): Promise<boolean> {
  if (e.payment.completedAt) return true;
  if (currentStep(e) !== "payment") return false;

  if (e.payment.method === "direct_debit" && e.payment.gocardless?.billingRequestId) {
    const result = await billingRequestResult(e.payment.gocardless.billingRequestId);
    if (!result.fulfilled) return false;
    if (result.mandateId) await indexGoCardless(result.mandateId, e.id);
    const { changed } = await updateEngagement(e.id, (fresh) => {
      if (fresh.payment.completedAt) return false;
      fresh.payment.status = "submitted";
      fresh.payment.gocardless = {
        ...fresh.payment.gocardless,
        mandateId: result.mandateId,
        customerId: result.customerId,
        mandateStatus: "submitted",
      };
      fresh.payment.completedAt = new Date().toISOString();
      logEvent(fresh, "system", "Direct Debit authorised by the client (confirmed with GoCardless)");
    });
    if (changed) await paymentDoneEmail(e.id, request);
    return true;
  }

  if (e.payment.method === "card" && e.payment.stripe?.sessionId) {
    const result = await cardPaymentResult(e.payment.stripe.sessionId);
    if (!result.paid) return false;
    const { changed } = await updateEngagement(e.id, (fresh) => {
      if (fresh.payment.completedAt) return false;
      fresh.payment.status = "paid";
      fresh.payment.stripe = { ...fresh.payment.stripe, paymentIntentId: result.paymentIntentId, amountPence: result.amountPence };
      fresh.payment.completedAt = new Date().toISOString();
      logEvent(fresh, "system", "Card payment confirmed with Stripe");
    });
    if (changed) await paymentDoneEmail(e.id, request);
    return true;
  }
  return false;
}

export async function simulatePayment(e: Engagement, request: Request): Promise<void> {
  requireStep(e, "payment");
  if (!canSimulatePayment(e.payment.method)) throw new FlowError("Not available.", 403);
  const { changed } = await updateEngagement(e.id, (fresh) => {
    if (fresh.payment.completedAt) return false;
    fresh.payment.status = fresh.payment.method === "card" ? "paid" : "submitted";
    fresh.payment.simulated = true;
    fresh.payment.completedAt = new Date().toISOString();
    logEvent(fresh, "client", "Simulated payment (test build)");
  });
  if (changed) await paymentDoneEmail(e.id, request);
}

// ---------------------------------------------------------------- onboarding or formation form

/** The client's form, created when they reach the step and prefilled with what we know. */
export async function onboardingDraft(e: Engagement) {
  requireStep(e, "onboarding");
  const formation = e.client.type === "formation";

  if (e.onboarding?.draftCode) {
    const existing = formation ? await getFormationDraft(e.onboarding.draftCode) : await getOnboardingDraft(e.onboarding.draftCode);
    if (existing) return { formation, draft: existing };
  }

  let code: string;
  if (formation) {
    const state = initialFormationState();
    if (e.client.companyName) state.step2.name = e.client.companyName.replace(/\s+(limited|ltd\.?)$/i, "");
    state.step3.registeredEmail = e.client.email;
    code = (await createFormationDraft({ step: 1, phase: "banner", state })).code;
  } else {
    const state: Record<string, unknown> = { fullNamePassport: e.signature?.name || e.client.name, email: e.client.email };
    if (e.client.companyName) state.companyName = e.client.companyName;
    if (e.client.companyNumber) state.registrationNumber = e.client.companyNumber;
    code = (await createOnboardingDraft({ onboardingType: e.client.type as Exclude<ClientType, "formation">, formStep: 1, state })).code;
  }

  const { record } = await updateEngagement(e.id, (fresh) => {
    if (fresh.onboarding?.draftCode) return false; // another tab got there first
    fresh.onboarding = { ...(fresh.onboarding || {}), draftCode: code };
    logEvent(fresh, "client", formation ? "Started the company details" : "Started their details");
  });
  const finalCode = record.onboarding?.draftCode || code;
  const draft = formation ? await getFormationDraft(finalCode) : await getOnboardingDraft(finalCode);
  if (!draft) throw new FlowError("We could not load your form. Please refresh.", 500);
  return { formation, draft };
}

export function checkOnboardingAllowed(e: Engagement): void {
  requireStep(e, "onboarding");
}

export async function completeOnboarding(id: string, submissionId: string): Promise<void> {
  await updateEngagement(id, (fresh) => {
    if (fresh.onboarding?.completedAt) return false;
    fresh.onboarding = { ...(fresh.onboarding || {}), submissionId, completedAt: new Date().toISOString() };
    fresh.status = "complete";
    logEvent(fresh, "client", fresh.client.type === "formation" ? "Submitted the company details" : "Submitted their details and ID");
  });
}
