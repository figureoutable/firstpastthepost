import { del, get, head, list, put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";

/**
 * Storage for client data: ID documents, saved drafts and submissions.
 *
 * Uses the private Blob store ("figures-onboarding-private") once it is
 * connected to the project with the prefix PRIVATE_BLOB, which creates either
 * PRIVATE_BLOB_READ_WRITE_TOKEN or PRIVATE_BLOB_STORE_ID.
 *
 * Until then it falls back to the old public store so nothing breaks, and logs
 * a warning. Files in a private store can only be read by this app.
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

let warned = false;
function warnLegacy() {
  if (warned) return;
  warned = true;
  console.warn(
    "[storage] Private Blob store is not connected (PRIVATE_BLOB_*). Falling back to the public store."
  );
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
  warnLegacy();
  const result = await put(pathname, body, { ...common, token: legacyToken(), access: "public" });
  return { pathname: result.pathname };
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
    const result = await get(pathname, { ...creds, access: "private", useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return { stream: result.stream, contentType: result.blob.contentType };
  }
  warnLegacy();
  try {
    const meta = await head(pathname, { token: legacyToken() });
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
  if (creds) {
    await del(pathnames, creds);
    return;
  }
  warnLegacy();
  await del(pathnames, { token: legacyToken() });
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
  const creds = privateCredentials();
  const auth = creds ?? { token: legacyToken() };
  const out: Array<{ pathname: string; uploadedAt: Date }> = [];
  let cursor: string | undefined;
  do {
    const page = await list({ ...auth, prefix, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      out.push({ pathname: blob.pathname, uploadedAt: new Date(blob.uploadedAt) });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}
