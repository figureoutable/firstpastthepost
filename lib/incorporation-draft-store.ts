import { head, put } from "@vercel/blob";
import crypto from "crypto";
import type { IncorporationState } from "@/components/incorporation/state";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export type IncorporationDraftRecord = {
  code: string;
  createdAt: string;
  updatedAt: string;
  step: number;
  phase: "banner" | "form";
  state: IncorporationState;
};

function pathnameFor(code: string): string {
  return `incorporation-drafts/${normalizeCode(code)}.json`;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function generateResumeCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

function parseJson(text: string): IncorporationDraftRecord {
  return JSON.parse(text) as IncorporationDraftRecord;
}

export async function saveDraft(record: IncorporationDraftRecord): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is not configured");

  const code = normalizeCode(record.code);
  await put(
    pathnameFor(code),
    JSON.stringify({ ...record, code }, null, 2),
    {
      access: "public",
      allowOverwrite: true,
      token,
    }
  );
}

export async function createDraft(
  initial: Pick<IncorporationDraftRecord, "step" | "phase" | "state">
): Promise<IncorporationDraftRecord> {
  const code = generateResumeCode();
  const now = new Date().toISOString();
  const record: IncorporationDraftRecord = {
    code,
    createdAt: now,
    updatedAt: now,
    step: initial.step,
    phase: initial.phase,
    state: initial.state,
  };
  await saveDraft(record);
  return record;
}

export async function getDraft(code: string): Promise<IncorporationDraftRecord | null> {
  const normalized = normalizeCode(code);
  if (normalized.length !== CODE_LENGTH) return null;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  try {
    const meta = await head(pathnameFor(normalized), token ? { token } : undefined);
    const res = await fetch(meta.url);
    if (!res.ok) return null;
    return parseJson(await res.text());
  } catch {
    return null;
  }
}

export async function updateDraft(input: {
  code: string;
  step: number;
  phase: "banner" | "form";
  state: IncorporationState;
}): Promise<IncorporationDraftRecord | null> {
  const existing = await getDraft(input.code);
  if (!existing) return null;

  const record: IncorporationDraftRecord = {
    ...existing,
    updatedAt: new Date().toISOString(),
    step: input.step,
    phase: input.phase,
    state: input.state,
  };
  await saveDraft(record);
  return record;
}
