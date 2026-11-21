import crypto from "crypto";
import { appOrigin } from "@/lib/env";

/**
 * Signed, expiring links to view a client's uploaded document.
 * Only someone holding the link (from the internal email or the sheet) can open
 * the file, and the link stops working after LINK_LIFETIME_DAYS.
 */
export const LINK_LIFETIME_DAYS = 90;

function secret(): string {
  const value = process.env.DOCUMENT_LINK_SECRET || process.env.AML_INITIATE_SECRET;
  if (!value) throw new Error("DOCUMENT_LINK_SECRET (or AML_INITIATE_SECRET) is not configured");
  return value;
}

function sign(pathname: string, expires: number): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`doc:${pathname}:${expires}`)
    .digest("hex");
}

/** Uploaded documents are stored under this folder. */
export const DOCUMENT_PREFIX = "documents/";

export function isDocumentPath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(DOCUMENT_PREFIX) && !value.includes("..");
}

export function documentLink(pathname: string, request?: Request): string {
  const expires = Date.now() + LINK_LIFETIME_DAYS * 24 * 60 * 60 * 1000;
  const params = new URLSearchParams({
    path: pathname,
    exp: String(expires),
    sig: sign(pathname, expires),
  });
  return `${appOrigin(request)}/api/documents/view?${params.toString()}`;
}

export function verifyDocumentLink(pathname: string, exp: string, sig: string): boolean {
  const expires = Number(exp);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  if (!isDocumentPath(pathname)) return false;
  const expected = Buffer.from(sign(pathname, expires));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/**
 * Old submissions stored a public URL instead of a path. Return something
 * clickable for either.
 */
export function documentHref(value: unknown, request?: Request): string {
  if (isDocumentPath(value)) return documentLink(value, request);
  if (typeof value === "string" && /^https:\/\//.test(value)) return value;
  return "";
}
