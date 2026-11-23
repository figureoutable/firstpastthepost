import crypto from "crypto";
import { execFile } from "child_process";
import { existsSync, promises as fs } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { isProduction } from "@/lib/env";
import { putFile, readBytes } from "@/lib/private-blob";
import { exportPdf, findOrCreateClientFolder, isDriveConfigured, saveLetterDoc } from "@/lib/google-drive";
import { FEE_ROWS_FOR, fillLetter, type FeeRowKey, type LetterInput, type LetterKind } from "./letter-docx";
import { LETTER_KIND_LABEL, readTemplate, templateMeta } from "./letter-templates";
import { pageCount } from "./sign-pdf";
import { letterKindsFor, type ClientType, type Engagement, type EngagementLine, type IssuedLetter, type LetterDetails } from "./types";

/**
 * Turns a client's details and fees into the firm's real engagement letters:
 * fills the Word template, saves it as a Google Doc in Clients > [client], and
 * uses Google's PDF of that Doc as the letter the client reads and signs.
 */

export function ukDate(isoDay: string): string {
  const d = new Date(`${isoDay.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDay;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function today(): string {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
}

/** A best guess for price list items saved before fee rows existed. */
export function guessLetterRow(name: string): FeeRowKey | "none" {
  const n = name.toLowerCase();
  if (n.includes("partnership")) return "partnership";
  if (n.includes("self assessment") || n.includes("tax return") || n.includes("personal tax")) return "sa";
  if (n.includes("bookkeeping")) return "bookkeeping";
  if (n.includes("vat")) return "vat";
  if (n.includes("payroll")) return "payroll";
  if (n.includes("accounts") || n.includes("corporation tax")) return "accounts_ct";
  return "none";
}

export function rowFor(line: Pick<EngagementLine, "letterRow" | "name">): FeeRowKey | "none" {
  return line.letterRow ?? guessLetterRow(line.name);
}

/** The fee for the letter's table: the first year's fee. */
export function yearlyPence(line: Pick<EngagementLine, "billing" | "pricePence">): number {
  return line.billing === "monthly" ? line.pricePence * 12 : line.pricePence;
}

export interface PlannedLetter {
  kind: LetterKind;
  party: string;
  title: string;
  input: LetterInput;
}

type ClientPart = Engagement["client"];

/** Which letters the client gets, what goes in each, and any services no letter covers. */
export function planLetters(client: ClientPart, lines: Pick<EngagementLine, "letterRow" | "name" | "billing" | "pricePence">[], date = today()) {
  const kinds = letterKindsFor(client.type);
  const d: LetterDetails = client.letterDetails || { dearName: client.name.split(/\s+/)[0] || client.name };
  const fees: Partial<Record<LetterKind, Partial<Record<FeeRowKey, number>>>> = {};
  const notCovered: string[] = [];
  for (const line of lines) {
    const row = rowFor(line);
    if (row === "none") continue;
    const kind = kinds.find((k) => FEE_ROWS_FOR[k].includes(row));
    if (!kind) {
      notCovered.push(line.name);
      continue;
    }
    const table = (fees[kind] ||= {});
    table[row] = (table[row] || 0) + yearlyPence(line);
  }

  const letters: PlannedLetter[] = kinds.map((kind) => {
    const base = { date, dearName: d.dearName, fees: fees[kind] || {} };
    if (kind === "company") {
      const party = client.companyName || client.name;
      return {
        kind,
        party,
        title: `Engagement letter: ${party}`,
        input: {
          ...base,
          kind,
          addressLines: d.companyAddress?.length ? d.companyAddress : undefined,
          periodEnd: d.yearEnd ? ukDate(d.yearEnd) : undefined,
          vatFirstPeriodEnd: d.vatFirstPeriodEnd ? ukDate(d.vatFirstPeriodEnd) : undefined,
          personalServiceCompany: Boolean(d.personalServiceCompany),
          group: Boolean(d.group),
        },
      };
    }
    if (kind === "partnership") {
      const party = client.companyName || client.name;
      return {
        kind,
        party,
        title: `Engagement letter: ${party}`,
        input: { ...base, kind, periodEnd: d.partnershipPeriodEnd ? ukDate(d.partnershipPeriodEnd) : undefined },
      };
    }
    const party = client.name;
    const address = d.saAddress?.length ? [d.saFullName || client.name, ...d.saAddress] : undefined;
    return {
      kind,
      party,
      title: `Engagement letter: ${party} (Self Assessment)`,
      input: {
        ...base,
        kind,
        addressLines: address,
        mtd: Boolean(d.mtd),
        mtdFirstPeriodEnd: d.mtd && d.mtdFirstPeriodEnd ? ukDate(d.mtdFirstPeriodEnd) : undefined,
      },
    };
  });
  return { letters, notCovered };
}

// ---------------------------------------------------------------- making the PDF

const run = promisify(execFile);

/** Local test builds only: LibreOffice stands in for Google Docs. Never used on Vercel. */
function libreOfficePath(): string | null {
  if (process.env.VERCEL) return null;
  for (const p of ["/usr/bin/soffice", "/usr/local/bin/soffice", "/Applications/LibreOffice.app/Contents/MacOS/soffice"]) {
    if (existsSync(p)) return p;
  }
  return null;
}

async function libreOfficePdf(docx: Uint8Array): Promise<Uint8Array> {
  const soffice = libreOfficePath();
  if (!soffice) throw new Error("LibreOffice is not installed");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "letter-"));
  try {
    await fs.writeFile(path.join(dir, "letter.docx"), docx);
    await run(soffice, [`-env:UserInstallation=file://${dir}/profile`, "--headless", "--convert-to", "pdf", "--outdir", dir, path.join(dir, "letter.docx")], {
      timeout: 120_000,
    });
    return new Uint8Array(await fs.readFile(path.join(dir, "letter.pdf")));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

