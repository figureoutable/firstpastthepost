import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { signatureLines } from "./letter";

/**
 * Makes the signed copy of an engagement letter: the exact PDF the client read, with
 * - their name, signature and the date written on the APPOINTMENT ACCEPTANCE form, and
 * - a signature record page added at the end.
 * Nothing else on the letter is touched.
 */

const TEXT = rgb(0.11, 0.1, 0.09);
const MUTED = rgb(0.42, 0.4, 0.38);
const INK = rgb(0.05, 0.16, 0.42);

export interface SignatureDetails {
  name: string;
  email: string;
  signedAt: string;
  ip: string;
  fingerprint: string;
  startNow: boolean;
}

function clean(text: string): string {
  return text.replace(/[‐-―]/g, "-").replace(/[^\x20-\x7E -ÿ‘’“”•…€]/g, "?");
}

export function ukDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
}

type Spot = { x: number; y: number; size: number };

/** Finds the acceptance form's Name, Signed and Date lines in the PDF. */
async function findAcceptance(bytes: Uint8Array): Promise<{ page: number; name?: Spot; signed?: Spot; date?: Spot } | null> {
  try {
    const { getDocumentProxy } = await import("unpdf");
    const doc = await getDocumentProxy(new Uint8Array(bytes));
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const items = content.items
        .map((i) => ("str" in i ? { str: i.str.trim(), x: i.transform[4], y: i.transform[5], size: Math.abs(i.transform[0]) || 11 } : null))
        .filter((i): i is { str: string; x: number; y: number; size: number } => Boolean(i && i.str));
      const heading = items.findIndex((i) => /^APPOINTMENT\s+ACCEPTANCE/i.test(i.str));
      if (heading === -1) continue;
      const after = items.slice(heading + 1);
      const find = (label: RegExp) => {
        const item = after.find((i) => label.test(i.str));
        return item ? { x: item.x, y: item.y, size: item.size } : undefined;
      };
      return { page: p - 1, name: find(/^Name\b/i), signed: find(/^Signed\b/i), date: find(/^Date\b/i) };
    }
  } catch (error) {
    console.error("[sign-pdf] Could not read the letter to find the acceptance form", error);
  }
  return null;
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of clean(text).split(/\s+/)) {
    const attempt = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(attempt, size) <= width) {
      line = attempt;
      continue;
    }
    if (line) lines.push(line);
    let rest = word;
    while (font.widthOfTextAtSize(rest, size) > width) {
      let cut = rest.length;
      while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    line = rest;
  }
  if (line) lines.push(line);
  return lines;
}

export async function signedLetterPdf(
  issued: Uint8Array,
  sig: SignatureDetails,
  letter: { title: string; reference: string }
): Promise<Uint8Array> {
  const spots = await findAcceptance(issued);
  const doc = await PDFDocument.load(issued);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  // 1. The acceptance form.
  if (spots) {
    const page = doc.getPage(spots.page);
    const after = (spot: Spot, label: string) => spot.x + regular.widthOfTextAtSize(label, spot.size) + 8;
    if (spots.name) {
      page.drawText(clean(sig.name), { x: after(spots.name, "Name"), y: spots.name.y + 2.5, size: spots.name.size, font: regular, color: INK });
    }
    if (spots.signed) {
      const x = after(spots.signed, "Signed.");
      page.drawText(clean(sig.name), { x, y: spots.signed.y + 2.5, size: spots.signed.size + 3, font: italic, color: INK });
      const nameWidth = italic.widthOfTextAtSize(clean(sig.name), spots.signed.size + 3);
      page.drawText("(signed electronically)", { x: x + nameWidth + 8, y: spots.signed.y + 3, size: 8, font: regular, color: MUTED });
    }
    if (spots.date) {
      page.drawText(ukDay(sig.signedAt), { x: after(spots.date, "Date"), y: spots.date.y + 2.5, size: spots.date.size, font: regular, color: INK });
      if (sig.startNow) {
        // Clause 5.4.1: "You may do this by ticking the box below your signature."
        const y = spots.date.y - 34;
        const x = spots.date.x;
        page.drawRectangle({ x, y: y - 1, width: 10, height: 10, borderColor: TEXT, borderWidth: 0.8 });
        page.drawLine({ start: { x: x + 2, y: y + 4 }, end: { x: x + 4.5, y: y + 1.2 }, thickness: 1.4, color: INK });
        page.drawLine({ start: { x: x + 4.5, y: y + 1.2 }, end: { x: x + 8.5, y: y + 8 }, thickness: 1.4, color: INK });
        page.drawText("Please start work before the 14-day cancellation period ends.", {
          x: x + 16,
          y,
          size: Math.min(spots.date.size, 10.5),
          font: regular,
          color: INK,
        });
      }
    }
  }

  // 2. The signature record page.
  const first = doc.getPage(0);
  const { width, height } = first.getSize();
  const margin = 64;
  const page: PDFPage = doc.addPage([width, height]);
  let y = height - margin;
  const line = (text: string, opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; gap?: number } = {}) => {
    const font = opts.font || regular;
    const size = opts.size || 10;
    for (const part of wrap(text, font, size, width - margin * 2)) {
      page.drawText(part, { x: margin, y: y - size, size, font, color: opts.color || TEXT });
      y -= size * 1.45;
    }
    y -= opts.gap ?? 4;
  };

  line("Signature record", { font: bold, size: 15, gap: 6 });
  line(letter.title, { color: MUTED, gap: 18 });
  line(sig.name, { font: italic, size: 22, color: INK, gap: 12 });
  for (const text of signatureLines(sig, letter.reference)) line(text, { size: 9.5, color: MUTED, gap: 1 });
  y -= 8;
  line(
    sig.startNow
      ? "Start of work: the client asked us to start before the 14-day cancellation period ends (clause 5.4.1)."
      : "Start of work: the client did not ask us to start before the 14-day cancellation period ends (clause 5.4.1).",
    { size: 9.5, gap: 12 }
  );
  line(
    "This letter was signed electronically. The client's name, signature and date were added to the Appointment Acceptance form when they signed. The fingerprint above is a unique code made from the exact PDF the client read before signing, so any change to that letter would not match it.",
    { size: 8.5, color: MUTED }
  );

  return doc.save();
}

export async function pageCount(pdf: Uint8Array): Promise<number> {
  try {
    return (await PDFDocument.load(pdf)).getPageCount();
  } catch {
    return 0;
  }
}
