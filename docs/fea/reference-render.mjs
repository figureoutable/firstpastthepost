// Reference implementation of FEA generation: resolve -> validate -> render (two pass).
// Plain JS so it runs anywhere; port to TypeScript in the app.
// Usage: node reference-render.mjs fixtures.json fea-template.hbs out/
import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";

export const TEMPLATE_VERSION = "fea-1.0.0";

// ---------- 1. Resolve (inheritance) ----------
const OVERRIDABLE = [
  "valuationMechanism", "discountPercent", "valuationCap", "fixedValuation", "longstopValuation",
  "qualifyingRoundThreshold", "longstop", "conversionShareClass",
  "fullyDilutedIncludesOptionPool", "nomineeConversionEnabled",
];

const round2 = (n) => Math.round(n * 100) / 100;
const addMonths = (iso, m) => {
  const d = new Date(iso + "T00:00:00Z");
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + m);
  if (d.getUTCDate() < day) d.setUTCDate(0); // clamp e.g. 31 Aug + 6m -> 28/29 Feb
  return d.toISOString().slice(0, 10);
};

export function resolveAgreementContext({ company, raise, investor }) {
  const terms = { ...raise.defaultTerms };
  const overriddenFields = [];
  for (const k of OVERRIDABLE) {
    if (investor.overrides && investor.overrides[k] !== undefined && investor.overrides[k] !== null) {
      terms[k] = investor.overrides[k];
      overriddenFields.push(k);
    }
  }
  // Longstop valuation defaults: cap for cap mechanisms, fixed valuation for fixed.
  if (terms.longstopValuation == null) {
    terms.longstopValuation = terms.valuationMechanism === "FIXED_VALUATION" ? terms.fixedValuation : terms.valuationCap;
  }

  const sig = investor.signatures || {};
  const signed = [sig.investorSignedAt, sig.companySignedAt].filter(Boolean).sort();
  const agreementDate = signed.length === 2 ? signed[1] : null; // later of the two signatures

  let longstopDate = null;
  if (terms.longstop.type === "FIXED_DATE") longstopDate = terms.longstop.date;
  else if (agreementDate) longstopDate = addMonths(agreementDate, terms.longstop.months);

  const fmtDate = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const longstopText = longstopDate ? fmtDate(longstopDate) : `the date falling ${terms.longstop.months} months after the date of the agreement`;

  const c = investor.consideration || { type: "CASH" };
  let consideration = null;
  if (c.type !== "CASH") {
    const totalInSourceCurrency = round2(c.amountPerPeriod * c.periods.length);
    const fxApplied = c.currency !== raise.currency;
    const totalGbp = fxApplied ? round2(totalInSourceCurrency * c.fxRateToGbp) : totalInSourceCurrency;
    consideration = { totalInSourceCurrency, totalGbp, fxApplied };
  }

  let shareEstimate = null;
  if (terms.valuationMechanism === "FIXED_VALUATION" && raise.currentFullyDilutedShares) {
    const pricePerShare = terms.fixedValuation / raise.currentFullyDilutedShares;
    shareEstimate = { pricePerShare, shares: Math.floor(investor.investmentAmount / pricePerShare).toLocaleString("en-GB") };
  }

  const summaryLabel = { SERVICES_IN_LIEU: "unbilled fees for services", SALARY_SACRIFICE: "salary forgone" }[c.type];
  const docRef = `${investor.id}-${TEMPLATE_VERSION}`;
  return {
    company, raise, terms,
    investor: { ...investor, consideration: { ...c, summaryLabel } },
    signatures: sig,
    computed: {
      agreementDate, longstopDate, longstopText, consideration, shareEstimate, overriddenFields,
      hasInvestorSpecificTerms: c.type !== "CASH" || (investor.customTerms || []).length > 0,
      paymentReference: `FEA ${investor.name}`.slice(0, 18),
      templateVersion: TEMPLATE_VERSION,
      documentReference: docRef,
    },
  };
}

