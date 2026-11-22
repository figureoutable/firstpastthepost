/** Small helpers for "which environment are we in?" decisions. */

export function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production";
}

export function isPreview(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

/**
 * Venture is a work in progress. It is hidden on the live site until
 * NEXT_PUBLIC_VENTURE_ENABLED is set to "true" in Vercel. Preview and local
 * builds always show it so it can be tested. Server-side only.
 */
export function isVentureEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_VENTURE_ENABLED === "true") return true;
  return process.env.VERCEL_ENV !== "production";
}

/**
 * Base URL for links we put in emails. On the live site this is the custom
 * domain; on previews it is the preview deployment itself, so test links never
 * point at the live site.
 */
export function appOrigin(request?: Request): string {
  if (isProduction() && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (request) {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Same as appOrigin, for server pages that only have the request headers. */
export function originFromHeaders(h: Headers): string {
  if (isProduction() && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
