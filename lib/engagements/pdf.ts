import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { LetterSnapshot } from "./types";
import { signatureLines } from "./letter";

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 56;
const TEXT = rgb(0.11, 0.1, 0.09);
const MUTED = rgb(0.47, 0.44, 0.42);
const RULE = rgb(0.9, 0.9, 0.89);

/** The built-in PDF fonts only cover Western European characters. Swap anything else for a safe fallback. */
function clean(text: string): string {
  return text
    .replace(/[‐-―]/g, "-")
    .replace(/[^\x20-\x7E -ÿ‘’“”•…€]/g, "?");
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of clean(text).split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const attempt = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(attempt, size) <= width) {
        line = attempt;
        continue;
      }
      if (line) lines.push(line);
      // Break words longer than a whole line (fingerprints, URLs).
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > width) {
        let cut = rest.length;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

export async function letterPdf(
  letter: LetterSnapshot,
  signature: { name: string; email: string; signedAt: string; ip: string; fingerprint: string },
  engagementId: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(clean(letter.title));
  doc.setAuthor("Figures");
  doc.setCreationDate(new Date(signature.signedAt));

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const width = A4.width - MARGIN * 2;

  let page: PDFPage = doc.addPage([A4.width, A4.height]);
  let y = A4.height - MARGIN;

  const ensure = (needed: number) => {
    if (y - needed < MARGIN + 24) {
      page = doc.addPage([A4.width, A4.height]);
      y = A4.height - MARGIN;
    }
  };

  const paragraph = (text: string, opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; gap?: number } = {}) => {
    const font = opts.font || regular;
    const size = opts.size || 10.5;
    const lineHeight = size * 1.45;
    for (const line of wrap(text, font, size, width)) {
      ensure(lineHeight);
      page.drawText(line, { x: MARGIN, y: y - size, size, font, color: opts.color || TEXT });
      y -= lineHeight;
    }
    y -= opts.gap ?? 6;
  };

  const rule = () => {
    ensure(10);
    page.drawLine({ start: { x: MARGIN, y }, end: { x: A4.width - MARGIN, y }, thickness: 0.7, color: RULE });
    y -= 8;
  };

  // Header
  page.drawText("Figures", { x: MARGIN, y: y - 16, size: 16, font: bold, color: rgb(0.88, 0.31, 0.04) });
  y -= 34;

  for (const block of letter.blocks) {
    switch (block.type) {
      case "h1":
        paragraph(block.text, { font: bold, size: 20, gap: 2 });
        break;
      case "h2":
        y -= 8;
        ensure(40);
        paragraph(block.text, { font: bold, size: 12.5, gap: 4 });
        break;
      case "small":
        paragraph(block.text, { size: 9.5, color: MUTED, gap: 14 });
        break;
      case "p":
        paragraph(block.text);
        break;
      case "list":
        for (const item of block.items) paragraph(`• ${item}`, { gap: 2 });
        y -= 4;
        break;
      case "fees": {
        const priceX = A4.width - MARGIN;
        const billedX = MARGIN + width * 0.62;
        const nameWidth = width * 0.6;
        ensure(24);
        page.drawText("Service", { x: MARGIN, y: y - 10, size: 9.5, font: bold, color: MUTED });
        page.drawText("Billed", { x: billedX, y: y - 10, size: 9.5, font: bold, color: MUTED });
        const feeLabelWidth = bold.widthOfTextAtSize("Fee", 9.5);
        page.drawText("Fee", { x: priceX - feeLabelWidth, y: y - 10, size: 9.5, font: bold, color: MUTED });
        y -= 16;
        rule();
        for (const row of block.rows) {
          const nameLines = wrap(row.name, regular, 10.5, nameWidth);
          const height = nameLines.length * 15 + 4;
          ensure(height);
          nameLines.forEach((line, i) => page.drawText(line, { x: MARGIN, y: y - 10.5 - i * 15, size: 10.5, font: regular, color: TEXT }));
          page.drawText(clean(row.billing), { x: billedX, y: y - 10.5, size: 10.5, font: regular, color: TEXT });
          const price = clean(row.price);
          page.drawText(price, { x: priceX - regular.widthOfTextAtSize(price, 10.5), y: y - 10.5, size: 10.5, font: regular, color: TEXT });
          y -= height;
          rule();
        }
        paragraph(`Total: ${block.totals.join(", ") || "Free"}`, { font: bold, gap: 8 });
        break;
      }
    }
  }

  // Signature
  y -= 12;
  ensure(170);
  rule();
  paragraph("Signature", { font: bold, size: 12.5, gap: 6 });
  paragraph(signature.name, { font: italic, size: 22, gap: 10 });
  for (const line of signatureLines(signature, engagementId)) paragraph(line, { size: 9, color: MUTED, gap: 1 });
  y -= 6;
  paragraph(
    "This letter was signed electronically. The fingerprint above is a unique code made from the exact wording of this letter, so any later change to the wording would not match it.",
    { size: 8.5, color: MUTED }
  );

  // Page numbers
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const label = `Page ${i + 1} of ${pages.length}  ·  Reference ${engagementId.slice(0, 8)}`;
    p.drawText(clean(label), { x: MARGIN, y: MARGIN - 24, size: 8, font: regular, color: MUTED });
  });

  return doc.save();
}
