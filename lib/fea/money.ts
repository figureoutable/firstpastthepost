/** Money helpers — integer minor units only (pence for GBP). */

export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100);
}

export function penceToPounds(pence: number): number {
  return pence / 100;
}

export function formatGbpFromPence(
  pence: number,
  maximumFractionDigits = 0
): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits,
  }).format(penceToPounds(pence));
}
