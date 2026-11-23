import JSZip from "jszip";
import { FEE_ROWS_FOR } from "./types";

/**
 * Fills Figures' Word engagement letter templates, following Josh's rules (confirmed 19-20 Nov 2026):
 * only the date, address, "Dear", period end, the VAT / MTD first-period sentence and the fee table
 * are changed, whole schedule Parts and optional sections are removed when not needed, highlighting
 * is removed, and page breaks put each form and each Part on its own page.
 *
 * No other wording is ever changed: the ICAS legal wording must stay exactly as written.
 */

export type LetterKind = "company" | "sa" | "partnership";

/** Fee table rows. Bookkeeping is added as an extra row when provided. */
export type FeeRowKey = "accounts_ct" | "vat" | "payroll" | "sa" | "partnership" | "bookkeeping";

export { FEE_ROWS_FOR };

export const FEE_ROW_LABEL: Record<FeeRowKey, string> = {
  accounts_ct: "Accounts and Corporation Tax (Schedule 2B & 2J)",
  vat: "VAT returns (Schedule 2M)",
  payroll: "Payroll (Schedule 2K)",
  sa: "Self Assessment (Schedule 2F)",
  partnership: "Partnership tax return (Schedule 2H)",
  bookkeeping: "Bookkeeping (extra row)",
};

export interface LetterInput {
  kind: LetterKind;
  /** e.g. "23 November 2026" */
  date: string;
  dearName: string;
  /** Company: the CLIENT ADDRESS block. Self Assessment: added under the heading when known. */
  addressLines?: string[];
  /** Company and partnership clause 4.2.1. */
  periodEnd?: string;
  /** Company VAT clause 1.2.1. Left out: that one sentence is removed. */
  vatFirstPeriodEnd?: string;
  /** Self Assessment: include Part 2FA (MTD for Income Tax). */
  mtd?: boolean;
  /** Self Assessment Part 2FA clause 1.2.1. Left out: that one sentence is removed. */
  mtdFirstPeriodEnd?: string;
  /** Company: keep the personal service company section (Part 2J 1.5). */
  personalServiceCompany?: boolean;
  /** Company: keep the groups and consortia section (Part 2J 1.6). */
  group?: boolean;
  /** Annual fee for each row, in pence. Rows not listed are removed. */
  fees: Partial<Record<FeeRowKey, number>>;
}

// ------------------------------------------------------------------ xml helpers

const decode = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const encode = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const T_RE = /<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:t(\s[^>]*)?\/>/g;

export function textOf(xml: string): string {
  let out = "";
  for (const m of xml.matchAll(T_RE)) out += decode(m[2] ?? "");
  return out;
}

/** Splits <w:body> into its top-level paragraphs and tables. */
function splitBody(xml: string): { head: string; els: string[]; tail: string } {
  const start = xml.indexOf("<w:body>") + "<w:body>".length;
  const end = xml.indexOf("</w:body>");
  const body = xml.slice(start, end);
  const els: string[] = [];
  const tag = /<(\/?)(w:p|w:tbl|w:sdt)\b[^>]*?(\/?)>/g;
  let depth = 0;
  let from = 0;
  let last = 0;
  for (const m of body.matchAll(tag)) {
    const closing = m[1] === "/";
    const selfClosing = m[3] === "/";
    const at = m.index ?? 0;
    if (depth === 0 && !closing) {
      if (selfClosing) {
        els.push(body.slice(at, at + m[0].length));
        last = at + m[0].length;
        continue;
      }
      from = at;
      depth = 1;
      continue;
    }
    if (depth > 0 && !selfClosing) {
      depth += closing ? -1 : 1;
      if (depth === 0) {
        els.push(body.slice(from, at + m[0].length));
        last = at + m[0].length;
      }
    }
  }
  return { head: xml.slice(0, start), els, tail: body.slice(last) + xml.slice(end) };
}

/**
 * Replaces `find` with `replacement` inside one element, even when Word has split the words across
 * several runs. The replacement goes where the match starts, so it keeps that run's formatting.
 */