export type LetterMode = { mode: "real" } | { mode: "placeholder" | "blocked"; reason: string } | { mode: "none" };

/**
 * Whether this client gets the real letters. Test builds fall back to the older built-in letter
 * until the templates are uploaded and Google Drive is connected. The live site never does.
 */
export async function letterMode(type: ClientType): Promise<LetterMode> {
  const kinds = letterKindsFor(type);
  if (!kinds.length) return { mode: "none" };
  const meta = await templateMeta();
  const missing = kinds.filter((k) => !meta[k]);
  const canRender = isDriveConfigured() || Boolean(libreOfficePath());
  if (!missing.length && canRender) return { mode: "real" };
  const reason = missing.length
    ? `Upload the ${missing.map((k) => LETTER_KIND_LABEL[k]).join(" and ")} letter template${missing.length > 1 ? "s" : ""} in Settings.`
    : "Connect Google Drive, which turns the letters into PDFs.";
  // The live site never sends the older built-in letter for a new link.
  if (isProduction()) return { mode: "blocked", reason };
  return { mode: "placeholder", reason };
}

/** A line for the New client screen when the letters aren't fully set up. */
export async function letterSetupNote(): Promise<string | undefined> {
  const meta = await templateMeta();
  const missing = (["company", "sa", "partnership"] as LetterKind[]).filter((k) => !meta[k]);
  const canRender = isDriveConfigured() || Boolean(libreOfficePath());
  if (!missing.length && canRender) return undefined;
  const todo = [
    missing.length ? `upload the ${missing.map((k) => LETTER_KIND_LABEL[k]).join(", ")} template${missing.length > 1 ? "s" : ""} in Settings` : "",
    canRender ? "" : "connect Google Drive",
  ]
    .filter(Boolean)
    .join(" and ");
  return isProduction()
    ? `Links that need a letter can't be sent until you ${todo}.`
    : `Test build: links use the older sample letter until you ${todo}.`;
}

export class LetterError extends Error {}

/**
 * Fills, saves and renders each letter. Edits pass the letters issued before, so each
 * Google Doc is updated in place rather than duplicated.
 */
export async function issueLetters(input: {
  engagementId: string;
  client: ClientPart;
  lines: EngagementLine[];
  by: string;
  previous?: IssuedLetter[];
}): Promise<IssuedLetter[]> {
  const { letters } = planLetters(input.client, input.lines);
  const useDrive = isDriveConfigured();
  const out: IssuedLetter[] = [];
  for (const plan of letters) {
    const template = await readTemplate(plan.kind);
    if (!template) throw new LetterError(`Upload the ${LETTER_KIND_LABEL[plan.kind]} letter template in Settings first.`);
    let docx: Buffer;
    try {
      docx = await fillLetter(template, plan.input);
    } catch (error) {
      throw new LetterError(error instanceof Error ? error.message : "Could not fill in the letter.");
    }

    const before = input.previous?.find((l) => l.kind === plan.kind && !l.signature);
    let pdf: Uint8Array;
    let drive: IssuedLetter["drive"];
    let renderedBy: IssuedLetter["renderedBy"];
    if (useDrive) {
      try {
        const folderId = before?.party === plan.party && before.drive?.folderId ? before.drive.folderId : await findOrCreateClientFolder(plan.party);
        const docFileId = await saveLetterDoc({
          folderId,
          name: `Engagement letter - ${plan.party} - ${plan.input.date}`,
          docx,
          existingDocId: before?.party === plan.party ? before.drive?.docFileId : undefined,
        });
        pdf = await exportPdf(docFileId);
        drive = { folderId, docFileId };
        renderedBy = "google";
      } catch (error) {
        console.error("[letters] Google Drive failed", error);
        throw new LetterError("Google Drive didn't respond, so the letter couldn't be made. Please try again in a minute.");
      }
    } else {
      pdf = await libreOfficePdf(docx);
      renderedBy = "libreoffice";
    }

    const tag = crypto.randomBytes(6).toString("hex");
    const docxPath = `engagement-files/${input.engagementId}/letter-${plan.kind}-${tag}.docx`;
    const pdfPath = `engagement-files/${input.engagementId}/letter-${plan.kind}-${tag}.pdf`;
    await putFile(docxPath, docx, { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", overwrite: true });
    await putFile(pdfPath, Buffer.from(pdf), { contentType: "application/pdf", overwrite: true });

    out.push({
      kind: plan.kind,
      party: plan.party,
      title: plan.title,
      input: plan.input,
      docxPath,
      pdfPath,
      pages: await pageCount(pdf),
      fingerprint: crypto.createHash("sha256").update(pdf).digest("hex"),
      issuedAt: new Date().toISOString(),
      issuedBy: input.by,
      renderedBy,
      drive,
    });
  }
  return out;
}

export async function readLetterPdf(letter: IssuedLetter, signed: boolean): Promise<Buffer | null> {
  const p = signed ? letter.signature?.pdfPath : letter.pdfPath;
  return p ? readBytes(p) : null;
}
