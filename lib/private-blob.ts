import { del, get, head, list, put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import { isProduction } from "@/lib/env";

/**
 * Storage for client data: ID documents, saved drafts and submissions.
 *
 * Uses the private Blob store ("figures-onboarding-private") once it is
 * connected to the project with the prefix PRIVATE_BLOB, which creates either
 * PRIVATE_BLOB_READ_WRITE_TOKEN or PRIVATE_BLOB_STORE_ID.
 *
 * Reads also look in the old public store, so submissions and drafts saved
 * before the switch keep working. New files are only ever written to the
 * private store.
 *
 * If the private store is not connected: previews and local builds fall back
 * to the old store; the live site refuses to save and emails an alert, so ID
 * documents are never silently stored publicly.
 */

type PutBody = Parameters<typeof put>[1];

/**
 * Local development only: set LOCAL_BLOB_DIR to keep files on disk instead of
 * Vercel Blob. Never set this on Vercel.
 */
function localDir(): string | null {
  if (privateCredentials() || process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL) return null;
  return process.env.LOCAL_BLOB_DIR || null;
}

function localPath(dir: string, pathname: string): string {
  const full = path.resolve(dir, pathname);
  if (!full.startsWith(path.resolve(dir))) throw new Error("Invalid path");
  return full;
}

function privateCredentials(): { token: string } | { storeId: string } | null {
  const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN?.trim();
  if (token) return { token };
  const storeId = process.env.PRIVATE_BLOB_STORE_ID?.trim();
  if (storeId) return { storeId };
  return null;
}

function legacyToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) throw new Error("No file storage is configured");
  return token;
}

function legacyTokenOrNull(): string | null {
  return process.env.BLOB_READ_WRITE_TOKEN?.trim() || null;
}

/**
 * Client-link data that only lives in the private store on the live site. Preview builds write
 * to the old store, so the live site never reads these folders from there: test clients made on
 * a preview can't appear on the live board or get reminder emails.
 */
const LIVE_PRIVATE_ONLY = [
  "engagements/",
  "engagement-links/",
  "engagement-files/",
  "engagement-once/",
  "gocardless-index/",
  "settings/",
  "auth/",
];

function legacyAllowed(pathname: string): boolean {
  return !(isProduction() && LIVE_PRIVATE_ONLY.some((folder) => pathname.startsWith(folder)));
}

let warned = false;
function warnLegacy() {
  if (warned) return;
  warned = true;
  console.warn(
    "[storage] Private Blob store is not connected (PRIVATE_BLOB_*). Falling back to the public store."
  );
}

let lastAlert = 0;
async function refuseOnLiveSite(): Promise<never> {
  const message =
    "The private file store is not connected on the live site, so client details and documents cannot be saved.";
  console.error(`[storage] ${message}`);
  // At most one alert an hour from each server instance.
  if (Date.now() - lastAlert > 60 * 60 * 1000) {
    lastAlert = Date.now();
    try {
      const { sendInternalEmail } = await import("@/lib/notifications");
      await sendInternalEmail(
        "Action needed: onboarding site cannot save client details",
        `<p>${message}</p><p>Clients cannot start or submit forms until it is fixed.</p>
         <p>In Vercel: Storage, then figures-onboarding-private, then Connect Project. Choose figures-onboarding, tick Production, and use the prefix <strong>PRIVATE_BLOB</strong>. Then redeploy.</p>`
      );
    } catch {
      /* already logged */
    }
  }
  throw new Error("File storage is not available");
}

export function isPrivateStorageConfigured(): boolean {
  return privateCredentials() !== null;
}

export async function putFile(
  pathname: string,
  body: PutBody,
  options: { contentType?: string; overwrite?: boolean; randomSuffix?: boolean } = {}
): Promise<{ pathname: string }> {
  const local = localDir();
  if (local) {
    const full = localPath(local, pathname);
    await fs.mkdir(path.dirname(full), { recursive: true });
    const data = typeof body === "string" ? body : Buffer.from(await new Response(body as BodyInit).arrayBuffer());
    await fs.writeFile(full, data);
    await fs.writeFile(`${full}.type`, options.contentType || "application/octet-stream");
    return { pathname };
  }
  const creds = privateCredentials();
  const common = {
    contentType: options.contentType,
    allowOverwrite: options.overwrite ?? false,
    addRandomSuffix: options.randomSuffix ?? false,
  };
  if (creds) {
    const result = await put(pathname, body, { ...common, ...creds, access: "private" });
    return { pathname: result.pathname };
  }
  if (isProduction()) await refuseOnLiveSite();
  warnLegacy();
  const result = await put(pathname, body, { ...common, token: legacyToken(), access: "public" });
  return { pathname: result.pathname };
}

