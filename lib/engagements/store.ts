import crypto from "crypto";
import { listFiles, putJson, readJson } from "@/lib/private-blob";
import type { Engagement, EngagementEvent, Flag, FlagKind } from "./types";

/**
 * Client engagements (one per New client link), stored as JSON in the private store.
 *   engagements/<id>.json           the record
 *   engagement-links/<token>.json   maps the secret link token to the record
 *   gocardless-index/<id>.json      maps a GoCardless billing request or mandate to the record
 */
const PREFIX = "engagements/";
const LINK_PREFIX = "engagement-links/";
const GC_PREFIX = "gocardless-index/";

const ID_PATTERN = /^[0-9a-f-]{36}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,64}$/;
const GC_ID_PATTERN = /^[A-Z]{2,4}[0-9A-Z]{6,40}$/;

export function newToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function saveEngagement(record: Engagement): Promise<void> {
  record.updatedAt = new Date().toISOString();
  await putJson(`${PREFIX}${record.id}.json`, record);
}

export async function createEngagement(record: Engagement): Promise<void> {
  await saveEngagement(record);
  await putJson(`${LINK_PREFIX}${record.token}.json`, { id: record.id });
}

export async function getEngagement(id: string): Promise<Engagement | null> {
  if (!ID_PATTERN.test(id)) return null;
  const record = await readJson<Engagement>(`${PREFIX}${id}.json`);
  if (record) record.flags ||= [];
  return record;
}

/**
 * Changes a record safely: reads the latest saved copy, applies the change and
 * saves it straight away. Two updates at the same moment (a GoCardless message
 * and the client's own browser, say) then can't wipe each other out.
 * Return false from `change` to leave the record as it is.
 */
export async function updateEngagement(
  id: string,
  change: (record: Engagement) => boolean | void | Promise<boolean | void>
): Promise<{ record: Engagement; changed: boolean }> {
  const record = await getEngagement(id);
  if (!record) throw new Error("Client record not found");
  const result = await change(record);
  if (result === false) return { record, changed: false };
  await saveEngagement(record);
  return { record, changed: true };
}

export async function getEngagementByToken(token: string): Promise<Engagement | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const link = await readJson<{ id: string }>(`${LINK_PREFIX}${token}.json`);
  if (!link) return null;
  const record = await getEngagement(link.id);
  // Guard against a stale index entry.
  if (!record || record.token !== token) return null;
  return record;
}

export async function listEngagements(): Promise<Engagement[]> {
  const files = await listFiles(PREFIX);
  const records = await Promise.all(
    files.filter((f) => f.pathname.endsWith(".json")).map((f) => readJson<Engagement>(f.pathname))
  );
  return records
    .filter((r): r is Engagement => Boolean(r))
    .map((r) => ({ ...r, flags: r.flags || [] }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function indexGoCardless(gcId: string, engagementId: string): Promise<void> {
  if (!GC_ID_PATTERN.test(gcId)) return;
  await putJson(`${GC_PREFIX}${gcId}.json`, { id: engagementId });
}

export async function getEngagementByGoCardlessId(gcId: string): Promise<Engagement | null> {
  if (!GC_ID_PATTERN.test(gcId)) return null;
  const link = await readJson<{ id: string }>(`${GC_PREFIX}${gcId}.json`);
  return link ? getEngagement(link.id) : null;
}

export function logEvent(record: Engagement, by: string, action: string): void {
  const event: EngagementEvent = { at: new Date().toISOString(), by, action };
  record.events = [...(record.events || []), event];
}

/** Adds a flag for the team, unless the same unresolved flag is already there. */
export function addFlag(record: Engagement, kind: FlagKind, message: string): boolean {
  record.flags ||= [];
  if (record.flags.some((f) => !f.resolvedAt && f.kind === kind && f.message === message)) return false;
  const flag: Flag = { id: crypto.randomUUID(), kind, message, at: new Date().toISOString() };
  record.flags.push(flag);
  return true;
}

export function openFlags(record: Engagement): Flag[] {
  return (record.flags || []).filter((f) => !f.resolvedAt);
}