// ---------- 2. Validate ----------
export function validate(ctx) {
  const errors = [], warnings = [];
  const { terms: t, investor: inv, raise, computed: cp, company } = ctx;
  const req = (cond, msg) => { if (!cond) errors.push(msg); };

  req(inv.investmentAmount > 0, "Investment amount must be positive");
  const m = t.valuationMechanism;
  if (m === "DISCOUNT_AND_CAP" || m === "DISCOUNT_ONLY") req(t.discountPercent > 0 && t.discountPercent < 100, "Discount must be between 0 and 100");
  if (m === "DISCOUNT_AND_CAP" || m === "CAP_ONLY") req(t.valuationCap > 0, "Valuation cap required");
  if (m === "FIXED_VALUATION") req(t.fixedValuation > 0, "Fixed valuation required");
  req(t.longstopValuation > 0, "Longstop valuation required (mandatory for DISCOUNT_ONLY)");
  req(t.qualifyingRoundThreshold > 0, "Qualifying round threshold required");
  if (inv.type === "COMPANY") req(inv.signatory?.name, "Corporate investor needs a signatory");

  const c = inv.consideration;
  if (c.type !== "CASH") {
    req(c.periods?.length > 0 && c.amountPerPeriod > 0, "Non-cash consideration needs periods and amount per period");
    if (c.currency !== raise.currency) req(c.fxRateToGbp > 0, "FX rate (1 unit of source currency = x GBP) required");
    if (cp.consideration && Math.abs(cp.consideration.totalGbp - inv.investmentAmount) > 1)
      errors.push(`Investment amount ${inv.investmentAmount} does not match consideration total ${cp.consideration.totalGbp} (tolerance £1)`);
    if (c.type === "SALARY_SACRIFICE")
      warnings.push("Salary sacrifice for shares: consider PAYE/NIC on earnings forgone and employment-related securities reporting (Form 42 / ERS return).");
  } else {
    const b = company.bankDetails || {};
    req(b.accountName && b.sortCode && b.accountNumber, "Cash investment needs company bank details");
    if (b.iban && b.iban.startsWith("GB")) {
      const ibanSort = b.iban.slice(8, 14), ibanAcc = b.iban.slice(14, 22);
      if (ibanSort !== b.sortCode.replace(/-/g, "") || ibanAcc !== b.accountNumber)
        warnings.push("IBAN does not match sort code and account number");
    }
  }

  if (raise.taxRelief?.enabled) {
    if (c.type !== "CASH") errors.push(`${raise.taxRelief.scheme}: shares must be subscribed for in cash; non-cash consideration is incompatible`);
    if (t.longstop.type === "MONTHS_FROM_AGREEMENT" && t.longstop.months > 6) errors.push(`${raise.taxRelief.scheme}: longstop must be no more than 6 months after the agreement`);
    if (t.longstop.type === "FIXED_DATE" && cp.agreementDate && t.longstop.date > addMonths(cp.agreementDate, 6)) errors.push(`${raise.taxRelief.scheme}: longstop date is more than 6 months after the agreement date`);
    if (raise.mostFavouredNation) warnings.push("MFN clause may amount to a variation right; check against HMRC ASA guidance before using with S/EIS.");
    if ((inv.customTerms || []).length) warnings.push("Custom terms on an S/EIS agreement: check none create a refund, variation or preferential right.");
  }
  if (t.longstop.type === "FIXED_DATE" && cp.agreementDate && t.longstop.date <= cp.agreementDate) errors.push("Longstop date is on or before the agreement date");
  if (cp.overriddenFields.length) warnings.push(`Investor-specific economic terms differ from the raise: ${cp.overriddenFields.join(", ")}`);
  return { errors, warnings };
}

// ---------- 3. Render (two pass for numbering + cross refs) ----------
export function makeRenderer(templateSource) {
  const fmtMoney = (n, cur = "GBP", dp) => {
    if (n == null || isNaN(n)) return "[MISSING]";
    const digits = typeof dp === "number" ? dp : (Number.isInteger(n) ? 0 : 2);
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: cur, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
  };
  return function render(ctx) {
    let refs = {};
    const pass = (prevRefs) => {
      const hb = Handlebars.create();
      let clauseNo = 0, subNo = 0; const found = {};
      hb.registerHelper({
        clause(key, title, opts) { clauseNo += 1; subNo = 0; found[key] = `clause ${clauseNo}`; return `### ${clauseNo}. ${title}\n\n${opts.fn(this)}`; },
        sub(key, opts) { subNo += 1; found[key] = `clause ${clauseNo}.${subNo}`; return `**${clauseNo}.${subNo}** ${opts.fn(this).trim()}\n\n`; },
        ref(key) { return prevRefs[key] || "[REF]"; },
        money(n, a, b) { const cur = typeof a === "string" ? a : "GBP"; const dp = typeof a === "number" ? a : (typeof b === "number" ? b : undefined); return fmtMoney(n, cur, dp); },
        date(iso) { return iso ? new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "[DATE]"; },
        pct(n) { return `${n}%`; },
        eq: (a, b) => a === b, ne: (a, b) => a !== b,
        and: (...a) => a.slice(0, -1).every(Boolean), or: (...a) => a.slice(0, -1).some(Boolean), not: (a) => !a,
        join(list) { if (!list?.length) return ""; return list.length === 1 ? list[0] : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`; },
        concat: (...a) => a.slice(0, -1).join(""),
      });
      const out = hb.compile(templateSource, { noEscape: true, strict: false })(ctx);
      return { out, found };
    };
    const first = pass({});
    const second = pass(first.found);
    return second.out.replace(/\n{3,}/g, "\n\n").trim() + "\n";
  };
}

// ---------- CLI ----------
if (process.argv[1] && process.argv[1].endsWith("reference-render.mjs")) {
  const [fixturesPath, templatePath, outDir] = process.argv.slice(2);
  const fx = JSON.parse(fs.readFileSync(fixturesPath, "utf8"));
  const render = makeRenderer(fs.readFileSync(templatePath, "utf8"));
  fs.mkdirSync(outDir, { recursive: true });
  for (const investor of fx.investors) {
    const raise = fx.raises[investor.raiseId];
    const ctx = resolveAgreementContext({ company: fx.companies[raise.companyId], raise, investor });
    const { errors, warnings } = validate(ctx);
    console.log(`\n== ${investor.id}: ${errors.length} errors, ${warnings.length} warnings`);
    errors.forEach((e) => console.log("  ERROR  " + e));
    warnings.forEach((w) => console.log("  WARN   " + w));
    fs.writeFileSync(path.join(outDir, `${investor.id}.md`), render(ctx));
  }
}