function replaceText(xml: string, find: string, replacement: string): string | null {
  const nodes = [...xml.matchAll(T_RE)].map((m) => ({
    start: m.index ?? 0,
    end: (m.index ?? 0) + m[0].length,
    attrs: m[1] ?? m[3] ?? "",
    text: decode(m[2] ?? ""),
  }));
  const joined = nodes.map((n) => n.text).join("");
  const at = joined.indexOf(find);
  if (at === -1) return null;
  const stop = at + find.length;

  let offset = 0;
  const texts = nodes.map((n) => {
    const nStart = offset;
    const nEnd = offset + n.text.length;
    offset = nEnd;
    if (nEnd <= at || nStart >= stop) return n.text;
    const before = at > nStart ? n.text.slice(0, at - nStart) : "";
    const after = stop < nEnd ? n.text.slice(stop - nStart) : "";
    const startsHere = at >= nStart && at < nEnd;
    return before + (startsHere ? replacement : "") + after;
  });
  // Edge case: the match starts at the very end of a run (empty run text); put it in the first touched run.
  let out = "";
  let cursor = 0;
  nodes.forEach((n, i) => {
    out += xml.slice(cursor, n.start);
    const attrs = /xml:space=/.test(n.attrs) ? n.attrs : `${n.attrs} xml:space="preserve"`;
    out += `<w:t${attrs}>${encode(texts[i])}</w:t>`;
    cursor = n.end;
  });
  return out + xml.slice(cursor);
}

/** Sets a whole table cell's text, keeping its formatting. */
function setCellText(tc: string, text: string, runProps: string): string {
  if (T_RE.test(tc)) {
    T_RE.lastIndex = 0;
    let first = true;
    return tc.replace(T_RE, (_m, a1, _t, a3) => {
      const attrs = a1 ?? a3 ?? "";
      const value = first ? text : "";
      first = false;
      return `<w:t${/xml:space=/.test(attrs) ? attrs : `${attrs} xml:space="preserve"`}>${encode(value)}</w:t>`;
    });
  }
  T_RE.lastIndex = 0;
  if (!text) return tc;
  const close = tc.lastIndexOf("</w:p>");
  if (close === -1) return tc;
  return `${tc.slice(0, close)}<w:r>${runProps}<w:t xml:space="preserve">${encode(text)}</w:t></w:r>${tc.slice(close)}`;
}

