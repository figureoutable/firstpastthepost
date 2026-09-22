/** Light cleanup helpers — prefer accepting odd client pastes over blocking progress. */

export function hasAnyText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Company number: strip spaces; keep letters/digits and common punctuation. */
export function normalizeCompanyNumber(value: string): string {
  return (value || "").replace(/\s+/g, "").toUpperCase().slice(0, 20);
}

/** Soft check only — used for hints, not gating. */
export function isValidCompanyNumber(value: string): boolean {
  return hasAnyText(normalizeCompanyNumber(value));
}

export function normalizeAuthCode(value: string): string {
  return (value || "").replace(/\s+/g, "").toUpperCase().slice(0, 20);
}

export function isValidAuthCode(value: string): boolean {
  return hasAnyText(normalizeAuthCode(value));
}

/** UTR / similar: keep printable characters; spaces stripped. */
export function normalizeUtr(value: string): string {
  return (value || "").replace(/\s+/g, "").toUpperCase().slice(0, 20);
}

export function isValidUtr(value: string): boolean {
  return hasAnyText(normalizeUtr(value));
}

/**
 * NI number: strip spaces only; keep letters/digits/odd characters clients may type.
 */
export function normalizeNi(value: string): string {
  return (value || "").replace(/\s+/g, "").toUpperCase().slice(0, 20);
}

export function isValidNi(value: string): boolean {
  return hasAnyText(normalizeNi(value));
}

/**
 * VAT: strip spaces; keep GB prefix or digits/letters as typed.
 */
export function normalizeVatNumber(value: string): string {
  return (value || "").replace(/\s+/g, "").toUpperCase().slice(0, 20);
}

export function isValidVatNumber(value: string): boolean {
  return hasAnyText(normalizeVatNumber(value));
}

export function normalizeAccountsOfficeRef(value: string): string {
  return (value || "").replace(/\s+/g, "").toUpperCase().slice(0, 20);
}

export function isValidAccountsOfficeRef(value: string): boolean {
  return hasAnyText(normalizeAccountsOfficeRef(value));
}

export function normalizePayeRef(value: string): string {
  return (value || "").replace(/\s+/g, "").toUpperCase().slice(0, 20);
}

export function isValidPayeRef(value: string): boolean {
  return hasAnyText(normalizePayeRef(value));
}

export function normalizePersonalCode(value: string): string {
  return (value || "").replace(/\s+/g, "").toUpperCase().slice(0, 20);
}

export function isValidPersonalCode(value: string): boolean {
  return hasAnyText(normalizePersonalCode(value));
}

/** True for a live File upload or a previously saved URL string. */
export function hasUpload(value: unknown): boolean {
  if (!value) return false;
  if (typeof File !== "undefined" && value instanceof File) return true;
  if (typeof value === "string") return value.trim().length > 0;
  return false;
}

/** Strip non-serializable / empty file placeholders before draft save. */
export function sanitizeDraftState<T extends Record<string, unknown>>(state: T): T {
  const next = { ...state };
  for (const key of ["photoId", "proofOfAddress"] as const) {
    const value = next[key];
    if (typeof File !== "undefined" && value instanceof File) {
      delete next[key];
    } else if (value && typeof value === "object" && !hasUpload(value)) {
      (next as Record<string, unknown>)[key] = null;
    }
  }
  return next;
}
