import crypto from "crypto";
import { deleteFiles, putJson, readJson } from "@/lib/private-blob";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const UPLOAD_KEYS = ["photoId", "proofOfAddress"] as const;

export type OnboardingType = "business" | "self-assessment" | "both";

export type OnboardingDraftRecord = {
  code: string;
  createdAt: string;
  updatedAt: string;
  onboardingType: OnboardingType;
  outerStep: number;
  formStep: number;
  state: Record<string, unknown>;
};

export const ONBOARDING_DRAFT_PREFIX = "onboarding-drafts/";

function pathnameFor(code: string): string {
  return `${ONBOARDING_DRAFT_PREFIX}${normalizeCode(code)}.json`;
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

/** Strip File / Blob values so drafts stay JSON-serializable. */
export function serializeOnboardingState(state: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(state)) {
    if (key === "photoId" || key === "proofOfAddress") {
      out[key] = typeof value === "string" ? value : null;
      continue;
    }
    if (typeof File !== "undefined" && value instanceof File) {
      out[key] = null;
      continue;
    }
    if (typeof Blob !== "undefined" && value instanceof Blob) {
      out[key] = null;
      continue;
    }
    out[key] = value;
  }
  return out;
}

/**
 * When the client has a pending File selected, sanitizeDraftState omits photo
 * keys entirely. Keep any previously saved URL in that case; explicit null clears.
 */
export function mergeOnboardingState(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  const serialized = serializeOnboardingState(incoming);
  for (const key of UPLOAD_KEYS) {
    if (!(key in incoming) && typeof existing[key] === "string") {
      serialized[key] = existing[key];
    }
  }
  return serialized;
}

export async function saveDraft(record: OnboardingDraftRecord): Promise<void> {
  const code = normalizeCode(record.code);
  await putJson(pathnameFor(code), { ...record, code });
}

export async function createDraft(initial: {
  onboardingType: OnboardingType;
  outerStep?: number;
  formStep?: number;
  state?: Record<string, unknown>;
}): Promise<OnboardingDraftRecord> {
  const code = generateResumeCode();
  const now = new Date().toISOString();
  const record: OnboardingDraftRecord = {
    code,
    createdAt: now,
    updatedAt: now,
    onboardingType: initial.onboardingType,
    outerStep: initial.outerStep ?? 2,
    formStep: initial.formStep ?? 1,
    state: serializeOnboardingState(initial.state ?? {}),
  };
  await saveDraft(record);
  return record;
}

export async function getDraft(code: string): Promise<OnboardingDraftRecord | null> {
  const normalized = normalizeCode(code);
  if (normalized.length !== CODE_LENGTH) return null;
  return readJson<OnboardingDraftRecord>(pathnameFor(normalized));
}

/** Called once a draft has been submitted, so personal data is not kept twice. */
export async function deleteDraft(code: string): Promise<void> {
  const normalized = normalizeCode(code);
  if (normalized.length !== CODE_LENGTH) return;
  await deleteFiles([pathnameFor(normalized)]);
}

export async function updateDraft(input: {
  code: string;
  onboardingType: OnboardingType;
  outerStep: number;
  formStep: number;
  state: Record<string, unknown>;
}): Promise<OnboardingDraftRecord | null> {
  const existing = await getDraft(input.code);
  if (!existing) return null;

  const record: OnboardingDraftRecord = {
    ...existing,
    updatedAt: new Date().toISOString(),
    onboardingType: input.onboardingType,
    outerStep: input.outerStep,
    formStep: input.formStep,
    state: mergeOnboardingState(existing.state, input.state),
  };
  await saveDraft(record);
  return record;
}
