/** Shared helpers for building internal/client notification emails. */

export function escapeHtml(input: unknown): string {
  const str = input === null || input === undefined ? "" : String(input);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape then preserve manually-typed line breaks (e.g. business descriptions). */
export function escapeHtmlMultiline(input: unknown): string {
  return escapeHtml(input).replace(/\n/g, "<br/>");
}
