import { createSign } from "crypto";

/**
 * Saves signed engagement letters to the Shared Drive:
 *   Figures > Clients > <client name> > the PDF and a Google Doc copy
 *
 * Set up (once):
 * - GOOGLE_SERVICE_ACCOUNT_JSON: the same service account used for the Google Sheet.
 * - Add that service account's email to the "Figures" Shared Drive as a Content manager.
 * - GOOGLE_DRIVE_CLIENTS_FOLDER_ID: the id of the "Clients" folder (the last part of its web address).
 *
 * Engagement letters are made here too: the filled Word file is uploaded as a Google Doc
 * (so it is saved as a Doc, not a Word file) and Google turns it into the PDF the client reads.
 *
 * Only ever creates folders and files, and updates the letter Docs it made itself.
 * Never moves or deletes anything.
 */

type Credentials = { client_email: string; private_key: string };

function credentials(): Credentials | null {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    try {
      const parsed = JSON.parse(json) as Partial<Credentials>;
      if (parsed.client_email && parsed.private_key) {
        return { client_email: parsed.client_email, private_key: parsed.private_key.replace(/\\n/g, "\n") };
      }
    } catch {
      return null;
    }
  }
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  return email && key ? { client_email: email, private_key: key } : null;
}

function clientsFolderId(): string | null {
  const id = process.env.GOOGLE_DRIVE_CLIENTS_FOLDER_ID?.trim();
  return id && /^[A-Za-z0-9_-]{10,}$/.test(id) ? id : null;
}

export function isDriveConfigured(): boolean {
  return Boolean(credentials() && clientsFolderId());
}

let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  const creds = credentials();
  if (!creds) throw new Error("Google service account is not set");
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const now = Math.floor(Date.now() / 1000);
  const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const jwt = `${unsigned}.${signer.sign(creds.private_key, "base64url")}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !data.access_token) throw new Error(`Google sign-in failed: ${data.error || res.status}`);
  cached = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return data.access_token;
}

async function drive<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`Google Drive ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

/** Folder names cannot contain slashes in practice, and quotes must be escaped in searches. */
function folderName(name: string): string {
  return name.replace(/[\\/]/g, "-").replace(/\s+/g, " ").trim().slice(0, 120) || "Unnamed client";
}

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function docUrl(id: string): string {
  return `https://docs.google.com/document/d/${id}/edit`;
}

export function folderUrl(id: string): string {
  return `https://drive.google.com/drive/folders/${id}`;
}

export async function findOrCreateClientFolder(name: string): Promise<string> {
  const parent = clientsFolderId();
  if (!parent) throw new Error("GOOGLE_DRIVE_CLIENTS_FOLDER_ID is not set");
  const clean = folderName(name);
  const q = [
    `'${parent}' in parents`,
    `name = '${clean.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
  ].join(" and ");
  const params = new URLSearchParams({
    q,
    fields: "files(id,name)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    corpora: "allDrives",
  });
  const found = await drive<{ files?: { id: string }[] }>(`https://www.googleapis.com/drive/v3/files?${params}`);
  if (found.files?.[0]?.id) return found.files[0].id;

  const created = await drive<{ id: string }>("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: clean, mimeType: "application/vnd.google-apps.folder", parents: [parent] }),
  });
  return created.id;
}

async function upload(meta: Record<string, unknown>, body: Uint8Array | string, contentType: string): Promise<string> {
  const boundary = `figures${Date.now()}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--`);
  const payload = Buffer.concat([head, typeof body === "string" ? Buffer.from(body) : Buffer.from(body), tail]);
  const result = await drive<{ id: string }>(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id",
    { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body: payload }
  );
  return result.id;
}

/**
 * Saves a filled letter as a Google Doc in the client's folder. When the letter is edited before
 * signing, the same Doc is updated, so there is only ever one Doc per letter.
 */
export async function saveLetterDoc(input: {
  folderId: string;
  name: string;
  docx: Uint8Array;
  existingDocId?: string;
}): Promise<string> {
  if (input.existingDocId) {
    try {
      const token = await accessToken();
      const res = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(input.existingDocId)}?uploadType=media&supportsAllDrives=true&fields=id`,
        { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": DOCX }, body: Buffer.from(input.docx) }
      );
      if (res.ok) {
        await drive(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(input.existingDocId)}?supportsAllDrives=true&fields=id`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: input.name }),
        });
        return input.existingDocId;
      }
      console.warn("[drive] Could not update the letter Doc, making a new one", res.status, (await res.text()).slice(0, 200));
    } catch (error) {
      console.warn("[drive] Could not update the letter Doc, making a new one", error);
    }
  }
  return upload({ name: input.name, parents: [input.folderId], mimeType: "application/vnd.google-apps.document" }, input.docx, DOCX);
}

/** The Google Doc as a PDF, exactly as Google lays it out. */
export async function exportPdf(docId: string): Promise<Uint8Array> {
  const token = await accessToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(docId)}/export?mimeType=application/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Google Drive export ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function savePdf(folderId: string, name: string, pdf: Uint8Array): Promise<string> {
  return upload({ name, parents: [folderId] }, pdf, "application/pdf");
}

/** Saves the signed PDF and a Google Doc copy into the client's folder. */
export async function saveSignedLetter(input: {
  clientFolderName: string;
  fileName: string;
  pdf: Uint8Array;
  html: string;
}): Promise<{ folderId: string; pdfFileId: string; docFileId: string }> {
  const folderId = await findOrCreateClientFolder(input.clientFolderName);
  const pdfFileId = await upload({ name: `${input.fileName}.pdf`, parents: [folderId] }, input.pdf, "application/pdf");
  const docFileId = await upload(
    { name: input.fileName, parents: [folderId], mimeType: "application/vnd.google-apps.document" },
    `<!doctype html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;">${input.html}</body></html>`,
    "text/html"
  );
  return { folderId, pdfFileId, docFileId };
}
