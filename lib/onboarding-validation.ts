/** Light cleanup helpers — prefer accepting odd client pastes over blocking progress. */

export function hasAnyText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Company number: keep letters/digits; allow shorter/longer odd values. */
export function normalizeCompanyNumber(value: string): string {
  return (value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 16);
}

/** Soft check only — used for hints, not gating. */
export function isValidCompanyNumber(value: string): boolean {
  const raw = normalizeCompanyNumber(value);
  if (!raw) return false;
  if (/^\d{1,8}$/.test(raw)) return true;
  if (/^[A-Z]{2}\d{6}$/.test(raw)) return true;
  // Accept any other alphanumeric CRN-like value clients may hold
  return raw.length >= 2;
}

export function normalizeAuthCode(value: string): string {
  return (value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12);
}

export function isValidAuthCode(value: string): boolean {
  const raw = normalizeAuthCode(value);
  return raw.length >= 4;
}

/** UTR: digits only; allow incomplete / odd lengths while typing. */
export function normalizeUtr(value: string): string {
  return (value || "").replace(/\D/g, "").slice(0, 14);
}

export function isValidUtr(value: string): boolean {
  const raw = normalizeUtr(value);
  return raw.length >= 8;
}

/**
 * NI number: strip spaces/punctuation.
 * Soft shape check only — do not gate Next on this.
 */
export function normalizeNi(value: string): string {
  return (value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 13);
}

export function isValidNi(value: string): boolean {
  const raw = normalizeNi(value);
  if (!raw) return false;
  if (/^[A-Z]{2}\d{6}[A-Z]$/.test(raw)) return true;
  return raw.length >= 5;
}

/**
 * VAT: strip GB prefix and spaces; keep digits.
 */
export function normalizeVatNumber(value: string): string {
  let v = (value || "").toUpperCase().replace(/\s+/g, "");
  if (v.startsWith("GB")) v = v.slice(2);
  return v.replace(/\D/g, "").slice(0, 14);
}

export function isValidVatNumber(value: string): boolean {
  const v = normalizeVatNumber(value);
  return v.length >= 5;
}

export function normalizeAccountsOfficeRef(value: string): string {
  return (value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 20);
}

export function isValidAccountsOfficeRef(value: string): boolean {
  return normalizeAccountsOfficeRef(value).length >= 5;
}

export function normalizePayeRef(value: string): string {
  return (value || "").toUpperCase().replace(/\s+/g, "").slice(0, 20);
}

export function isValidPayeRef(value: string): boolean {
  const v = normalizePayeRef(value);
  if (!v) return false;
  if (/^\d{3}\/[A-Z0-9]{1,10}$/.test(v)) return true;
  return v.length >= 3;
}

export function normalizePersonalCode(value: string): string {
  return (value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 20);
}

export function isValidPersonalCode(value: string): boolean {
  const raw = normalizePersonalCode(value);
  return raw.length === 0 || raw.length >= 6;
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