function cells(tr: string): string[] {
  return [...tr.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((m) => m[0]);
}

function rows(tbl: string): string[] {
  return [...tbl.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((m) => m[0]);
}

function isEmptyParagraph(el: string): boolean {
  return el.startsWith("<w:p") && !textOf(el).trim() && !/<w:(drawing|pict|object|sectPr)\b|w:type="page"/.test(el);
}

function withPageBreakBefore(p: string): string {
  if (/w:type="page"/.test(p)) return p;
  const pPrEnd = p.indexOf("</w:pPr>");
  const at = pPrEnd !== -1 ? pPrEnd + "</w:pPr>".length : p.indexOf(">") + 1;
  return `${p.slice(0, at)}<w:r><w:br w:type="page"/></w:r>${p.slice(at)}`;
}

/** Keeps a paragraph on the same page as the next one (layout only; no wording changes). */
function withKeepNext(p: string): string {
  if (!p.startsWith("<w:p") || /<w:keepNext\b/.test(p)) return p;
  if (/<w:pPr>/.test(p)) {
    const style = p.match(/<w:pPr>\s*<w:pStyle\b[^>]*\/>/);
    if (style) return p.replace(style[0], `${style[0]}<w:keepNext/>`);
    return p.replace("<w:pPr>", "<w:pPr><w:keepNext/>");
  }
  const open = p.indexOf(">") + 1;
  return `${p.slice(0, open)}<w:pPr><w:keepNext/></w:pPr>${p.slice(open)}`;
}

/** First run properties in an element, so new text matches the surrounding style. */
function firstRunProps(xml: string): string {
  return xml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0]?.replace(/<w:highlight[^>]*\/>/g, "") ?? "";
}

/** "PART 2 M-B – VAT…" gives "2M-B". */
function partCode(el: string): string | null {
  if (!el.startsWith("<w:p")) return null;
  const m = textOf(el).trim().match(/^part\s*2\s*([a-z]{1,2}(?:\s*-\s*[a-z])?)\s*[–—-]/i);
  return m ? `2${m[1].replace(/\s+/g, "").toUpperCase()}` : null;
}

export function formatFee(pence: number): string {
  const pounds = pence / 100;
  return pounds.toLocaleString("en-GB", { minimumFractionDigits: pence % 100 ? 2 : 0, maximumFractionDigits: 2 });
}

// ------------------------------------------------------------------ reading a template

export interface TemplateCheck {
  ok: boolean;
  found: string[];
  missing: string[];
}

const ROW_MATCH: Record<Exclude<FeeRowKey, "bookkeeping">, RegExp> = {
  accounts_ct: /Schedule\s*2B/i,
  vat: /Schedule\s*2M/i,
  payroll: /Schedule\s*2K/i,
  sa: /Schedule\s*2F/i,
  partnership: /Schedule\s*2H/i,
};

const REQUIRED_PARTS: Record<LetterKind, string[]> = {
  company: ["2B", "2J", "2M-B", "2KA"],
  sa: ["2F", "2FA"],
  partnership: ["2D", "2H"],
};

/** Checks an uploaded template has every part the filler relies on, so a changed template fails loudly. */
export async function checkTemplate(kind: LetterKind, docx: Uint8Array): Promise<TemplateCheck> {
  const found: string[] = [];
  const missing: string[] = [];
  let xml: string;
  try {
    const zip = await JSZip.loadAsync(docx);
    xml = (await zip.file("word/document.xml")?.async("string")) || "";
  } catch {
    return { ok: false, found, missing: ["A readable Word (.docx) file"] };
  }
  if (!xml) return { ok: false, found, missing: ["word/document.xml"] };
  const { els } = splitBody(xml);
  const texts = els.map(textOf);
  const has = (label: string, test: boolean) => (test ? found : missing).push(label);

  has("Date", texts.slice(0, 25).some((t) => DATE_RE.test(t.trim())));
  has('"Dear ,"', texts.some((t) => /^\s*Dear\s*,/.test(t)));
  if (kind === "company") has("CLIENT ADDRESS", texts.some((t) => t.trim() === "CLIENT ADDRESS"));
  if (kind !== "sa") has("4.2.1 period end", texts.some((t) => /4\.2\.1[\s\S]*INSERT DATE/i.test(t)));
  if (kind === "company") has("VAT 1.2.1 first return sentence", texts.some((t) => t.includes(VAT_SENTENCE)));
  if (kind === "sa") has("MTD 1.2.1 first update sentence", texts.some((t) => t.includes(MTD_SENTENCE)));
  const table = els.find((e) => e.startsWith("<w:tbl"));
  has("Fee table", Boolean(table));
  if (table) {
    const rowTexts = rows(table).map(textOf);
    for (const key of FEE_ROWS_FOR[kind].filter((k) => k !== "bookkeeping") as Exclude<FeeRowKey, "bookkeeping">[]) {
      has(`Fee row ${FEE_ROW_LABEL[key]}`, rowTexts.some((t) => ROW_MATCH[key].test(t)));
    }
    has("Fee row Total", rowTexts.some((t) => /^\s*Total/i.test(t)));
  }
  has("APPOINTMENT ACCEPTANCE", texts.some((t) => t.trim().startsWith("APPOINTMENT ACCEPTANCE")));
  has("CANCELLATION FORM", texts.some((t) => t.trim().startsWith("CANCELLATION FORM")));
  const parts = els.map(partCode).filter(Boolean);
  for (const code of REQUIRED_PARTS[kind]) has(`Part ${code}`, parts.includes(code));
  if (kind === "company") {
    has("Personal service company section", texts.some((t) => t.trim().startsWith(PSC_NOTE)));
    has("Groups and consortia section", texts.some((t) => t.trim().startsWith(GROUP_NOTE)));
  }
  return { ok: missing.length === 0, found, missing };
}

const DATE_RE = /^\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/;
const VAT_SENTENCE = "The first such return to be prepared by us will be the return for the period ending insert date.";
const MTD_SENTENCE =
  "The first such quarterly update to be prepared by us will be the quarterly update for the period ending insert date.";
const PSC_NOTE = "If the client is a personal service company";
const GROUP_NOTE = "If the client is a group of companies";

// ------------------------------------------------------------------ filling

export async function fillLetter(template: Uint8Array, input: LetterInput): Promise<Buffer> {
  const zip = await JSZip.loadAsync(template);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("The letter template is not a Word document.");
  const xml = await file.async("string");
  const { head, tail } = splitBody(xml);
  let els = splitBody(xml).els;
  const fail = (what: string) => {
    throw new Error(`The ${input.kind} letter template has changed: could not find ${what}. Upload it again in Settings.`);
  };

  // Date (top right)
  const dateAt = els.slice(0, 25).findIndex((e) => DATE_RE.test(textOf(e).trim()));
  if (dateAt === -1) fail("the date");
  els[dateAt] = replaceText(els[dateAt], textOf(els[dateAt]).trim(), input.date) ?? els[dateAt];

  // "Dear [first name],"
  const dearAt = els.findIndex((e) => /^\s*Dear\s*,/.test(textOf(e)));
  if (dearAt === -1) fail('"Dear ,"');
  els[dearAt] =
    replaceText(els[dearAt], "Dear ,", `Dear ${input.dearName},`) ??
    replaceText(els[dearAt], "Dear,", `Dear ${input.dearName},`) ??
    els[dearAt];

  // Address
  const lines = (input.addressLines || []).map((l) => l.trim()).filter(Boolean);
  const addressXml = (p: string) => {
    const props = firstRunProps(p);
    const body = lines.map((l) => `<w:r>${props}<w:t xml:space="preserve">${encode(l)}</w:t></w:r>`).join(`<w:r>${props}<w:br/></w:r>`);
    const pPr = p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
    return `<w:p>${pPr}${body}</w:p>`;
  };
  if (input.kind === "company") {
    const at = els.findIndex((e) => textOf(e).trim() === "CLIENT ADDRESS");
    if (at === -1) fail("CLIENT ADDRESS");
    if (lines.length) els[at] = addressXml(els[at]);
    else els.splice(at, 1);
  } else if (input.kind === "sa" && lines.length) {
    // Under the "Engagement Letter" heading, above "Dear", one line per part.
    const headingAt = els.findIndex((e) => textOf(e).trim() === "Engagement Letter");
    const at = headingAt !== -1 && headingAt < dearAt ? headingAt + 1 : dearAt;
    els.splice(at, 0, addressXml(els[dearAt]), `<w:p>${els[dearAt].match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? ""}</w:p>`);
  }

  // 4.2.1 period end
  if (input.kind !== "sa") {
    const at = els.findIndex((e) => /4\.2\.1/.test(textOf(e)) && /INSERT DATE/i.test(textOf(e)));
    if (at === -1) fail("clause 4.2.1");
    if (!input.periodEnd) throw new Error("The period end date (clause 4.2.1) is needed for this letter.");
    els[at] =
      replaceText(els[at], "[INSERT DATE]", input.periodEnd) ?? replaceText(els[at], "INSERT DATE", input.periodEnd) ?? els[at];
  }

  // VAT / MTD first period sentence: fill it, or delete only that sentence.
  const firstSentence = (sentence: string, date?: string) => {
    const at = els.findIndex((e) => textOf(e).includes(sentence));
    if (at === -1) return;
    const filled = date ? sentence.replace("insert date", date) : "";
    els[at] =
      (date ? replaceText(els[at], sentence, filled) : replaceText(els[at], ` ${sentence}`, "") ?? replaceText(els[at], sentence, "")) ??
      els[at];
  };
  if (input.kind === "company") firstSentence(VAT_SENTENCE, input.vatFirstPeriodEnd);
  if (input.kind === "sa") firstSentence(MTD_SENTENCE, input.mtdFirstPeriodEnd);

  // Fee table
  const tableAt = els.findIndex((e) => e.startsWith("<w:tbl"));
  if (tableAt === -1) fail("the fee table");
  els[tableAt] = fillFeeTable(els[tableAt], input);

  // Optional sections and Parts
  const remove = new Set<number>();
  const removeRange = (from: number, to: number) => {
    for (let i = from; i < to; i++) remove.add(i);
  };
  const parts = els.map((e, i) => ({ code: partCode(e), i })).filter((p) => p.code) as { code: string; i: number }[];
  const partRange = (code: string): [number, number] | null => {
    const idx = parts.findIndex((p) => p.code === code);
    if (idx === -1) return null;
    return [parts[idx].i, parts[idx + 1]?.i ?? els.length];
  };
  const dropPart = (code: string) => {
    const r = partRange(code);
    if (r) removeRange(r[0], r[1]);
  };
  const fee = (k: FeeRowKey) => typeof input.fees[k] === "number";
  if (input.kind === "company") {
    if (!fee("accounts_ct")) {
      dropPart("2B");
      dropPart("2J");
    }
    if (!fee("vat")) dropPart("2M-B");
    if (!fee("payroll")) dropPart("2KA");
    const pscAt = els.findIndex((e) => textOf(e).trim().startsWith(PSC_NOTE));
    const groupAt = els.findIndex((e) => textOf(e).trim().startsWith(GROUP_NOTE));
    if (pscAt !== -1 && groupAt > pscAt && !input.personalServiceCompany) removeRange(pscAt, groupAt);
    if (groupAt !== -1 && !input.group) {
      const r = partRange("2J");
      const end = els.findIndex((e, i) => i > groupAt && /^\s*1\.7\.?\s/.test(textOf(e)));
      removeRange(groupAt, end !== -1 ? end : r ? r[1] : groupAt + 1);
    }
  }
  if (input.kind === "sa" && !input.mtd) dropPart("2FA");
  els = els.filter((_e, i) => !remove.has(i));

  // Keep the sign-off ("Yours sincerely" down to "Figures") together on one page.
  const signOffAt = els.findIndex((e) => textOf(e).trim() === "Yours sincerely");
  if (signOffAt !== -1) {
    for (let i = signOffAt; i < Math.min(els.length, signOffAt + 6); i++) {
      if (textOf(els[i]).trim() === "Figures") break;
      els[i] = withKeepNext(els[i]);
    }
  }

  // Layout: each form and each Part starts on a new page, with the spacer lines before it removed.
  const isBreakTarget = (e: string) => {
    const t = textOf(e).trim();
    return t.startsWith("APPOINTMENT ACCEPTANCE") || t.startsWith("CANCELLATION FORM") || Boolean(partCode(e));
  };
  const out: string[] = [];
  for (const e of els) {
    if (isBreakTarget(e)) {
      while (out.length && isEmptyParagraph(out[out.length - 1])) out.pop();
      out.push(withPageBreakBefore(e));
    } else out.push(e);
  }
  while (out.length && isEmptyParagraph(out[out.length - 1])) out.pop();

  // No highlighting anywhere.
  const finished = (head + out.join("") + tail).replace(/<w:highlight\b[^>]*\/>/g, "");
  zip.file("word/document.xml", finished);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

function fillFeeTable(tbl: string, input: LetterInput): string {
  const all = rows(tbl);
  const keyOf = (tr: string): FeeRowKey | "total" | null => {
    const t = textOf(tr);
    if (/^\s*Total/i.test(t)) return "total";
    for (const [key, re] of Object.entries(ROW_MATCH) as [FeeRowKey, RegExp][]) if (re.test(t)) return key;
    return null;
  };
  const allowed = FEE_ROWS_FOR[input.kind];
  let total = 0;
  let serviceTemplate: string | null = null;
  let out = tbl;
  for (const tr of all) {
    const key = keyOf(tr);
    if (!key) continue;
    if (key === "total") continue;
    serviceTemplate = serviceTemplate ?? tr;
    const amount = input.fees[key];
    if (!allowed.includes(key) || typeof amount !== "number") {
      out = out.replace(tr, "");
      continue;
    }
    total += amount;
    let row = tr;
    // Self Assessment without MTD: drop the MTD reference from the row.
    if (key === "sa" && !input.mtd) {
      row = replaceText(row, "Schedule 2F & 2J", "Schedule 2F") ?? row;
      row = replaceText(row, "Personal Tax Return & Making Tax Digital", "Personal Tax Return") ?? row;
    }
    out = out.replace(tr, setAmount(row, amount));
  }
  // Bookkeeping, when provided, is its own row above the total.
  const bookkeeping = input.fees.bookkeeping;
  const totalRow = all.find((tr) => keyOf(tr) === "total");
  if (typeof bookkeeping === "number" && serviceTemplate && totalRow) {
    total += bookkeeping;
    const tcs = cells(serviceTemplate);
    const props = firstRunProps(serviceTemplate);
    let row = serviceTemplate;
    if (tcs.length >= 3) {
      row = row.replace(tcs[0], setCellText(tcs[0], "", props));
      row = row.replace(tcs[1], setCellText(tcs[1], "Bookkeeping", props));
    }
    out = out.replace(totalRow, setAmount(row, bookkeeping) + totalRow);
  }
  if (totalRow) out = out.replace(totalRow, setAmount(totalRow, total));
  return out;
}

function setAmount(tr: string, pence: number): string {
  const tcs = cells(tr);
  const last = tcs[tcs.length - 1];
  if (!last) return tr;
  const props = firstRunProps(tcs[tcs.length - 2] || tr);
  return tr.replace(last, setCellText(last, formatFee(pence), props));
}
