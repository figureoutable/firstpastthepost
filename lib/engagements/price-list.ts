import crypto from "crypto";
import { putJson, readJson } from "@/lib/private-blob";
import { FEE_ROW_LABEL, type FeeRowKey } from "./letter-docx";
import { guessLetterRow } from "./letters";
import type { Billing, PriceListItem } from "./types";

const PATH = "settings/price-list.json";

/**
 * Example prices so the screens can be tested. Josh replaces these in
 * Settings > Price list (no code change needed).
 */
const EXAMPLES: Omit<PriceListItem, "id">[] = [
  { name: "Self Assessment tax return", description: "Preparing and filing your personal tax return.", billing: "annual", pricePence: 30000, active: true, letterRow: "sa" },
  { name: "Partnership tax return", description: "Preparing and filing the partnership return.", billing: "annual", pricePence: 50000, active: true, letterRow: "partnership" },
  { name: "Company accounts and corporation tax", description: "Year end accounts, CT600 and filing with Companies House and HMRC.", billing: "monthly", pricePence: 12500, active: true, letterRow: "accounts_ct" },
  { name: "Bookkeeping", description: "Keeping your records up to date in Xero.", billing: "monthly", pricePence: 7500, active: true, letterRow: "bookkeeping" },
  { name: "VAT returns", description: "Quarterly VAT returns under Making Tax Digital.", billing: "monthly", pricePence: 5000, active: true, letterRow: "vat" },
  { name: "Payroll", description: "Monthly payroll and RTI submissions.", billing: "monthly", pricePence: 4000, active: true, letterRow: "payroll" },
  { name: "Confirmation statement", description: "Annual confirmation statement with Companies House.", billing: "annual", pricePence: 6000, active: true, letterRow: "none" },
];

export type PriceList = { items: PriceListItem[]; examples: boolean; updatedAt?: string; updatedBy?: string };

export async function getPriceList(): Promise<PriceList> {
  const saved = await readJson<PriceList>(PATH);
  if (saved?.items?.length) {
    // Lists saved before fee rows existed get a best guess, shown in Settings to check.
    const items = saved.items.map((i) => ({ ...i, letterRow: i.letterRow ?? guessLetterRow(i.name) }));
    return { ...saved, items, examples: Boolean(saved.examples) };
  }
  return {
    examples: true,
    items: EXAMPLES.map((item, i) => ({ ...item, id: `example-${i + 1}` })),
  };
}

const BILLINGS: Billing[] = ["monthly", "annual", "one_off"];
const ROWS = Object.keys(FEE_ROW_LABEL) as FeeRowKey[];

/** Cleans what the settings page sends. Throws a readable message if something is wrong. */
export function cleanPriceList(input: unknown): PriceListItem[] {
  if (!Array.isArray(input)) throw new Error("Price list must be a list.");
  if (input.length > 100) throw new Error("Price list is limited to 100 services.");
  return input.map((raw, i) => {
    const item = (raw || {}) as Record<string, unknown>;
    const name = String(item.name || "").trim().slice(0, 120);
    if (!name) throw new Error(`Service ${i + 1} needs a name.`);
    const billing = BILLINGS.includes(item.billing as Billing) ? (item.billing as Billing) : null;
    if (!billing) throw new Error(`Choose how "${name}" is billed.`);
    const price = Number(item.pricePence);
    if (!Number.isInteger(price) || price < 0 || price > 100_000_000) throw new Error(`Check the price for "${name}".`);
    const id = typeof item.id === "string" && /^[a-z0-9-]{3,60}$/.test(item.id) ? item.id : crypto.randomUUID();
    return {
      id,
      name,
      description: String(item.description || "").trim().slice(0, 400),
      billing,
      pricePence: price,
      active: item.active !== false,
      letterRow: ROWS.includes(item.letterRow as FeeRowKey) ? (item.letterRow as FeeRowKey) : "none",
    };
  });
}

export async function savePriceList(items: PriceListItem[], by: string): Promise<void> {
  await putJson(PATH, { items, examples: false, updatedAt: new Date().toISOString(), updatedBy: by });
}