/**
 * Writes a small marker only if it isn't there yet, so something happens once even when two
 * requests arrive at the same moment. Returns false if another request already wrote it.
 */
export async function writeOnce(pathname: string): Promise<boolean> {
  const local = localDir();
  if (local) {
    const full = localPath(local, pathname);
    await fs.mkdir(path.dirname(full), { recursive: true });
    try {
      await fs.writeFile(full, new Date().toISOString(), { flag: "wx" });
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
      throw error;
    }
  }
  try {
    await putFile(pathname, new Date().toISOString(), { contentType: "text/plain", overwrite: false });
    return true;
  } catch (error) {
    // The store refuses to overwrite, so a failed write with the marker present means another request won.
    if (await readFile(pathname)) return false;
    throw error;
  }
}

export async function putJson(pathname: string, value: unknown): Promise<void> {
  await putFile(pathname, JSON.stringify(value, null, 2), {
    contentType: "application/json",
    overwrite: true,
  });
}

/** Returns the file's contents, or null if it does not exist. */
export async function readFile(
  pathname: string
): Promise<{ stream: ReadableStream; contentType: string } | null> {
  const local = localDir();
  if (local) {
    try {
      const full = localPath(local, pathname);
      const data = await fs.readFile(full);
      const contentType = await fs.readFile(`${full}.type`, "utf8").catch(() => "application/octet-stream");
      return { stream: new Response(data).body as ReadableStream, contentType };
    } catch {
      return null;
    }
  }
  const creds = privateCredentials();
  if (creds) {
    try {
      const result = await get(pathname, { ...creds, access: "private", useCache: false });
      if (result && result.statusCode === 200 && result.stream) {
        return { stream: result.stream, contentType: result.blob.contentType };
      }
    } catch {
      /* not in the private store: try the old one below */
    }
  }
  if (!legacyAllowed(pathname)) return null;
  const token = legacyTokenOrNull();
  if (!token) return null;
  try {
    const meta = await head(pathname, { token });
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok || !res.body) return null;
    return { stream: res.body, contentType: meta.contentType };
  } catch {
    return null;
  }
}

export async function readJson<T>(pathname: string): Promise<T | null> {
  try {
    const file = await readFile(pathname);
    if (!file) return null;
    const text = await new Response(file.stream).text();
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function deleteFiles(pathnames: string[]): Promise<void> {
  if (!pathnames.length) return;
  const local = localDir();
  if (local) {
    for (const p of pathnames) {
      await fs.rm(localPath(local, p), { force: true });
      await fs.rm(`${localPath(local, p)}.type`, { force: true });
    }
    return;
  }
  const creds = privateCredentials();
  if (creds) await del(pathnames, creds);
  const token = legacyTokenOrNull();
  if (token) {
    // Remove any copy left in the old store too.
    await del(pathnames, { token }).catch(() => {});
  }
}

export async function listFiles(
  prefix: string
): Promise<Array<{ pathname: string; uploadedAt: Date }>> {
  const local = localDir();
  if (local) {
    const out: Array<{ pathname: string; uploadedAt: Date }> = [];
    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else if (!entry.name.endsWith(".type")) {
          const rel = path.relative(local, full).split(path.sep).join("/");
          if (rel.startsWith(prefix)) out.push({ pathname: rel, uploadedAt: (await fs.stat(full)).mtime });
        }
      }
    };
    await walk(local);
    return out;
  }
  const stores: Array<{ token: string } | { storeId: string }> = [];
  const creds = privateCredentials();
  if (creds) stores.push(creds);
  const token = legacyTokenOrNull();
  if (token && legacyAllowed(prefix)) stores.push({ token });

  const seen = new Map<string, Date>();
  for (const auth of stores) {
    let cursor: string | undefined;
    do {
      const page = await list({ ...auth, prefix, cursor, limit: 1000 });
      for (const blob of page.blobs) {
        if (!seen.has(blob.pathname)) seen.set(blob.pathname, new Date(blob.uploadedAt));
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  }
  return [...seen].map(([pathname, uploadedAt]) => ({ pathname, uploadedAt }));
}
